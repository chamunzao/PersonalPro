import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import { formatCurrency } from "../../lib/money";
import { getClassesForDate } from "../schedule/scheduleCalculations";
import { getAttendanceStatusStyle, updateAttendanceRecord } from "../attendance/attendanceActions";
import { getOnboardingSteps, shouldShowOnboarding } from "../onboarding/onboardingSteps";
import { getNextClassAction } from "./dashboardActions";
import { calculateDashboard } from "./dashboardCalculations";

export function DashboardTab({ students, records, setRecords, payments, scheduleOverrides, loadingData, theme, onOpenSession, onSelectTab }) {
  const { user } = useAuth();
  const [savingAttendanceKey, setSavingAttendanceKey] = useState(null);
  const dashboard = calculateDashboard({
    students,
    records,
    payments,
    getClassesForDate: (dateISO) => getClassesForDate(dateISO, students, scheduleOverrides)
  });

  const nextClassAction = getNextClassAction(dashboard.todayClasses);
  const showOnboarding = !loadingData && shouldShowOnboarding(students);
  const onboardingSteps = getOnboardingSteps();
  const metricCards = [
    { label: "Aulas hoje", value: dashboard.todayClasses.length, detail: `${dashboard.pendingTodayClasses.length} sem registro`, tone: theme.primary },
    { label: "Líquido no mês", value: formatCurrency(dashboard.report.netRevenue), detail: `${formatCurrency(dashboard.report.grossRevenue)} bruto`, tone: theme.primary },
    { label: "Alertas críticos", value: dashboard.criticalAlerts.length, detail: `${dashboard.warningAlerts.length} em atenção`, tone: "#dc2626" },
    { label: "Pagamentos", value: `${dashboard.report.paymentRate.toFixed(0)}%`, detail: `${dashboard.pendingPayments} pendente${dashboard.pendingPayments === 1 ? "" : "s"}`, tone: "#F2CF7C" }
  ];

  async function quickUpdateAttendance(cls, status) {
    if (!user) return;
    const nextStatus = cls.attendance === status ? null : status;
    setSavingAttendanceKey(cls.key);
    try {
      await updateAttendanceRecord({ user, classKey: cls.key, status: nextStatus, setRecords });
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Erro ao atualizar presença");
    } finally {
      setSavingAttendanceKey(null);
    }
  }

  return (
    <div className="app-page">
      <div className="dashboard-hero-grid">
        <section className="app-card" style={{ padding: "18px", background: "linear-gradient(135deg, #243B5C 0%, #142339 100%)", color: "#FFFFFF", overflow: "hidden" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#F2CF7C", margin: "0 0 8px" }}>PAINEL DO DIA</p>
          <h2 style={{ fontSize: "30px", lineHeight: 1.05, fontWeight: "700", margin: 0, color: "#FFFFFF" }}>Sua rotina pronta para executar.</h2>
          <p style={{ maxWidth: "620px", margin: "10px 0 0", fontSize: "14px", lineHeight: 1.45, color: "#C2CAD7" }}>
            Marque presença, veja pendências e acompanhe o caixa do mês sem sair do fluxo das aulas.
          </p>
          {nextClassAction && (
            <div style={{
              marginTop: "18px",
              background: "rgba(242, 207, 124, 0.15)",
              border: "0.5px solid #4A6388",
              borderRadius: "16px",
              padding: "12px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center"
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "#C2CAD7", fontWeight: "500" }}>Próxima ação</p>
                <p style={{ margin: "4px 0 0", fontSize: "16px", color: "#FFFFFF", fontWeight: "700" }}>{nextClassAction.classItem.time} - {nextClassAction.classItem.studentName}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="status-pendente" style={{ whiteSpace: "nowrap" }}>
                  {nextClassAction.statusLabel}
                </span>
                <button
                  type="button"
                  onClick={onOpenSession}
                  className="dashboard-next-action-button"
                >
                  {nextClassAction.label}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="app-card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 12px", color: "#C2CAD7", fontSize: "11px", fontWeight: "500" }}>RESUMO FINANCEIRO</p>
          <p style={{ margin: 0, color: "#F2CF7C", fontSize: "30px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{loadingData ? "..." : formatCurrency(dashboard.report.netRevenue)}</p>
          <p style={{ margin: "5px 0 0", color: "#91A0B6", fontSize: "13px" }}>após taxas da academia</p>
          <div style={{ height: "0.5px", background: "#4A6388", margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <span style={{ color: "#C2CAD7", fontSize: "11px", fontWeight: "500" }}>Recebidos</span>
            <strong style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: "500" }}>{loadingData ? "Carregando" : `${dashboard.report.studentsWithPayment}/${dashboard.report.totalStudents} alunos`}</strong>
          </div>
        </section>
      </div>

      {loadingData && (
        <section className="app-card dashboard-loading-panel">
          <p>Carregando sua operação...</p>
          <span className="dashboard-loading-line" />
          <span className="dashboard-loading-line" style={{ width: "72%" }} />
        </section>
      )}

      {showOnboarding && (
        <section className="app-card onboarding-panel">
          <div>
            <p className="onboarding-kicker">PRIMEIRA CONFIGURAÇÃO</p>
            <h3 className="onboarding-title">Monte sua operação em poucos passos.</h3>
            <p className="onboarding-copy">Comece pelo aluno, depois organize agenda, cobrança e execução da primeira aula.</p>
          </div>

          <div className="onboarding-step-list">
            {onboardingSteps.map((step, index) => (
              <button
                key={step.targetTab}
                type="button"
                className="onboarding-step"
                onClick={() => onSelectTab(step.targetTab)}
              >
                <span className="onboarding-step-index">{index + 1}</span>
                <span className="onboarding-step-text">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loadingData && <div className="dashboard-metrics-grid">
        {metricCards.map(card => (
          <div key={card.label} className="app-card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#C2CAD7", margin: "0 0 8px", fontWeight: "500" }}>{card.label}</p>
            <p style={{ fontSize: typeof card.value === "number" ? "28px" : "20px", color: card.tone, margin: "0", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "6px 0 0" }}>{card.detail}</p>
          </div>
        ))}
      </div>}

      {!loadingData && <div className="dashboard-work-grid">
        <section className="app-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#FFFFFF" }}>Aulas de hoje</h3>
              <p style={{ fontSize: "11px", color: "#C2CAD7", margin: "4px 0 0" }}>Registro rápido para manter a agenda limpa.</p>
            </div>
            <span style={{ color: "#F2CF7C", background: "rgba(242, 207, 124, 0.15)", padding: "5px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "500" }}>{dashboard.todayClasses.length} aulas</span>
          </div>

          {dashboard.todayClasses.length === 0 ? (
            <EmptyLine text="Nenhuma aula agendada hoje." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dashboard.todayClasses.map(cls => {
                const statusStyle = getAttendanceStatusStyle(cls.attendance, theme);
                const isSaving = savingAttendanceKey === cls.key;
                return (
                  <div key={cls.key} className="dashboard-today-class-card" style={{
                    padding: "12px",
                    background: "#142339",
                    borderRadius: "12px",
                    border: "0.5px solid #4A6388"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: "500", margin: "0 0 3px", color: "#FFFFFF" }}>{cls.studentName}</p>
                        <p style={{ fontSize: "11px", color: "#91A0B6", margin: 0 }}>{cls.time} - {cls.scheduleTypeLabel || "Fixa"}</p>
                      </div>
                      <span className={cls.attendance === "present" ? "status-pago" : cls.attendance === "absent" ? "status-atrasado" : "status-pendente"}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                      <QuickButton label="Presente" active={cls.attendance === "present"} disabled={isSaving} color="#F2CF7C" bg="rgba(242, 207, 124, 0.14)" border="rgba(242, 207, 124, 0.35)" onClick={() => quickUpdateAttendance(cls, "present")} />
                      <QuickButton label="Falta" active={cls.attendance === "absent"} disabled={isSaving} color="#dc2626" bg="#fee2e2" border="#fecaca" onClick={() => quickUpdateAttendance(cls, "absent")} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card" style={{ padding: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 12px", color: "#FFFFFF" }}>Prioridades</h3>
          {dashboard.priorityAlerts.length === 0 ? (
            <EmptyLine text="Nenhuma prioridade pendente." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dashboard.priorityAlerts.map(alert => {
                const colors = alert.severity === "danger"
                  ? { background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", label: "Crítico" }
                  : alert.severity === "warning"
                  ? { background: "rgba(242, 207, 124, 0.15)", color: "#F2CF7C", label: "Atenção" }
                  : { background: "rgba(242, 207, 124, 0.15)", color: "#F2CF7C", label: "Hoje" };
                return (
                  <div key={alert.id} style={{ padding: "12px", background: colors.background, borderRadius: "12px", border: `0.5px solid ${colors.color}44` }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", margin: "0 0 4px", color: "#FFFFFF" }}>{alert.title}</p>
                    <p style={{ fontSize: "11px", color: "#C2CAD7", margin: "0 0 8px", lineHeight: 1.4 }}>{alert.message}</p>
                    <span className={alert.severity === "danger" ? "status-atrasado" : alert.severity === "warning" ? "status-pendente" : "status-pago"}>{colors.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>}
    </div>
  );
}

function QuickButton({ label, active, disabled, color, bg, border, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px",
        background: active ? bg : "#243B5C",
        color,
        border: `0.5px solid ${border}`,
        borderRadius: "14px",
        fontSize: "12px",
        fontWeight: "500",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1
      }}
    >
      {label}
    </button>
  );
}

function EmptyLine({ text }) {
  return (
    <div style={{ padding: "18px", background: "#142339", border: "0.5px dashed #4A6388", borderRadius: "12px" }}>
      <p style={{ fontSize: "13px", color: "#C2CAD7", margin: 0 }}>{text}</p>
    </div>
  );
}
