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
        <section className="app-card" style={{ padding: "18px", background: "linear-gradient(135deg, #2E3154 0%, #1E2035 100%)", color: "#FFFFFF", overflow: "hidden" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#4A9EFF", margin: "0 0 8px" }}>PAINEL DO DIA</p>
          <h2 style={{ fontSize: "30px", lineHeight: 1.05, fontWeight: "700", margin: 0, color: "#FFFFFF" }}>Sua rotina pronta para executar.</h2>
          <p style={{ maxWidth: "620px", margin: "10px 0 0", fontSize: "14px", lineHeight: 1.45, color: "#9CA3AF" }}>
            Marque presenca, veja pendencias e acompanhe o caixa do mes sem sair do fluxo das aulas.
          </p>
          {nextClass && (
            <div style={{
              marginTop: "18px",
              background: "rgba(74, 158, 255, 0.15)",
              border: "0.5px solid #3D4270",
              borderRadius: "16px",
              padding: "12px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center"
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF", fontWeight: "500" }}>Proxima acao</p>
                <p style={{ margin: "4px 0 0", fontSize: "16px", color: "#FFFFFF", fontWeight: "700" }}>{nextClass.time} - {nextClass.studentName}</p>
              </div>
              <span className="status-pendente" style={{ whiteSpace: "nowrap" }}>
                {nextClass.attendance ? "Registrada" : "Pendente"}
              </span>
            </div>
          )}
        </section>

        <section className="app-card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 12px", color: "#9CA3AF", fontSize: "11px", fontWeight: "500" }}>RESUMO FINANCEIRO</p>
          <p style={{ margin: 0, color: "#4A9EFF", fontSize: "30px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(dashboard.report.netRevenue)}</p>
          <p style={{ margin: "5px 0 0", color: "#6B7280", fontSize: "13px" }}>apos taxas da academia</p>
          <div style={{ height: "0.5px", background: "#3D4270", margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <span style={{ color: "#9CA3AF", fontSize: "11px", fontWeight: "500" }}>Recebidos</span>
            <strong style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: "500" }}>{dashboard.report.studentsWithPayment}/{dashboard.report.totalStudents} alunos</strong>
          </div>
        </section>
      </div>

      {loadingData && <p style={{ color: "#9CA3AF", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div className="dashboard-metrics-grid">
        {metricCards.map(card => (
          <div key={card.label} className="app-card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 8px", fontWeight: "500" }}>{card.label}</p>
            <p style={{ fontSize: typeof card.value === "number" ? "28px" : "20px", color: card.tone, margin: "0", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "#6B7280", margin: "6px 0 0" }}>{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-work-grid">
        <section className="app-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#FFFFFF" }}>Aulas de hoje</h3>
              <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 0" }}>Registro rapido para manter a agenda limpa.</p>
            </div>
            <span style={{ color: "#4A9EFF", background: "rgba(74, 158, 255, 0.15)", padding: "5px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "500" }}>{dashboard.todayClasses.length} aulas</span>
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
                    background: "#1E2035",
                    borderRadius: "12px",
                    border: "0.5px solid #3D4270"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: "500", margin: "0 0 3px", color: "#FFFFFF" }}>{cls.studentName}</p>
                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{cls.time} - {cls.scheduleTypeLabel || "Fixa"}</p>
                      </div>
                      <span className={cls.attendance === "present" ? "status-pago" : cls.attendance === "absent" ? "status-atrasado" : "status-pendente"}>
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
          <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 12px", color: "#FFFFFF" }}>Prioridades</h3>
          {dashboard.priorityAlerts.length === 0 ? (
            <EmptyLine text="Nenhuma prioridade pendente." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dashboard.priorityAlerts.map(alert => {
                const colors = alert.severity === "danger"
                  ? { background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", label: "Critico" }
                  : alert.severity === "warning"
                  ? { background: "rgba(250, 204, 21, 0.15)", color: "#FACC15", label: "Atencao" }
                  : { background: "rgba(74, 158, 255, 0.15)", color: "#4A9EFF", label: "Hoje" };
                return (
                  <div key={alert.id} style={{ padding: "12px", background: colors.background, borderRadius: "12px", border: `0.5px solid ${colors.color}44` }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", margin: "0 0 4px", color: "#FFFFFF" }}>{alert.title}</p>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 8px", lineHeight: 1.4 }}>{alert.message}</p>
                    <span className={alert.severity === "danger" ? "status-atrasado" : alert.severity === "warning" ? "status-pendente" : "status-pago"}>{colors.label}</span>
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
        background: active ? bg : "#2E3154",
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
    <div style={{ padding: "18px", background: "#1E2035", border: "0.5px dashed #3D4270", borderRadius: "12px" }}>
      <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>{text}</p>
    </div>
  );
}
