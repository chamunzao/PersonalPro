import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import { formatCurrency } from "../../lib/money";
import { getClassesForDate } from "../schedule/scheduleCalculations";
import { getAttendanceStatusStyle, updateAttendanceRecord } from "../attendance/attendanceActions";
import { calculateDashboard } from "./dashboardCalculations";

export function DashboardTab({ students, records, setRecords, payments, scheduleOverrides, locations = [], loadingData, theme }) {
  const { user } = useAuth();
  const [savingAttendanceKey, setSavingAttendanceKey] = useState(null);
  const dashboard = calculateDashboard({
    students,
    records,
    payments,
    locations,
    getClassesForDate: (dateISO) => getClassesForDate(dateISO, students, scheduleOverrides, locations)
  });

  const metricCards = [
    { label: "Aulas Hoje", value: dashboard.todayClasses.length, detail: `${dashboard.pendingTodayClasses.length} sem registro`, color: theme.primary },
    { label: "Receita Liquida", value: formatCurrency(dashboard.report.netRevenue), detail: `${formatCurrency(dashboard.report.grossRevenue)} bruto`, color: theme.primary },
    { label: "Alertas Criticos", value: dashboard.criticalAlerts.length, detail: `${dashboard.warningAlerts.length} em atencao`, color: "#dc2626" },
    { label: "Pagamentos", value: `${dashboard.report.paymentRate.toFixed(0)}%`, detail: `${dashboard.pendingPayments} pendente${dashboard.pendingPayments === 1 ? "" : "s"}`, color: "#059669" }
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
    <div style={{ padding: "16px" }}>
      <div style={{
        background: theme.gradient,
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "16px"
      }}>
        <p style={{ fontSize: "13px", margin: "0 0 4px 0", opacity: 0.9, fontWeight: "600" }}>Resumo de hoje</p>
        <h2 style={{ fontSize: "22px", margin: "0", fontWeight: "800" }}>PersonalPro</h2>
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        {metricCards.map(card => (
          <div key={card.label} style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "14px"
          }}>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "700" }}>{card.label}</p>
            <p style={{ fontSize: typeof card.value === "number" ? "28px" : "20px", color: card.color, margin: "0", fontWeight: "800" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "6px 0 0 0" }}>{card.detail}</p>
          </div>
        ))}
      </div>

      <div style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 12px 0", color: "#1f2937" }}>Aulas de hoje</h3>
        {dashboard.todayClasses.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>Nenhuma aula agendada hoje.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dashboard.todayClasses.map(cls => {
              const statusStyle = getAttendanceStatusStyle(cls.attendance, theme);
              const isSaving = savingAttendanceKey === cls.key;
              return (
                <div key={cls.key} style={{
                  padding: "10px",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  border: `1px solid ${statusStyle.border}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "700", margin: "0 0 2px 0", color: "#1f2937" }}>{cls.studentName}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: "0" }}>{cls.time} - {cls.scheduleTypeLabel || "Fixa"}</p>
                      <p style={{ fontSize: "10px", color: "#9ca3af", margin: "2px 0 0 0" }}>{cls.locationName || "Sem local"}</p>
                    </div>
                    <span style={{
                      fontSize: "11px",
                      color: statusStyle.color,
                      background: statusStyle.background,
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontWeight: "800"
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <button
                      onClick={() => quickUpdateAttendance(cls, "present")}
                      disabled={isSaving}
                      style={{
                        padding: "8px",
                        background: cls.attendance === "present" ? "#d1fae5" : "white",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "800",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      Presente
                    </button>
                    <button
                      onClick={() => quickUpdateAttendance(cls, "absent")}
                      disabled={isSaving}
                      style={{
                        padding: "8px",
                        background: cls.attendance === "absent" ? "#fee2e2" : "white",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "800",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      Falta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 12px 0", color: "#1f2937" }}>Prioridades</h3>
        {dashboard.priorityAlerts.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>Nenhuma prioridade pendente.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dashboard.priorityAlerts.map(alert => {
              const colors = alert.severity === "danger"
                ? { background: "#fee2e2", color: "#dc2626" }
                : alert.severity === "warning"
                ? { background: "#fef3c7", color: "#d97706" }
                : { background: "#dbeafe", color: "#2563eb" };
              return (
                <div key={alert.id} style={{ padding: "10px", background: "#f9fafb", borderRadius: "6px", borderLeft: `4px solid ${colors.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "700", margin: "0 0 3px 0", color: "#1f2937" }}>{alert.title}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: "0" }}>{alert.message}</p>
                    </div>
                    <span style={{ alignSelf: "flex-start", flexShrink: 0, padding: "3px 7px", background: colors.background, color: colors.color, borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>
                      {alert.severity === "danger" ? "Critico" : alert.severity === "warning" ? "Atencao" : "Hoje"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
