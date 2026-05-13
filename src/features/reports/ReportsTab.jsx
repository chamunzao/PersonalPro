import React, { useState } from 'react';
import { MONTHS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import {
  calculateMonthlyReport,
  calculatePreviousMonthComparison,
  calculateWeeklyRevenueForecast,
  getActiveFrequencyStudents,
  getPendingPaymentStudents,
  getTopAbsenceStudents,
  getTopRevenueStudents,
  getUpcomingPackageRisks
} from './reportsCalculations.js';
// ==================== REPORTS TAB ====================
function formatCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatDecisionDate(date) {
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDeltaLabel(value) {
  if (value === 0) return "Mesmo resultado do mes anterior";
  return `${value > 0 ? "+" : ""}${formatCurrency(value)} vs mes anterior`;
}

function DecisionList({ title, items, emptyText, renderItem }) {
  return (
    <section className="reports-decision-card">
      <h3>{title}</h3>
      <div className="reports-decision-list">
        {items.length > 0 ? items.map(renderItem) : <p className="reports-decision-empty">{emptyText}</p>}
      </div>
    </section>
  );
}

function ReportsTab({ students, records, payments, loadingData, theme }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const report = calculateMonthlyReport({ students, records, payments, monthKey });
  const comparison = calculatePreviousMonthComparison({ students, records, payments, monthKey });
  const selectedMonthReferenceDate = new Date(selectedYear, selectedMonth, 13);
  const pendingPaymentStudents = getPendingPaymentStudents(report, 5);
  const topAbsences = getTopAbsenceStudents(report, 5);
  const topRevenue = getTopRevenueStudents(report, 5);
  const activeFrequency = getActiveFrequencyStudents(report, 5);
  const packageRisks = getUpcomingPackageRisks({ students, records, payments, asOf: selectedMonthReferenceDate, limit: 5 });
  const weeklyForecast = calculateWeeklyRevenueForecast({ students, records, payments, fromDate: selectedMonthReferenceDate, limit: 5 });
  const forecastTotal = weeklyForecast.reduce((sum, item) => sum + item.amount, 0);
  const pendingStudents = Math.max(report.totalStudents - report.studentsWithPayment, 0);
  const averageNetRevenue = report.studentsWithPayment > 0 ? report.netRevenue / report.studentsWithPayment : 0;

  return (
    <div className="reports-page">
      <section className="app-card reports-hero-panel">
        <p className="dashboard-kicker">VISÃO DO MÊS</p>
        <h2 className="reports-page-title">Relatório</h2>
        <p className="reports-page-kicker">Acompanhe aulas, faltas, receita e pagamentos por aluno.</p>
        <div className="reports-hero-summary">
          <div>
            <p>Receita líquida</p>
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

      <div className="reports-insights-grid">
        <section className="reports-insight-card">
          <p>Alunos pendentes</p>
          <strong>{pendingStudents}</strong>
          <span>{pendingStudents === 0 ? "Carteira do mês em dia" : "Prioridade para cobrança"}</span>
        </section>
        <section className="reports-insight-card">
          <p>Ticket líquido médio</p>
          <strong>{formatCurrency(averageNetRevenue)}</strong>
          <span>por aluno pago no mês</span>
        </section>
      </div>

      <section className="reports-decision-panel">
        <div className="reports-decision-header">
          <div>
            <p className="dashboard-kicker">DECISOES DO PERSONAL</p>
            <h3>Relatorios de decisao</h3>
          </div>
          <div className="reports-decision-total">
            <span>Previsao semanal</span>
            <strong>{formatCurrency(forecastTotal)}</strong>
          </div>
        </div>

        <div className="reports-decision-summary">
          <section>
            <p>Receita liquida</p>
            <strong>{formatDeltaLabel(comparison.netRevenueDelta)}</strong>
            <span>{comparison.netRevenueDeltaPercentage.toFixed(0)}% de variacao</span>
          </section>
          <section>
            <p>Faltas para acompanhar</p>
            <strong>{topAbsences.length}</strong>
            <span>{topAbsences.length === 0 ? "Sem risco no mes" : "Alunos pedem acao"}</span>
          </section>
          <section>
            <p>Pacotes acabando</p>
            <strong>{packageRisks.length}</strong>
            <span>{packageRisks.length === 0 ? "Sem renovacao urgente" : "Renovar antes da proxima aula"}</span>
          </section>
        </div>

        <div className="reports-decision-grid">
          <DecisionList
            title="Quem esta devendo"
            items={pendingPaymentStudents}
            emptyText="Nenhum aluno pendente neste mes."
            renderItem={({ student, totalClasses, grossRevenue }) => (
              <div key={student.id} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>{formatCountLabel(totalClasses, "aula lancada", "aulas lancadas")}</span>
                </div>
                <strong>{formatCurrency(grossRevenue || student.packagePrice || student.pricePerClass || 0)}</strong>
              </div>
            )}
          />

          <DecisionList
            title="Quem teve muitas faltas"
            items={topAbsences}
            emptyText="Nenhum aluno com falta registrada neste mes."
            renderItem={({ student, absentClasses, totalClasses }) => (
              <div key={student.id} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>{formatCountLabel(absentClasses, "falta", "faltas")} em {formatCountLabel(totalClasses, "aula", "aulas")}</span>
                </div>
                <strong>{totalClasses > 0 ? ((absentClasses / totalClasses) * 100).toFixed(0) : 0}%</strong>
              </div>
            )}
          />

          <DecisionList
            title="Maiores receitas"
            items={topRevenue}
            emptyText="Nenhuma receita registrada neste mes."
            renderItem={({ student, netRevenue, presentClasses }) => (
              <div key={student.id} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>{formatCountLabel(presentClasses, "presenca", "presencas")}</span>
                </div>
                <strong>{formatCurrency(netRevenue)}</strong>
              </div>
            )}
          />

          <DecisionList
            title="Alunos ativos por frequencia"
            items={activeFrequency}
            emptyText="Nenhuma presenca registrada neste mes."
            renderItem={({ student, presentClasses, totalClasses }) => (
              <div key={student.id} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>{formatCountLabel(totalClasses, "aula lancada", "aulas lancadas")}</span>
                </div>
                <strong>{formatCountLabel(presentClasses, "presenca", "presencas")}</strong>
              </div>
            )}
          />

          <DecisionList
            title="Pacotes acabando"
            items={packageRisks}
            emptyText="Nenhum pacote em zona de risco."
            renderItem={({ student, remainingClasses }) => (
              <div key={student.id} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>Renovar antes de zerar o saldo</span>
                </div>
                <strong>{formatCountLabel(remainingClasses, "aula", "aulas")}</strong>
              </div>
            )}
          />

          <DecisionList
            title="Receita da semana"
            items={weeklyForecast}
            emptyText="Nenhuma cobranca prevista para os proximos 7 dias."
            renderItem={({ student, amount, dueDate, billingTypeLabel }) => (
              <div key={`${student.id}-${dueDate?.toISOString()}`} className="reports-decision-row">
                <div>
                  <p>{student.name}</p>
                  <span>{billingTypeLabel} vence em {formatDecisionDate(dueDate)}</span>
                </div>
                <strong>{formatCurrency(amount)}</strong>
              </div>
            )}
          />
        </div>
      </section>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div className="reports-metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Total de aulas</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{report.totalClasses}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.presentClasses} presentes ({report.attendanceRate.toFixed(0)}%)</p>
        </div>

        <div className="reports-metric-card reports-metric-danger" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de falta</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{report.absenceRate.toFixed(1)}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.absentClasses} faltas</p>
        </div>

        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Receita líquida</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{formatCurrency(report.netRevenue)}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{report.revenuePercentage.toFixed(0)}% após taxa da academia</p>
        </div>

        <div className="reports-metric-card" style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de pagamento</p>
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
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0", fontWeight: "600" }}>Receita bruta</p>
          <p style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "#1f2937" }}>{formatCurrency(report.grossRevenue)}</p>
        </div>
        <div>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0", fontWeight: "600" }}>Taxa da academia</p>
          <p style={{ fontSize: "18px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{formatCurrency(report.gymFees)}</p>
        </div>
      </div>

      <div className="reports-detail-card" style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px 0", color: "#1f2937" }}>Detalhamento por aluno</h3>
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
                    {formatCountLabel(totalClasses, "aula", "aulas")} ({formatCountLabel(presentClasses, "presente", "presentes")}, {formatCountLabel(absentClasses, "falta", "faltas")})
                  </p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "3px 0 0 0" }}>
                    {formatCurrency(grossRevenue)} bruto · {formatCurrency(gymFees)} taxa · {formatCurrency(netRevenue)} líquido
                  </p>
                </div>
                <span className={`reports-payment-pill ${paid ? "reports-paid" : "reports-pending"}`} style={{
                  padding: "4px 8px",
                  background: paid ? "rgba(242, 207, 124, 0.14)" : "#fee2e2",
                  color: paid ? "#F2CF7C" : "#dc2626",
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
