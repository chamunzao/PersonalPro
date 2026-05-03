import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  setDoc,
  deleteDoc,
  collection,
  addDoc
} from '../../firebase';
import { MONTHS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import { formatDate, formatDateISO, getDaysInMonth } from '../../lib/dates';
import {
  calculateAdvanceCreditStatus,
  calculateBillingStatus,
  getAdvanceCreditStatusColors,
  getAdvanceCreditStatusLabel,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';
import { getClassesForDate } from '../schedule/scheduleCalculations';

function parseMoney(value) {
  const parsed = parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPaymentStudentId(payment) {
  return payment.studentId || payment.key?.split('_').slice(1).join('_');
}

function getPaymentDefaults(payment, billingStatus) {
  const planValue = billingStatus.planValue || 0;
  return {
    amountPaid: payment?.amountPaid ?? planValue,
    discount: payment?.discount ?? 0,
    surcharge: payment?.surcharge ?? 0,
    note: payment?.note || ''
  };
}

function getLastDayOfMonthISO(year, monthIndex) {
  const lastDay = getDaysInMonth(year, monthIndex);
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function countMonthlyClassesForStudent({ studentId, students, scheduleOverrides, selectedYear, selectedMonth }) {
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  let total = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateISO = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    total += getClassesForDate(dateISO, students, scheduleOverrides)
      .filter(cls => cls.studentId === studentId).length;
  }

  return total;
}

function PaymentsTab({ students, records, payments, setPayments, scheduleOverrides = [], loadingData, theme }) {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [savingKey, setSavingKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [paymentForms, setPaymentForms] = useState({});
  const [packageForm, setPackageForm] = useState({
    packageType: 'month',
    studentId: '',
    classesPurchased: '',
    amountPaid: '',
    dateISO: formatDateISO(new Date()),
    validUntil: '',
    method: 'Pix',
    note: ''
  });

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (packageForm.packageType !== 'month' || !packageForm.studentId) return;
    const student = students.find(item => item.id === packageForm.studentId);
    if (!student) return;

    const monthlyClasses = countMonthlyClassesForStudent({
      studentId: student.id,
      students,
      scheduleOverrides,
      selectedYear,
      selectedMonth
    });
    const suggestedAmount = Number(student.packagePrice) > 0
      ? Number(student.packagePrice)
      : monthlyClasses * (Number(student.pricePerClass) || 0);

    setPackageForm(prev => ({
      ...prev,
      classesPurchased: monthlyClasses ? String(monthlyClasses) : '',
      amountPaid: suggestedAmount ? String(suggestedAmount) : '',
      validUntil: getLastDayOfMonthISO(selectedYear, selectedMonth),
      note: prev.note || `Pacote de aulas de ${MONTHS[selectedMonth]} de ${selectedYear}`
    }));
  }, [packageForm.packageType, packageForm.studentId, students, scheduleOverrides, selectedYear, selectedMonth]);

  function updateForm(paymentKey, patch) {
    setPaymentForms(prev => ({
      ...prev,
      [paymentKey]: {
        ...(prev[paymentKey] || {}),
        ...patch
      }
    }));
  }

  function openPaymentForm(student, billingStatus, payment) {
    const paymentKey = `${monthKey}_${student.id}`;
    setEditingKey(paymentKey);
    setPaymentForms(prev => ({
      ...prev,
      [paymentKey]: getPaymentDefaults(payment, billingStatus)
    }));
  }

  function closePaymentForm() {
    setEditingKey(null);
  }

  function updatePackageForm(patch) {
    setPackageForm(prev => ({
      ...prev,
      ...patch
    }));
  }

  async function saveAdvancePackage() {
    if (!user) return;
    const student = students.find(item => item.id === packageForm.studentId);
    const classesPurchased = parseInt(packageForm.classesPurchased, 10);
    const amountPaid = parseMoney(packageForm.amountPaid);
    if (!student || !classesPurchased || classesPurchased <= 0) {
      alert('Selecione o aluno e informe a quantidade de aulas');
      return;
    }

    setSavingKey('advance-package');
    try {
      const [year, month, day] = packageForm.dateISO.split('-').map(Number);
      const paidAt = new Date(year, month - 1, day);
      const paymentData = {
        paid: true,
        type: 'package',
        packageType: packageForm.packageType,
        date: formatDate(paidAt),
        dateISO: packageForm.dateISO,
        month: packageForm.packageType === 'month' ? monthKey : packageForm.dateISO.slice(0, 7),
        studentId: student.id,
        amountPaid,
        classesPurchased,
        validUntil: packageForm.validUntil || '',
        method: packageForm.method || '',
        note: packageForm.note || ''
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/payments`), paymentData);
      setPayments(prev => [{ key: docRef.id, ...paymentData }, ...prev]);
      setPackageForm({
        packageType: 'month',
        studentId: '',
        classesPurchased: '',
        amountPaid: '',
        dateISO: formatDateISO(new Date()),
        validUntil: '',
        method: 'Pix',
        note: ''
      });
    } catch (error) {
      console.error('Error saving package payment:', error);
      alert('Erro ao registrar pacote');
    } finally {
      setSavingKey(null);
    }
  }

  async function savePayment(student, billingStatus) {
    if (!user) return;
    const paymentKey = `${monthKey}_${student.id}`;
    const form = paymentForms[paymentKey] || getPaymentDefaults(null, billingStatus);
    const amountPaid = parseMoney(form.amountPaid);
    const discount = parseMoney(form.discount);
    const surcharge = parseMoney(form.surcharge);

    setSavingKey(paymentKey);
    try {
      const paymentDoc = doc(db, `users/${user.uid}/payments/${paymentKey}`);
      const paymentData = {
        paid: true,
        date: formatDate(new Date()),
        month: monthKey,
        studentId: student.id,
        amountPaid,
        discount,
        surcharge,
        note: form.note || ''
      };
      await setDoc(paymentDoc, paymentData, { merge: true });

      setPayments(prev => {
        const existing = prev.findIndex(p => p.key === paymentKey);
        const nextPayment = { key: paymentKey, ...paymentData };
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...nextPayment };
          return next;
        }
        return [...prev, nextPayment];
      });
      setEditingKey(null);
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Erro ao salvar pagamento');
    } finally {
      setSavingKey(null);
    }
  }

  async function deletePayment(studentId) {
    if (!user) return;
    const paymentKey = `${monthKey}_${studentId}`;
    await deletePaymentByKey(paymentKey);
  }

  async function deletePaymentByKey(paymentKey) {
    if (!user) return;
    setSavingKey(paymentKey);
    try {
      const paymentDoc = doc(db, `users/${user.uid}/payments/${paymentKey}`);
      await deleteDoc(paymentDoc);
      setPayments(prev => prev.filter(p => p.key !== paymentKey));
      if (editingKey === paymentKey) {
        setEditingKey(null);
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Erro ao remover pagamento');
    } finally {
      setSavingKey(null);
    }
  }

  function getStudentHistory(studentId) {
    return payments
      .filter(payment => getPaymentStudentId(payment) === studentId && payment.paid)
      .sort((a, b) => String(b.dateISO || b.month || '').localeCompare(String(a.dateISO || a.month || '')))
      .slice(0, 3);
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#1f2937' }}>Controle de Pagamentos</h2>

      <div style={{
        background: 'white',
        border: `1px solid ${theme.light}`,
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1f2937', margin: '0 0 10px 0' }}>Registrar pacote adiantado</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {[
            { id: 'month', label: 'Pacote do mes' },
            { id: 'custom', label: 'Pacote personalizado' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => updatePackageForm({ packageType: item.id, note: item.id === 'custom' ? '' : packageForm.note })}
              style={{
                padding: '9px',
                background: packageForm.packageType === item.id ? theme.light : '#f9fafb',
                color: packageForm.packageType === item.id ? theme.dark : '#6b7280',
                border: packageForm.packageType === item.id ? `1px solid ${theme.medium}` : '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Aluno</label>
            <select
              value={packageForm.studentId}
              onChange={(e) => updatePackageForm({ studentId: e.target.value, note: packageForm.packageType === 'month' ? '' : packageForm.note })}
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}
            >
              <option value="">Selecionar</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Aulas</label>
            <input
              type="number"
              value={packageForm.classesPurchased}
              onChange={(e) => updatePackageForm({ classesPurchased: e.target.value })}
              min="1"
              placeholder="8"
              readOnly={packageForm.packageType === 'month'}
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', background: packageForm.packageType === 'month' ? '#f9fafb' : 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Valor pago</label>
            <input
              type="number"
              value={packageForm.amountPaid}
              onChange={(e) => updatePackageForm({ amountPaid: e.target.value })}
              min="0"
              step="0.01"
              placeholder="640"
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Pagamento</label>
            <input
              type="date"
              value={packageForm.dateISO}
              onChange={(e) => updatePackageForm({ dateISO: e.target.value })}
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Validade</label>
            <input
              type="date"
              value={packageForm.validUntil}
              onChange={(e) => updatePackageForm({ validUntil: e.target.value })}
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Forma</label>
            <select
              value={packageForm.method}
              onChange={(e) => updatePackageForm({ method: e.target.value })}
              style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}
            >
              <option>Pix</option>
              <option>Dinheiro</option>
              <option>Cartao</option>
              <option>Transferencia</option>
              <option>Outro</option>
            </select>
          </div>
        </div>
        {packageForm.packageType === 'month' && (
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px 0' }}>
            Usa {MONTHS[selectedMonth]} de {selectedYear}: conta as aulas previstas do aluno no mes e sugere o valor pelo plano cadastrado ou pelo preco por aula.
          </p>
        )}
        <textarea
          value={packageForm.note}
          onChange={(e) => updatePackageForm({ note: e.target.value })}
          placeholder="Observacao do pacote, combinados, comprovante, parcelamento..."
          style={{
            width: '100%',
            minHeight: '54px',
            padding: '9px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'vertical',
            marginBottom: '10px'
          }}
        />
        <button
          onClick={saveAdvancePackage}
          disabled={savingKey === 'advance-package'}
          style={{
            width: '100%',
            padding: '10px',
            background: savingKey === 'advance-package' ? '#d1d5db' : theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: savingKey === 'advance-package' ? 'not-allowed' : 'pointer'
          }}
        >
          {savingKey === 'advance-package' ? 'Registrando...' : packageForm.packageType === 'month' ? 'Registrar pacote do mes' : 'Registrar pacote e criar creditos'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563', display: 'block', marginBottom: '6px' }}>Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563', display: 'block', marginBottom: '6px' }}>Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loadingData && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>Carregando...</p>}

      {students.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#9ca3af'
        }}>
          <p style={{ fontSize: '14px', margin: '0' }}>Nenhum aluno cadastrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {students.map(student => {
            const paymentKey = `${monthKey}_${student.id}`;
            const payment = payments.find(p => p.key === paymentKey);
            const isPaid = !!payment?.paid;
            const isEditing = editingKey === paymentKey;
            const isSaving = savingKey === paymentKey;
            const billingStatus = calculateBillingStatus(student, records, new Date(selectedYear, selectedMonth, 1));
            const billingColors = getBillingStatusColors(billingStatus);
            const creditStatus = calculateAdvanceCreditStatus(student, records, payments);
            const creditColors = getAdvanceCreditStatusColors(creditStatus);
            const form = paymentForms[paymentKey] || getPaymentDefaults(payment, billingStatus);
            const history = getStudentHistory(student.id);

            return (
              <div key={student.id} style={{
                background: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: '#1f2937' }}>{student.name}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>
                      {isPaid ? `Pago em ${payment.date}` : 'Pendente'}
                      {isPaid && payment.amountPaid !== undefined ? ` - ${formatCurrency(payment.amountPaid)}` : ''}
                    </p>
                    {payment?.note && (
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', fontStyle: 'italic' }}>{payment.note}</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{
                        padding: '3px 7px',
                        background: creditColors.background,
                        color: creditColors.color,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {getAdvanceCreditStatusLabel(creditStatus)}
                        {creditStatus.remainingClasses !== null ? ` - ${creditStatus.remainingClasses}/${creditStatus.totalPurchased}` : ''}
                      </span>
                      <span style={{
                        padding: '3px 7px',
                        background: '#f3f4f6',
                        color: '#4b5563',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {billingStatus.billingTypeLabel}
                      </span>
                      {billingStatus.planValue > 0 && (
                        <span style={{
                          padding: '3px 7px',
                          background: '#ecfdf5',
                          color: '#047857',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          Previsto {formatCurrency(billingStatus.planValue)}
                        </span>
                      )}
                      {payment?.discount > 0 && (
                        <span style={{
                          padding: '3px 7px',
                          background: '#fff7ed',
                          color: '#c2410c',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          Desconto {formatCurrency(payment.discount)}
                        </span>
                      )}
                      {payment?.surcharge > 0 && (
                        <span style={{
                          padding: '3px 7px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          Acrescimo {formatCurrency(payment.surcharge)}
                        </span>
                      )}
                      {billingStatus.remainingClasses !== null && (
                        <span style={{
                          padding: '3px 7px',
                          background: '#eef2ff',
                          color: '#4338ca',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {billingStatus.remainingClasses} aulas restantes
                        </span>
                      )}
                      <span style={{
                        padding: '3px 7px',
                        background: billingColors.background,
                        color: billingColors.color,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {getBillingStatusLabel(billingStatus)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '108px' }}>
                    <button
                      onClick={() => openPaymentForm(student, billingStatus, payment)}
                      disabled={isSaving}
                      style={{
                        padding: '8px 12px',
                        background: isPaid ? '#d1fae5' : theme.primary,
                        color: isPaid ? '#059669' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      {isPaid ? 'Editar' : 'Registrar'}
                    </button>
                    {isPaid && (
                      <button
                        onClick={() => deletePayment(student.id)}
                        disabled={isSaving}
                        style={{
                          padding: '8px 12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          opacity: isSaving ? 0.6 : 1
                        }}
                      >
        Remover
      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Valor pago</label>
                        <input
                          type="number"
                          value={form.amountPaid}
                          onChange={(e) => updateForm(paymentKey, { amountPaid: e.target.value })}
                          min="0"
                          step="0.01"
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Desconto</label>
                        <input
                          type="number"
                          value={form.discount}
                          onChange={(e) => updateForm(paymentKey, { discount: e.target.value })}
                          min="0"
                          step="0.01"
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Acrescimo</label>
                        <input
                          type="number"
                          value={form.surcharge}
                          onChange={(e) => updateForm(paymentKey, { surcharge: e.target.value })}
                          min="0"
                          step="0.01"
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Observacao</label>
                    <textarea
                      value={form.note}
                      onChange={(e) => updateForm(paymentKey, { note: e.target.value })}
                      placeholder="Ex: pago em dinheiro, PIX parcial, desconto combinado..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        minHeight: '58px',
                        resize: 'vertical',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => savePayment(student, billingStatus)}
                        disabled={isSaving}
                        style={{
                          flex: 1,
                          padding: '9px',
                          background: isSaving ? '#d1d5db' : theme.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Salvar pagamento
                      </button>
                      <button
                        onClick={closePaymentForm}
                        style={{
                          padding: '9px 14px',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {history.length > 0 && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', margin: '0 0 6px 0' }}>Historico recente</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {history.map(item => (
                        <span key={item.key} style={{
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          color: '#4b5563',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {item.type === 'package' ? `${item.classesPurchased || 0} aulas` : item.month}: {formatCurrency(item.amountPaid ?? 0)}
                          {item.type === 'package' && (
                            <button
                              onClick={() => deletePaymentByKey(item.key)}
                              disabled={savingKey === item.key}
                              title="Remover pacote"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                cursor: savingKey === item.key ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '800',
                                padding: 0,
                                lineHeight: 1
                              }}
                            >
                              x
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { PaymentsTab };
