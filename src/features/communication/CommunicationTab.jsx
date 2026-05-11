import { DAYS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import { calculateAdvanceCreditStatus, calculateBillingStatus } from '../billing/billingCalculations';

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    alert('Cadastre o WhatsApp do aluno para usar esta ação.');
    return;
  }
  const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function getWeeklyScheduleText(student) {
  const schedule = student.schedule || [];
  if (schedule.length === 0) return 'Você ainda não tem horários fixos cadastrados nesta semana.';

  return DAYS.map((day, dayIndex) => {
    const times = schedule
      .filter(item => item.day === dayIndex)
      .map(item => item.time)
      .sort();
    return times.length > 0 ? `${day}: ${times.join(', ')}` : null;
  }).filter(Boolean).join('\n');
}

function getMonthPayment(student, payments, monthKey) {
  return payments.find(payment => payment.key === `${monthKey}_${student.id}` && payment.paid);
}

function buildMessages({ student, records, payments }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const billingStatus = calculateBillingStatus(student, records, now);
  const creditStatus = calculateAdvanceCreditStatus(student, records, payments, now);
  const payment = getMonthPayment(student, payments, monthKey);
  const firstName = student.name?.split(' ')[0] || student.name;
  const weeklySchedule = getWeeklyScheduleText(student);

  return {
    weeklyConfirmation: `Olá, ${firstName}! Passando para confirmar sua agenda da semana:\n\n${weeklySchedule}\n\nPode me confirmar se está tudo certo?`,
    paymentReminder: payment
      ? `Olá, ${firstName}! Seu pagamento deste mês consta como recebido. Obrigado!`
      : `Olá, ${firstName}! Passando para lembrar do pagamento deste mês. Valor previsto: ${formatCurrency(billingStatus.planValue || student.pricePerClass || 0)}. Qualquer dúvida me chama por aqui.`,
    packageEnding: creditStatus.remainingClasses !== null
      ? `Olá, ${firstName}! Seu pacote está com ${creditStatus.remainingClasses} aula(s) paga(s) restante(s). Vamos alinhar a renovação para não interromper sua rotina?`
      : billingStatus.remainingClasses !== null
      ? `Olá, ${firstName}! Seu pacote está com ${billingStatus.remainingClasses} aula(s) restante(s). Vamos alinhar a renovação para não interromper sua rotina?`
      : `Olá, ${firstName}! Passando para alinharmos a continuidade do seu plano de treinos deste mês.`,
    weeklyCheckIn: `Olá, ${firstName}! Check-in rápido da semana: como você está se sentindo com os treinos, dores, energia e rotina? Me responde por aqui para eu ajustar o acompanhamento.`,
    workoutReminder: `Olá, ${firstName}! Passando para reforçar seu treino atual. Se tiver dúvida em algum exercício, me chama por aqui antes da próxima aula.`
  };
}

function CommunicationButton({ label, description, onClick, disabled, theme }) {
  return (
    <button
      className="communication-action-button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px',
        background: disabled ? '#f3f4f6' : 'white',
        border: disabled ? '1px solid #e5e7eb' : `1px solid ${theme.light}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1
      }}
    >
      <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: disabled ? '#9ca3af' : theme.primary }}>{label}</span>
      <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{description}</span>
    </button>
  );
}

function CommunicationTab({ students, records, payments, loadingData, theme }) {
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="communication-page">
      <section className="app-card communication-hero-panel">
        <p className="dashboard-kicker">CENTRAL DE CONTATO</p>
        <h2 className="communication-page-title">Comunicação</h2>
        <p className="communication-page-kicker">Ações rápidas com mensagens prontas para WhatsApp.</p>
        <div className="communication-hero-summary">
          <div>
            <p>Alunos na lista</p>
            <strong>{students.length}</strong>
          </div>
          <span>{students.filter(student => String(student.phone || '').replace(/\D/g, '')).length} com WhatsApp</span>
        </div>
      </section>

      {loadingData && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>Carregando...</p>}

      {students.length === 0 ? (
        <div className="app-card communication-empty" style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#9ca3af'
        }}>
          <p style={{ fontSize: '14px', margin: '0' }}>Nenhum aluno cadastrado</p>
        </div>
      ) : (
        <div className="communication-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {students.map(student => {
            const messages = buildMessages({ student, records, payments });
            const hasPhone = !!String(student.phone || '').replace(/\D/g, '');
            const payment = getMonthPayment(student, payments, monthKey);
            const billingStatus = calculateBillingStatus(student, records);
            const creditStatus = calculateAdvanceCreditStatus(student, records, payments);
            const packageEnding = creditStatus.remainingClasses !== null
              ? creditStatus.remainingClasses <= 2
              : billingStatus.remainingClasses !== null && billingStatus.remainingClasses <= 2;

            return (
              <div key={student.id} className="communication-student-card" style={{
                background: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0 0 3px 0' }}>{student.name}</p>
                    <p style={{ fontSize: '11px', color: hasPhone ? '#059669' : '#dc2626', margin: '0', fontWeight: '700' }}>
                      {hasPhone ? `WhatsApp: ${student.phone}` : 'Sem WhatsApp cadastrado'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`communication-payment-pill ${payment ? 'communication-paid' : 'communication-pending'}`} style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: payment ? '#d1fae5' : '#fee2e2',
                      color: payment ? '#059669' : '#dc2626',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      {payment ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <CommunicationButton
                    label="Confirmar semana"
                    description="Envia horarios fixos da semana"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.weeklyConfirmation)}
                  />
                  <CommunicationButton
                    label="Cobrar pagamento"
                    description={payment ? 'Mensagem de recebido' : 'Lembrete de pendencia'}
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.paymentReminder)}
                  />
                  <CommunicationButton
                    label="Pacote acabando"
                    description={packageEnding ? 'Aluno precisa renovar logo' : 'Mensagem de continuidade'}
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.packageEnding)}
                  />
                  <CommunicationButton
                    label="Check-in semanal"
                    description="Pergunta sobre dores, energia e rotina"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.weeklyCheckIn)}
                  />
                  <CommunicationButton
                    label="Enviar treino"
                    description="Reforca acompanhamento do treino atual"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.workoutReminder)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { CommunicationTab };
