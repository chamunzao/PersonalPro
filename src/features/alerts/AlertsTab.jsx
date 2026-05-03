import { calculateAlerts } from './alertsCalculations';
import { getClassesForDate } from '../schedule/scheduleCalculations';
// ==================== ALERTS TAB ====================
function AlertsTab({ students, records, payments, scheduleOverrides, loadingData, theme }) {
  const alerts = calculateAlerts({
    students,
    records,
    payments,
    getClassesForDate: (dateISO) => getClassesForDate(dateISO, students, scheduleOverrides)
  });
  const counts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, { danger: 0, warning: 0, info: 0 });

  const severityStyles = {
    danger: { background: "#fee2e2", color: "#dc2626", border: "#fecaca" },
    warning: { background: "#fef3c7", color: "#d97706", border: "#fde68a" },
    info: { background: "#dbeafe", color: "#2563eb", border: "#bfdbfe" }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Alertas</h2>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { key: "danger", label: "Críticos" },
          { key: "warning", label: "Atenção" },
          { key: "info", label: "Hoje" }
        ].map(item => {
          const style = severityStyles[item.key];
          return (
            <div key={item.key} style={{
              background: style.background,
              border: `1px solid ${style.border}`,
              borderRadius: "8px",
              padding: "12px"
            }}>
              <p style={{ fontSize: "11px", color: style.color, margin: "0 0 6px 0", fontWeight: "700" }}>{item.label}</p>
              <p style={{ fontSize: "24px", color: style.color, margin: "0", fontWeight: "800" }}>{counts[item.key] || 0}</p>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          color: "#9ca3af"
        }}>
          <p style={{ fontSize: "14px", margin: "0", fontWeight: "600" }}>Nenhum alerta pendente</p>
          <p style={{ fontSize: "12px", margin: "6px 0 0 0" }}>Pagamentos, pacotes e registros estão em ordem.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {alerts.map(alert => {
            const style = severityStyles[alert.severity];
            return (
              <div key={alert.id} style={{
                background: "white",
                border: `1px solid ${style.border}`,
                borderLeft: `4px solid ${style.color}`,
                borderRadius: "8px",
                padding: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#1f2937", margin: "0 0 4px 0" }}>{alert.title}</p>
                    <p style={{ fontSize: "12px", color: "#4b5563", margin: "0" }}>{alert.message}</p>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    background: style.background,
                    color: style.color,
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "700"
                  }}>
                    {alert.severity === "danger" ? "Crítico" : alert.severity === "warning" ? "Atenção" : "Hoje"}
                  </span>
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
