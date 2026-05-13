import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { db, doc, setDoc, collection, getDocs } from '../../firebase';
import { formatDate, formatDateISO } from '../../lib/dates';
import { formatCurrency } from '../../lib/money';
import { updateAttendanceRecord } from '../attendance/attendanceActions';
import { calculateBillingStatus } from '../billing/billingCalculations';
import { getClassesForDate } from '../schedule/scheduleCalculations';
import {
  buildAlertActionRecord,
  filterActionableAlerts,
  getDefaultSnoozeDate
} from './alertActions';
import { calculateAlerts } from './alertsCalculations';

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    alert('Cadastre o WhatsApp do aluno para usar esta ação.');
    return;
  }
  const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildMessage(alert, student, billingStatus) {
  const firstName = student?.name?.split(' ')[0] || alert.studentName || 'tudo bem';
  const value = billingStatus?.planValue || student?.packagePrice || student?.pricePerClass || 0;

  if (alert.type === 'payment_overdue') {
    return `Olá, ${firstName}! Passando para lembrar que seu pagamento está em atraso. Valor previsto: ${formatCurrency(value)}. Pode me confirmar por aqui quando fizer o envio?`;
  }
  if (alert.type === 'payment_due') {
    return `Olá, ${firstName}! Seu vencimento está chegando. Valor previsto: ${formatCurrency(value)}. Qualquer dúvida me chama por aqui.`;
  }
  if (alert.type.includes('credit') || alert.type.includes('package')) {
    return `Olá, ${firstName}! Seu pacote de aulas está perto do fim. Vamos alinhar a renovação para manter sua rotina em dia?`;
  }
  if (alert.type === 'inactive_student') {
    return `Olá, ${firstName}! Senti sua falta nos treinos. Como você está? Vamos combinar o melhor dia para retomar?`;
  }
  if (alert.type === 'unmarked_class') {
    return `Olá, ${firstName}! Confirmando sua aula de hoje às ${alert.time}. Foi tudo certo?`;
  }
  return `Olá, ${firstName}! Passando para alinharmos seu acompanhamento.`;
}

function getPaymentClasses(student, billingStatus) {
  if (billingStatus.contractedClasses > 0) return billingStatus.contractedClasses;
  return 0;
}

function ActionButton({ children, onClick, disabled, tone = 'neutral', theme }) {
  const tones = {
    primary: { background: theme.primary, color: 'white', border: theme.primary },
    success: { background: 'rgba(242, 207, 124, 0.14)', color: '#F2CF7C', border: 'rgba(242, 207, 124, 0.35)' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    neutral: { background: 'white', color: '#334155', border: '#dbe3ec' }
  };
  const style = tones[tone] || tones.neutral;

  return (
    <button
      className={`alert-action-button alert-action-${tone}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 10px',
        background: disabled ? '#f1f5f9' : style.background,
        color: disabled ? '#94a3b8' : style.color,
        border: `1px solid ${disabled ? '#e2e8f0' : style.border}`,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '850',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </button>
  );
}

function AlertsTab({ students, records, setRecords, payments, setPayments, scheduleOverrides, loadingData, theme }) {
  const { user } = useAuth();
  const [savingKey, setSavingKey] = useState(null);
  const [alertActions, setAlertActions] = useState([]);
  const calculatedAlerts = calculateAlerts({
    students,
    records,
    payments,
    getClassesForDate: (dateISO) => getClassesForDate(dateISO, students, scheduleOverrides)
  });
  const alerts = filterActionableAlerts(calculatedAlerts, alertActions);
  const counts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, { danger: 0, warning: 0, info: 0 });

  const severityStyles = {
    danger: { background: '#fee2e2', color: '#dc2626', border: '#fecaca', label: 'Crítico' },
    warning: { background: '#fef3c7', color: '#d97706', border: '#fde68a', label: 'Atenção' },
    info: { background: 'rgba(242, 207, 124, 0.14)', color: '#F2CF7C', border: 'rgba(242, 207, 124, 0.35)', label: 'Hoje' }
  };

  useEffect(() => {
    async function loadAlertActions() {
      if (!user) return;
      try {
        const snap = await getDocs(collection(db, `users/${user.uid}/alertActions`));
        setAlertActions(snap.docs.map(item => ({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error('Error loading alert actions:', error);
      }
    }

    loadAlertActions();
  }, [user]);

  async function saveAlertAction(alert, status, patch = {}) {
    if (!user || !alert?.id) return;
    const actionId = encodeURIComponent(alert.id);
    const action = buildAlertActionRecord({
      alertId: alert.id,
      status,
      ...patch
    });

    setSavingKey(`${alert.id}-${status}`);
    try {
      await setDoc(doc(db, `users/${user.uid}/alertActions/${actionId}`), action, { merge: true });
      setAlertActions(prev => {
        const nextAction = { id: actionId, ...action };
        const existing = prev.findIndex(item => item.alertId === alert.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...nextAction };
          return next;
        }
        return [...prev, nextAction];
      });
    } catch (error) {
      console.error('Error saving alert action:', error);
      alert('Erro ao atualizar pendencia');
    } finally {
      setSavingKey(null);
    }
  }

  async function savePaymentFromAlert(alert, student, billingStatus) {
    if (!user || !student) return;
    const monthKey = getMonthKey();
    const paymentKey = `${monthKey}_${student.id}`;
    const amountPaid = Number(billingStatus.planValue || student.packagePrice || 0);
    const paymentData = {
      paid: true,
      date: formatDate(new Date()),
      dateISO: formatDateISO(new Date()),
      month: monthKey,
      studentId: student.id,
      amountPaid,
      classesPaid: getPaymentClasses(student, billingStatus),
      classUnitPrice: Number(student.pricePerClass) || 0,
      discount: 0,
      surcharge: 0,
      note: `Registrado pela Central de Ações: ${alert.title}`
    };

    setSavingKey(`${alert.id}-payment`);
    try {
      await setDoc(doc(db, `users/${user.uid}/payments/${paymentKey}`), paymentData, { merge: true });
      setPayments(prev => {
        const existing = prev.findIndex(payment => payment.key === paymentKey);
        const nextPayment = { key: paymentKey, ...paymentData };
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...nextPayment };
          return next;
        }
        return [...prev, nextPayment];
      });
    } catch (error) {
      console.error('Error saving payment from alert:', error);
      alert('Erro ao registrar pagamento');
    } finally {
      setSavingKey(null);
    }
  }

  async function markAttendance(alert, status) {
    if (!user || !alert.classKey) return;
    setSavingKey(`${alert.id}-${status}`);
    try {
      await updateAttendanceRecord({ user, classKey: alert.classKey, status, setRecords });
    } catch (error) {
      console.error('Error marking attendance from alert:', error);
      alert('Erro ao marcar aula');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="alerts-page">
      <div className="app-card alerts-hero-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <p style={{ margin: '0 0 5px', color: theme.primary, fontSize: '12px', fontWeight: '900' }}>CENTRAL DE AÇÕES</p>
        <h2 className="app-page-title">Ações</h2>
        <p className="app-page-kicker">Resolva cobranças, pacotes e registros do dia sem sair da tela.</p>
      </div>

      {loadingData && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>Carregando...</p>}

      <div className="alerts-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { key: 'danger', label: 'Críticos' },
          { key: 'warning', label: 'Atenção' },
          { key: 'info', label: 'Hoje' }
        ].map(item => {
          const style = severityStyles[item.key];
          return (
            <div key={item.key} className={`alerts-metric-card alerts-metric-${item.key}`} style={{
              background: style.background,
              border: `1px solid ${style.border}`,
              borderRadius: '8px',
              padding: '12px'
            }}>
              <p style={{ fontSize: '11px', color: style.color, margin: '0 0 6px 0', fontWeight: '700' }}>{item.label}</p>
              <p style={{ fontSize: '24px', color: style.color, margin: '0', fontWeight: '800' }}>{counts[item.key] || 0}</p>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 ? (
        <div className="app-card alerts-empty" style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          color: '#9ca3af'
        }}>
          <p style={{ fontSize: '14px', margin: '0', fontWeight: '600' }}>Nenhuma ação pendente</p>
          <p style={{ fontSize: '12px', margin: '6px 0 0 0' }}>Pagamentos, pacotes e registros estão em ordem.</p>
        </div>
      ) : (
        <div className="alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(alert => {
            const style = severityStyles[alert.severity];
            const student = students.find(item => item.id === alert.studentId);
            const billingStatus = student ? calculateBillingStatus(student, records) : null;
            const hasPhone = !!String(student?.phone || '').replace(/\D/g, '');
            const canSavePayment = ['payment_overdue', 'payment_due'].includes(alert.type) && student;
            const canMarkAttendance = alert.type === 'unmarked_class' && alert.classKey;
            const isSavingPayment = savingKey === `${alert.id}-payment`;
            const isSavingPresent = savingKey === `${alert.id}-present`;
            const isSavingAbsent = savingKey === `${alert.id}-absent`;
            const isResolving = savingKey === `${alert.id}-resolved`;
            const isSnoozing = savingKey === `${alert.id}-snoozed`;
            const isIgnoring = savingKey === `${alert.id}-ignored`;

            return (
              <div key={alert.id} className={`alert-card alert-card-${alert.severity}`} style={{
                background: 'white',
                border: `1px solid ${style.border}`,
                borderLeft: `4px solid ${style.color}`,
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#1f2937', margin: '0 0 4px 0' }}>{alert.title}</p>
                    <p style={{ fontSize: '12px', color: '#4b5563', margin: '0', lineHeight: 1.4 }}>{alert.message}</p>
                  </div>
                  <span className="alert-severity-pill" style={{
                    flexShrink: 0,
                    background: style.background,
                    color: style.color,
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {style.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  <ActionButton
                    theme={theme}
                    tone="primary"
                    disabled={!hasPhone}
                    onClick={() => openWhatsAppMessage(student?.phone, buildMessage(alert, student, billingStatus))}
                  >
                    WhatsApp
                  </ActionButton>

                  {canSavePayment && (
                    <ActionButton
                      theme={theme}
                      tone="success"
                      disabled={isSavingPayment}
                      onClick={() => savePaymentFromAlert(alert, student, billingStatus)}
                    >
                      {isSavingPayment ? 'Salvando...' : 'Marcar pago'}
                    </ActionButton>
                  )}

                  {canMarkAttendance && (
                    <>
                      <ActionButton
                        theme={theme}
                        tone="success"
                        disabled={isSavingPresent}
                        onClick={() => markAttendance(alert, 'present')}
                      >
                        Presente
                      </ActionButton>
                      <ActionButton
                        theme={theme}
                        tone="danger"
                        disabled={isSavingAbsent}
                        onClick={() => markAttendance(alert, 'absent')}
                      >
                        Falta
                      </ActionButton>
                    </>
                  )}

                  <ActionButton
                    theme={theme}
                    tone="success"
                    disabled={isResolving}
                    onClick={() => saveAlertAction(alert, 'resolved')}
                  >
                    {isResolving ? 'Resolvendo...' : 'Resolver'}
                  </ActionButton>
                  <ActionButton
                    theme={theme}
                    tone="neutral"
                    disabled={isSnoozing}
                    onClick={() => saveAlertAction(alert, 'snoozed', { snoozedUntil: getDefaultSnoozeDate() })}
                  >
                    Adiar 3 dias
                  </ActionButton>
                  <ActionButton
                    theme={theme}
                    tone="neutral"
                    disabled={isIgnoring}
                    onClick={() => saveAlertAction(alert, 'ignored')}
                  >
                    Ignorar mes
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { AlertsTab };
