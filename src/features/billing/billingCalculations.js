import { parseBrazilianDate } from "../../lib/dates";

export const BILLING_TYPES = {
  perClass: "per_class",
  package: "package",
  monthly: "monthly"
};

export function getBillingTypeLabel(type) {
  if (type === BILLING_TYPES.package) return "Pacote";
  if (type === BILLING_TYPES.monthly) return "Mensalidade";
  return "Por aula";
}

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = recordKey.split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function parseISODate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(start, end) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((startOfDay(end) - startOfDay(start)) / dayMs);
}

function getDateInMonth(sourceDate, year, month) {
  const day = sourceDate.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function getMonthlyCycleDate(sourceDate, asOf) {
  const currentMonthDate = getDateInMonth(sourceDate, asOf.getFullYear(), asOf.getMonth());
  if (currentMonthDate <= asOf) return currentMonthDate;
  return getDateInMonth(sourceDate, asOf.getFullYear(), asOf.getMonth() - 1);
}

function countPresentClasses(studentId, records, cycleStartDate) {
  return records.filter(record => {
    if (record.status !== "present") return false;

    const { date, studentId: recordStudentId } = getRecordParts(record.key);
    if (recordStudentId !== studentId) return false;
    if (!cycleStartDate) return true;

    return parseBrazilianDate(date) >= cycleStartDate;
  }).length;
}

export function calculateBillingStatus(student, records, asOf = new Date()) {
  const billingType = student.billingType || BILLING_TYPES.perClass;
  const storedCycleStartDate = parseISODate(student.billingCycleStart);
  const storedDueDate = parseISODate(student.billingDueDate);
  const cycleStartDate = billingType === BILLING_TYPES.monthly && student.billingAutoRenew !== false && storedCycleStartDate
    ? getMonthlyCycleDate(storedCycleStartDate, asOf)
    : storedCycleStartDate;
  const dueDate = billingType === BILLING_TYPES.monthly && student.billingAutoRenew !== false && storedDueDate
    ? getDateInMonth(storedDueDate, asOf.getFullYear(), asOf.getMonth())
    : storedDueDate;
  const contractedClasses = Number(student.packageClasses) || 0;
  const planValue = Number(student.packagePrice) || 0;
  const usedClasses = countPresentClasses(student.id, records, cycleStartDate);
  const remainingClasses = contractedClasses > 0 ? Math.max(contractedClasses - usedClasses, 0) : null;
  const daysUntilDue = dueDate ? daysBetween(asOf, dueDate) : null;

  let status = "ok";
  if (dueDate && daysUntilDue < 0) status = "overdue";
  else if (billingType !== BILLING_TYPES.perClass && remainingClasses === 0 && contractedClasses > 0) status = "depleted";
  else if (dueDate && daysUntilDue <= 5) status = "due_soon";
  else if (billingType !== BILLING_TYPES.perClass && remainingClasses !== null && remainingClasses <= 2) status = "low_classes";

  return {
    billingType,
    billingTypeLabel: getBillingTypeLabel(billingType),
    cycleStartDate,
    dueDate,
    contractedClasses,
    planValue,
    usedClasses,
    remainingClasses,
    daysUntilDue,
    status
  };
}

export function getBillingStatusLabel(status) {
  if (status.status === "overdue") return "Vencido";
  if (status.status === "depleted") return "Pacote esgotado";
  if (status.status === "due_soon") return `Vence em ${status.daysUntilDue} dia${status.daysUntilDue === 1 ? "" : "s"}`;
  if (status.status === "low_classes") return "Poucas aulas";
  return "Em dia";
}

export function getBillingStatusColors(status) {
  if (status.status === "overdue" || status.status === "depleted") {
    return { background: "#fee2e2", color: "#dc2626" };
  }
  if (status.status === "due_soon" || status.status === "low_classes") {
    return { background: "#fef3c7", color: "#d97706" };
  }
  return { background: "#d1fae5", color: "#059669" };
}
