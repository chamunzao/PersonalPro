import React, { useState } from 'react';
import { MONTHS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import { calculateMonthlyReport } from './reportsCalculations';
// ==================== REPORTS TAB ====================
function ReportsTab({ students, records, payments, loadingData, theme }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const report = calculateMonthlyReport({ students, records, payments, monthKey });

  return (
    <div className="reports-page">
      <section className="app-card reports-hero-panel">
        <p className="dashboard-kicker">VISAO DO MES</p>
        <h2 className="reports-page-title">Relatório</h2>
        <p className="reports-page-kicker">Acompanhe aulas, faltas, receita e pagamentos por aluno.</p>
        <div className="reports-hero-summary">
          <div>
            <p>Receita liquida</p>
            <strong>{formatCurrency(report.netRevenue)}</strong>
          </div>
          <span>{report.paymentRate.toFixed(0)}% pagamento</span>
        </div>
      </section>

      <div className="reports-filter-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div className="reports-metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Total de Aulas</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{report.totalClasses}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.presentClasses} presentes ({report.attendanceRate.toFixed(0)}%)</p>
        </div>

        <div className="reports-metric-card reports-metric-danger" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de Falta</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{report.absenceRate.toFixed(1)}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.absentClasses} faltas</p>
        </div>

        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Receita Líquida</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{formatCurrency(report.netRevenue)}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.revenuePercentage.toFixed(0)}% após taxa da academia</p>
        </div>

        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de Pagamento</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{report.paymentRate.toFixed(0)}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.studentsWithPayment}/{report.totalStudents} alunos</p>
        </div>
      </div>

      <div className="reports-revenue-card" style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        marginBottom: "20px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px"
      }}>
        <div>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0", fontWeight: "600" }}>Receita Bruta</p>
          <p style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "#1f2937" }}>{formatCurrency(report.grossRevenue)}</p>
        </div>
        <div>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0", fontWeight: "600" }}>Taxa Academia</p>
          <p style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{formatCurrency(report.gymFees)}</p>
        </div>
      </div>

      <div className="reports-detail-card" style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px 0", color: "#1f2937" }}>Detalhamento por Aluno</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {report.studentRows.map(({ student, totalClasses, presentClasses, absentClasses, grossRevenue, gymFees, netRevenue, paid }) => {
            return (
              <div key={student.id} className={`reports-student-row ${paid ? "reports-student-paid" : "reports-student-pending"}`} style={{
                padding: "10px",
                background: "#f9fafb",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px"
              }}>
                <div>
                  <p style={{ fontWeight: "600", margin: "0 0 2px 0", color: "#1f2937" }}>{student.name}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0" }}>
                    {totalClasses} aulas ({presentClasses} presentes, {absentClasses} faltas)
                  </p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "3px 0 0 0" }}>
                    {formatCurrency(grossRevenue)} bruto · {formatCurrency(gymFees)} taxa · {formatCurrency(netRevenue)} líquido
                  </p>
                </div>
                <span className={`reports-payment-pill ${paid ? "reports-paid" : "reports-pending"}`} style={{
                  padding: "4px 8px",
                  background: paid ? "#d1fae5" : "#fee2e2",
                  color: paid ? "#059669" : "#dc2626",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "600"
                }}>
                  {paid ? "Pago" : "Pendente"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ReportsTab };
