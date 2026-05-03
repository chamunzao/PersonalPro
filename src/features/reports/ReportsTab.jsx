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
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Relatório</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Total de Aulas</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{report.totalClasses}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.presentClasses} presentes ({report.attendanceRate.toFixed(0)}%)</p>
        </div>

        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de Falta</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{report.absenceRate.toFixed(1)}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.absentClasses} faltas</p>
        </div>

        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Receita Líquida</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{formatCurrency(report.netRevenue)}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.revenuePercentage.toFixed(0)}% após taxa da academia</p>
        </div>

        <div style={{
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

      <div style={{
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

      <div style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px 0", color: "#1f2937" }}>Detalhamento por Aluno</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {report.studentRows.map(({ student, totalClasses, presentClasses, absentClasses, grossRevenue, gymFees, netRevenue, paid }) => {
            return (
              <div key={student.id} style={{
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
                <span style={{
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
