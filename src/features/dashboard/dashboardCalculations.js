import { calculateAlerts } from "../alerts/alertsCalculations";
import { calculateMonthlyReport } from "../reports/reportsCalculations";
import { formatDate, formatDateISO } from "../../lib/dates";

function getAttendanceForClass(cls, records, dateText) {
  const key = `${dateText}_${cls.studentId}_${cls.time}`;
  return records.find(record => record.key === key)?.status || null;
}

export function calculateDashboard({ students, records, payments, getClassesForDate, today = new Date() }) {
  const todayISO = formatDateISO(today);
  const todayText = formatDate(today);
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const todayClasses = getClassesForDate(todayISO).map(cls => ({
    ...cls,
    attendance: getAttendanceForClass(cls, records, todayText)
  }));
  const pendingTodayClasses = todayClasses.filter(cls => !cls.attendance);
  const alerts = calculateAlerts({ students, records, payments, getClassesForDate, today });
  const report = calculateMonthlyReport({ students, records, payments, monthKey });
  const criticalAlerts = alerts.filter(alert => alert.severity === "danger");
  const warningAlerts = alerts.filter(alert => alert.severity === "warning");
  const infoAlerts = alerts.filter(alert => alert.severity === "info");

  return {
    todayClasses,
    pendingTodayClasses,
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    report,
    activeStudents: students.length,
    pendingPayments: Math.max(report.totalStudents - report.studentsWithPayment, 0),
    nextClasses: todayClasses
      .filter(cls => !cls.attendance)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 5),
    priorityAlerts: alerts.slice(0, 5)
  };
}
