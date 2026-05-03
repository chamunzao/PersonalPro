import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  setDoc,
  deleteDoc
} from '../../firebase';
import { MONTHS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import {
  calculateBillingStatus,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';

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

function PaymentsTab({ students, records, payments, setPayments, loadingData, theme }) {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [savingKey, setSavingKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [paymentForms, setPaymentForms] = useState({});

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

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
      .sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')))
      .slice(0, 3);
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#1f2937' }}>Controle de Pagamentos</h2>

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
                          fontWeight: '600'
                        }}>
                          {item.month}: {formatCurrency(item.amountPaid ?? 0)}
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
