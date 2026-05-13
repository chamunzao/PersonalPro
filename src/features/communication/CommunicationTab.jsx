import { useMemo, useState } from 'react';
import { calculateAdvanceCreditStatus, calculateBillingStatus } from '../billing/billingCalculations';
import {
  buildCommunicationMessages,
  buildTemplateMessageForStudent,
  createCustomMessageTemplate,
  filterStudentsForCommunication,
  getMonthPayment,
  getNextClassFromSchedule,
  getStandardMessageTemplates,
  updateCustomMessageTemplate
} from './messageTemplates.js';

const CUSTOM_MESSAGES_STORAGE_KEY = 'personalpro-custom-communication-templates';

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    alert('Cadastre o WhatsApp do aluno para usar esta ação.');
    return;
  }
  const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function loadCustomTemplates() {
  try {
    const saved = window.localStorage.getItem(CUSTOM_MESSAGES_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates) {
  window.localStorage.setItem(CUSTOM_MESSAGES_STORAGE_KEY, JSON.stringify(templates));
}

function TemplateOption({ template, selected, onClick }) {
  return (
    <button
      type="button"
      className={`communication-template-option ${selected ? 'communication-template-selected' : ''}`}
      onClick={onClick}
    >
      <span>{template.title}</span>
      <small>{template.description}</small>
    </button>
  );
}

function getMessageForTemplate({ template, student, records, payments, now }) {
  if (!student || !template) return '';

  const messages = buildCommunicationMessages({ student, records, payments, asOf: now });
  if (template.type === 'standard') return messages[template.id] || '';

  const billingStatus = calculateBillingStatus(student, records, now);
  const creditStatus = calculateAdvanceCreditStatus(student, records, payments, now);
  const nextClass = getNextClassFromSchedule(student, now);
  const nextClassText = nextClass?.dateText && nextClass?.time
    ? `${nextClass.dateText} às ${nextClass.time}`
    : 'a combinar';

  return buildTemplateMessageForStudent({
    template,
    student,
    context: {
      amount: billingStatus.planValue || student.packagePrice || student.pricePerClass || 0,
      nextClassText,
      remainingClasses: creditStatus.remainingClasses ?? billingStatus.remainingClasses ?? 'a confirmar'
    }
  });
}

function CommunicationTab({ students, records, payments, loadingData, theme }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const standardTemplates = useMemo(() => getStandardMessageTemplates(), []);
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(standardTemplates[0]?.id || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [isTemplateLibraryExpanded, setIsTemplateLibraryExpanded] = useState(false);
  const [isTemplateSearchFocused, setIsTemplateSearchFocused] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const templates = [...standardTemplates, ...customTemplates];
  const visibleTemplates = templates.filter(template => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return true;
    return `${template.title} ${template.description}`.toLowerCase().includes(query);
  });
  const shouldShowTemplateList = isTemplateLibraryExpanded || isTemplateSearchFocused || templateSearch.trim();
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId) || templates[0];
  const filteredStudents = filterStudentsForCommunication(students, studentSearch);
  const selectedStudent = students.find(student => student.id === selectedStudentId) || filteredStudents[0] || students[0] || null;
  const selectedPayment = selectedStudent ? getMonthPayment(selectedStudent, payments, monthKey) : null;
  const hasSelectedPhone = !!String(selectedStudent?.phone || '').replace(/\D/g, '');
  const selectedMessage = getMessageForTemplate({
    template: selectedTemplate,
    student: selectedStudent,
    records,
    payments,
    now
  });

  function addCustomTemplate(event) {
    event.preventDefault();
    if (!customTitle.trim() || !customBody.trim()) return;

    if (editingTemplateId) {
      const nextTemplates = customTemplates.map(template => (
        template.id === editingTemplateId
          ? updateCustomMessageTemplate(template, { title: customTitle, body: customBody })
          : template
      ));
      setCustomTemplates(nextTemplates);
      saveCustomTemplates(nextTemplates);
      setSelectedTemplateId(editingTemplateId);
      setEditingTemplateId('');
      setCustomTitle('');
      setCustomBody('');
      return;
    }

    const template = createCustomMessageTemplate({ title: customTitle, body: customBody });
    const nextTemplates = [...customTemplates, template];
    setCustomTemplates(nextTemplates);
    saveCustomTemplates(nextTemplates);
    setSelectedTemplateId(template.id);
    setCustomTitle('');
    setCustomBody('');
  }

  function deleteCustomTemplate(templateId) {
    const nextTemplates = customTemplates.filter(template => template.id !== templateId);
    setCustomTemplates(nextTemplates);
    saveCustomTemplates(nextTemplates);
    if (selectedTemplateId === templateId) setSelectedTemplateId(standardTemplates[0]?.id || '');
    if (editingTemplateId === templateId) {
      setEditingTemplateId('');
      setCustomTitle('');
      setCustomBody('');
    }
  }

  function selectTemplateForEditing(template) {
    setSelectedTemplateId(template.id);
    setEditingTemplateId(template.type === 'custom' ? template.id : '');
    setCustomTitle(template.title);
    setCustomBody(template.type === 'custom'
      ? template.body
      : getMessageForTemplate({ template, student: selectedStudent, records, payments, now }));
  }

  function cancelEditCustomTemplate() {
    setEditingTemplateId('');
    setCustomTitle('');
    setCustomBody('');
  }

  return (
    <div className="communication-page">
      <section className="app-card communication-hero-panel">
        <p className="dashboard-kicker">CENTRAL DE CONTATO</p>
        <h2 className="communication-page-title">Comunicação</h2>
        <p className="communication-page-kicker">Escolha uma mensagem padrão, selecione o aluno e envie pelo WhatsApp.</p>
        <div className="communication-hero-summary">
          <div>
            <p>Alunos na lista</p>
            <strong>{students.length}</strong>
          </div>
          <span>{students.filter(student => String(student.phone || '').replace(/\D/g, '')).length} com WhatsApp</span>
        </div>
      </section>

      {loadingData && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>Carregando...</p>}

      <section className="communication-library-card">
        <div className="communication-section-header">
          <div>
            <p className="dashboard-kicker">MENSAGENS PADRÃO</p>
            <h3>Biblioteca do personal</h3>
          </div>
          <button
            type="button"
            className="communication-library-toggle"
            onClick={() => setIsTemplateLibraryExpanded(current => !current)}
          >
            {isTemplateLibraryExpanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>

        <div className="communication-library-summary">
          <p>{templates.length} modelos disponíveis. Mensagem atual: <strong>{selectedTemplate?.title || 'nenhuma'}</strong>.</p>
        </div>

        <input
          className="communication-template-search"
          value={templateSearch}
          onChange={(event) => setTemplateSearch(event.target.value)}
          onFocus={() => setIsTemplateSearchFocused(true)}
          onBlur={() => setIsTemplateSearchFocused(false)}
          placeholder="Pesquisar mensagem padrão"
        />

        {shouldShowTemplateList && (
          <div className="communication-template-list" onMouseDown={(event) => event.preventDefault()}>
            {visibleTemplates.map(template => (
              <div key={template.id} className="communication-template-shell">
                <TemplateOption
                  template={template}
                  selected={selectedTemplate?.id === template.id}
                  onClick={() => selectTemplateForEditing(template)}
                />
                {template.type === 'custom' && (
                  <div className="communication-template-actions">
                    <button
                      type="button"
                      className="communication-template-edit"
                      onClick={() => selectTemplateForEditing(template)}
                      aria-label={`Editar ${template.title}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="communication-template-delete"
                      onClick={() => deleteCustomTemplate(template.id)}
                      aria-label={`Remover ${template.title}`}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form className="communication-template-form" onSubmit={addCustomTemplate}>
          <input
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder="Nome da mensagem"
          />
          <textarea
            value={customBody}
            onChange={(event) => setCustomBody(event.target.value)}
            placeholder="Texto. Use {primeiro_nome}, {nome}, {valor}, {proxima_aula} ou {saldo_pacote}."
            rows={4}
          />
          <div className="communication-template-help">
            <p>Use {'{primeiro_nome}'} para trocar automaticamente pelo primeiro nome do aluno selecionado.</p>
            <p>{'{nome}'} usa o nome completo.</p>
            <p>{'{valor}'} insere o valor previsto do plano ou aula.</p>
            <p>{'{proxima_aula}'} mostra a próxima aula quando houver agenda.</p>
            <p>{'{saldo_pacote}'} mostra o saldo de aulas quando disponível.</p>
            <p>Exemplo: "Olá, {'{primeiro_nome}'}! Sua próxima aula é {'{proxima_aula}'}."</p>
          </div>
          <button type="submit" disabled={!customTitle.trim() || !customBody.trim()}>
            {editingTemplateId ? 'Salvar alterações' : 'Criar mensagem'}
          </button>
          {editingTemplateId && (
            <button type="button" className="communication-template-cancel" onClick={cancelEditCustomTemplate}>
              Cancelar edição
            </button>
          )}
        </form>
      </section>

      {students.length === 0 ? (
        <div className="app-card communication-empty">
          <p>Nenhum aluno cadastrado</p>
        </div>
      ) : (
        <section className="communication-send-panel">
          <div className="communication-section-header">
            <div>
              <p className="dashboard-kicker">ALUNO</p>
              <h3>Selecionar destinatário</h3>
            </div>
            {selectedStudent && (
              <span className={`communication-payment-pill ${selectedPayment ? 'communication-paid' : 'communication-pending'}`}>
                {selectedPayment ? 'Pago' : 'Pendente'}
              </span>
            )}
          </div>

          <input
            className="communication-student-search"
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Pesquisar aluno"
          />

          <div className="communication-student-name-list">
            {filteredStudents.map(student => {
              const hasPhone = !!String(student.phone || '').replace(/\D/g, '');
              return (
                <button
                  type="button"
                  key={student.id}
                  className={`communication-student-name ${selectedStudent?.id === student.id ? 'communication-student-selected' : ''}`}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <span>{student.name}</span>
                  <small>{hasPhone ? student.phone : 'Sem WhatsApp'}</small>
                </button>
              );
            })}
          </div>

          <div className="communication-preview-card">
            <div>
              <p>Mensagem selecionada</p>
              <strong>{selectedTemplate?.title || 'Selecione uma mensagem'}</strong>
            </div>
            <textarea value={selectedMessage} readOnly rows={6} />
            <button
              type="button"
              className="communication-send-button"
              disabled={!selectedStudent || !hasSelectedPhone || !selectedMessage}
              onClick={() => openWhatsAppMessage(selectedStudent.phone, selectedMessage)}
              style={{ background: theme.primary }}
            >
              Enviar para {selectedStudent?.name || 'aluno'}
            </button>
            {selectedStudent && !hasSelectedPhone && (
              <span className="communication-send-warning">Cadastre o WhatsApp deste aluno para enviar.</span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export { CommunicationTab };
