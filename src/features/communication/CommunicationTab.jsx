import { calculateAdvanceCreditStatus, calculateBillingStatus } from '../billing/billingCalculations';
import { buildCommunicationMessages, getMonthPayment } from './messageTemplates.js';

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    alert('Cadastre o WhatsApp do aluno para usar esta acao.');
    return;
  }
  const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
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
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="communication-page">
      <section className="app-card communication-hero-panel">
        <p className="dashboard-kicker">CENTRAL DE CONTATO</p>
        <h2 className="communication-page-title">Comunicacao</h2>
        <p className="communication-page-kicker">Acoes rapidas com mensagens prontas para WhatsApp.</p>
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
            const messages = buildCommunicationMessages({ student, records, payments, asOf: now });
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
                    <p style={{ fontSize: '11px', color: hasPhone ? '#F2CF7C' : '#dc2626', margin: '0', fontWeight: '700' }}>
                      {hasPhone ? `WhatsApp: ${student.phone}` : 'Sem WhatsApp cadastrado'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`communication-payment-pill ${payment ? 'communication-paid' : 'communication-pending'}`} style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: payment ? 'rgba(242, 207, 124, 0.14)' : '#fee2e2',
                      color: payment ? '#F2CF7C' : '#dc2626',
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
                    label="Confirmar proxima"
                    description="Confirma a proxima aula"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.nextClassConfirmation)}
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
                    label="Falta/reposicao"
                    description="Combina uma nova data"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.absenceReplacement)}
                  />
                  <CommunicationButton
                    label="Pos-aula"
                    description="Fecha a aula pelo WhatsApp"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.postClass)}
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
                  <CommunicationButton
                    label="Aluno inativo"
                    description="Convida para retomar a rotina"
                    disabled={!hasPhone}
                    theme={theme}
                    onClick={() => openWhatsAppMessage(student.phone, messages.inactiveStudent)}
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
