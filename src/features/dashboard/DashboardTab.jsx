import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import { formatCurrency } from "../../lib/money";
import { getClassesForDate } from "../schedule/scheduleCalculations";
import { getAttendanceStatusStyle, updateAttendanceRecord } from "../attendance/attendanceActions";
import { calculateDashboard } from "./dashboardCalculations";

export function DashboardTab({ students, records, setRecords, payments, scheduleOverrides, loadingData, theme }) {
  const { user } = useAuth();
  const [savingAttendanceKey, setSavingAttendanceKey] = useState(null);
  const dashboard = calculateDashboard({
    students,
    records,
    payments,
    getClassesForDate: (dateISO) => getClassesForDate(dateISO, students, scheduleOverrides)
  });

  const nextClass = dashboard.todayClasses.find(cls => !cls.attendance) || dashboard.todayClasses[0];
  const metricCards = [
    { label: "Aulas hoje", value: dashboard.todayClasses.length, detail: `${dashboard.pendingTodayClasses.length} sem registro`, tone: theme.primary },
    { label: "Liquido no mes", value: formatCurrency(dashboard.report.netRevenue), detail: `${formatCurrency(dashboard.report.grossRevenue)} bruto`, tone: theme.primary },
    { label: "Alertas criticos", value: dashboard.criticalAlerts.length, detail: `${dashboard.warningAlerts.length} em atencao`, tone: "#dc2626" },
    { label: "Pagamentos", value: `${dashboard.report.paymentRate.toFixed(0)}%`, detail: `${dashboard.pendingPayments} pendente${dashboard.pendingPayments === 1 ? "" : "s"}`, tone: "#059669" }
  ];

  async function quickUpdateAttendance(cls, status) {
    if (!user) return;
    const nextStatus = cls.attendance === status ? null : status;
    setSavingAttendanceKey(cls.key);
    try {
      await updateAttendanceRecord({ user, classKey: cls.key, status: nextStatus, setRecords });
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Erro ao atualizar presenca");
    } finally {
      setSavingAttendanceKey(null);
    }
  }

  return (
    <div className="app-page">
      <div className="dashboard-hero-grid">
        <section className="app-card" style={{ padding: "18px", background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})`, color: "white", overflow: "hidden" }}>
          <p style={{ fontSize: "12px", fontWeight: "900", opacity: 0.82, margin: "0 0 8px" }}>PAINEL DO DIA</p>
          <h2 style={{ fontSize: "30px", lineHeight: 1.05, fontWeight: "900", margin: 0 }}>Sua rotina pronta para executar.</h2>
          <p style={{ maxWidth: "620px", margin: "10px 0 0", fontSize: "14px", lineHeight: 1.45, opacity: 0.9 }}>
            Marque presenca, veja pendencias e acompanhe o caixa do mes sem sair do fluxo das aulas.
          </p>
          {nextClass && (
            <div style={{
              marginTop: "18px",
              background: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center"
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", opacity: 0.78, fontWeight: "800" }}>Proxima acao</p>
                <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: "900" }}>{nextClass.time} - {nextClass.studentName}</p>
              </div>
              <span style={{ background: "white", color: theme.dark, borderRadius: "999px", padding: "7px 10px", fontSize: "12px", fontWeight: "900", whiteSpace: "nowrap" }}>
                {nextClass.attendance ? "Registrada" : "Pendente"}
              </span>
            </div>
          )}
        </section>

        <section className="app-card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "12px", fontWeight: "900" }}>RESUMO FINANCEIRO</p>
          <p style={{ margin: 0, color: theme.primary, fontSize: "30px", fontWeight: "900", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(dashboard.report.netRevenue)}</p>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>apos taxas da academia</p>
          <div style={{ height: "1px", background: "rgba(15, 23, 42, 0.08)", margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "800" }}>Recebidos</span>
            <strong style={{ color: "#111827", fontSize: "13px" }}>{dashboard.report.studentsWithPayment}/{dashboard.report.totalStudents} alunos</strong>
          </div>
        </section>
      </div>

      {loadingData && <p style={{ color: "#64748b", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div className="dashboard-metrics-grid">
        {metricCards.map(card => (
          <div key={card.label} className="app-card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px", fontWeight: "850" }}>{card.label}</p>
            <p style={{ fontSize: typeof card.value === "number" ? "28px" : "20px", color: card.tone, margin: "0", fontWeight: "900", fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
            <p style={{ fontSize: "12px", color: "#8a94a6", margin: "6px 0 0" }}>{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-work-grid">
        <section className="app-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: "#111827" }}>Aulas de hoje</h3>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>Registro rapido para manter a agenda limpa.</p>
            </div>
            <span style={{ color: theme.dark, background: theme.light, padding: "5px 9px", borderRadius: "999px", fontSize: "12px", fontWeight: "900" }}>{dashboard.todayClasses.length} aulas</span>
          </div>

          {dashboard.todayClasses.length === 0 ? (
            <EmptyLine text="Nenhuma aula agendada hoje." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dashboard.todayClasses.map(cls => {
                const statusStyle = getAttendanceStatusStyle(cls.attendance, theme);
                const isSaving = savingAttendanceKey === cls.key;
                return (
                  <div key={cls.key} style={{
                    padding: "12px",
                    background: "#f8faf9",
                    borderRadius: "10px",
                    border: `1px solid ${statusStyle.border}`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: "900", margin: "0 0 3px", color: "#111827" }}>{cls.studentName}</p>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{cls.time} - {cls.scheduleTypeLabel || "Fixa"}</p>
                      </div>
                      <span style={{
                        fontSize: "11px",
                        color: statusStyle.color,
                        background: statusStyle.background,
                        borderRadius: "999px",
                        padding: "5px 9px",
                        fontWeight: "900"
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                      <QuickButton label="Presente" active={cls.attendance === "present"} disabled={isSaving} color="#059669" bg="#d1fae5" border="#a7f3d0" onClick={() => quickUpdateAttendance(cls, "present")} />
                      <QuickButton label="Falta" active={cls.attendance === "absent"} disabled={isSaving} color="#dc2626" bg="#fee2e2" border="#fecaca" onClick={() => quickUpdateAttendance(cls, "absent")} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card" style={{ padding: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 12px", color: "#111827" }}>Prioridades</h3>
          {dashboard.priorityAlerts.length === 0 ? (
            <EmptyLine text="Nenhuma prioridade pendente." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dashboard.priorityAlerts.map(alert => {
                const colors = alert.severity === "danger"
                  ? { background: "#fef2f2", color: "#dc2626", label: "Critico" }
                  : alert.severity === "warning"
                  ? { background: "#fffbeb", color: "#d97706", label: "Atencao" }
                  : { background: "#eff6ff", color: "#2563eb", label: "Hoje" };
                return (
                  <div key={alert.id} style={{ padding: "12px", background: colors.background, borderRadius: "10px", border: `1px solid ${colors.color}22` }}>
                    <p style={{ fontSize: "13px", fontWeight: "900", margin: "0 0 4px", color: "#111827" }}>{alert.title}</p>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px", lineHeight: 1.4 }}>{alert.message}</p>
                    <span style={{ color: colors.color, fontSize: "11px", fontWeight: "900" }}>{colors.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
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
        background: active ? bg : "white",
        color,
        border: `1px solid ${border}`,
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "900",
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
    <div style={{ padding: "18px", background: "#f8faf9", border: "1px dashed rgba(15, 23, 42, 0.13)", borderRadius: "10px" }}>
      <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{text}</p>
    </div>
  );
}
