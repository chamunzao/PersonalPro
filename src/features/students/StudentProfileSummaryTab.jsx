import React from "react";
import {
  calculateBillingStatus,
  getBillingStatusColors,
  getBillingStatusLabel
} from "../billing/billingCalculations";
import {
  getActiveWorkoutPlan,
  getLastStudentRecord,
  getNextStudentClass,
  getStudentMonthAttendance,
  getStudentProfileRiskTags
} from "./studentProfileSummary";

function SummaryCard({ label, value, detail, tone = "default" }) {
  return (
    <article className={`student-summary-card student-summary-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function StudentProfileSummaryTab({
  student,
  records,
  workoutPlans,
  anamnesis,
  theme,
  onEdit,
  onOpenWorkout
}) {
  const billingStatus = calculateBillingStatus(student, records);
  const billingColors = getBillingStatusColors(billingStatus);
  const nextClass = getNextStudentClass(student);
  const attendance = getStudentMonthAttendance(student.id, records);
  const lastRecord = getLastStudentRecord(student.id, records);
  const riskTags = getStudentProfileRiskTags(anamnesis);
  const activeWorkout = getActiveWorkoutPlan(workoutPlans);
  const lastRecordLabel = lastRecord
    ? `${lastRecord.date} - ${lastRecord.time}`
    : "Sem historico";

  return (
    <div className="student-summary-tab">
      <section className="student-summary-hero">
        <div>
          <p className="dashboard-kicker">RESUMO OPERACIONAL</p>
          <h3>{student.name}</h3>
          <span>{nextClass ? `Proxima aula: ${nextClass.dayLabel}, ${nextClass.date} as ${nextClass.time}` : "Sem proxima aula fixa"}</span>
        </div>
        <div className="student-summary-actions">
          <button type="button" onClick={onEdit}>Editar dados</button>
          <button type="button" onClick={onOpenWorkout} disabled={!activeWorkout}>
            Abrir treino
          </button>
        </div>
      </section>

      <section className="student-summary-grid">
        <SummaryCard
          label="Financeiro"
          value={getBillingStatusLabel(billingStatus)}
          detail={billingStatus.billingTypeLabel}
          tone={billingStatus.status === "ok" ? "ok" : "attention"}
        />
        <SummaryCard
          label="Frequencia do mes"
          value={`${attendance.rate}%`}
          detail={`${attendance.present} presencas / ${attendance.absent} faltas`}
          tone={attendance.absent > 0 ? "attention" : "ok"}
        />
        <SummaryCard
          label="Treino ativo"
          value={activeWorkout?.name || "Sem treino"}
          detail={activeWorkout ? `${(activeWorkout.exercises || []).length} exercicios` : "Cadastre ou aplique um treino"}
          tone={activeWorkout ? "ok" : "attention"}
        />
        <SummaryCard
          label="Ultima aula"
          value={lastRecordLabel}
          detail={lastRecord?.sessionNote || lastRecord?.sessionCheckout?.nextAction || "Sem observacoes recentes"}
        />
      </section>

      <section className="student-summary-panel">
        <div className="student-summary-panel-header">
          <div>
            <p>Riscos e restricoes</p>
            <small>{riskTags.length > 0 ? "Pontos para revisar antes do atendimento" : "Nenhum ponto sensivel registrado"}</small>
          </div>
          <span style={{ background: billingColors.background, color: billingColors.color }}>
            {getBillingStatusLabel(billingStatus)}
          </span>
        </div>
        {riskTags.length > 0 ? (
          <div className="student-summary-risk-list">
            {riskTags.map(tag => (
              <span key={tag.key} title={tag.detail}>{tag.label}</span>
            ))}
          </div>
        ) : (
          <p className="student-summary-empty">Complete a anamnese para enriquecer este resumo.</p>
        )}
      </section>

      <section className="student-summary-panel">
        <div className="student-summary-panel-header">
          <div>
            <p>Observacoes recentes</p>
            <small>Contexto rapido para decidir a proxima aula</small>
          </div>
        </div>
        <p className="student-summary-note">
          {lastRecord?.sessionNote || lastRecord?.sessionCheckout?.nextAction || student.notes || "Nenhuma observacao registrada ainda."}
        </p>
      </section>
    </div>
  );
}
