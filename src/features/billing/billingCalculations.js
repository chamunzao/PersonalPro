import { parseBrazilianDate } from "../../lib/dates.js";

export const BILLING_TYPES = {
  perClass: "per_class",
  package: "package",
  monthlyPackage: "monthly_package",
  monthly: "monthly"
};

export function getBillingTypeLabel(type) {
  if (type === BILLING_TYPES.package) return "Pacote";
  if (type === BILLING_TYPES.monthlyPackage) return "Pacote mensal";
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

function getPaymentStudentId(payment) {
  return payment.studentId || payment.key?.split("_").slice(1).join("_");
}

function parsePaymentDate(payment) {
  if (payment.dateISO) return parseISODate(payment.dateISO);
  if (payment.date) return parseBrazilianDate(payment.date);
  return null;
}

function isAdvancePackagePayment(payment) {
  return payment.paid && (payment.type === "package" || Number(payment.classesPurchased) > 0);
}

function getPresentRecordsForStudent(studentId, records) {
  return records
    .filter(record => record.status === "present" && getRecordParts(record.key).studentId === studentId)
    .map(record => ({
      ...record,
      classDate: parseBrazilianDate(getRecordParts(record.key).date)
    }))
    .filter(record => !Number.isNaN(record.classDate.getTime()))
    .sort((a, b) => a.classDate - b.classDate);
}

export function calculateAdvanceCreditStatus(student, records, payments, asOf = new Date()) {
  const packagePayments = payments
    .filter(payment => getPaymentStudentId(payment) === student.id && isAdvancePackagePayment(payment))
    .map(payment => ({
      ...payment,
      classesPurchased: Number(payment.classesPurchased) || 0,
      paidAt: parsePaymentDate(payment)
    }))
    .filter(payment => payment.classesPurchased > 0)
    .sort((a, b) => {
      const dateA = a.paidAt || new Date(0);
      const dateB = b.paidAt || new Date(0);
      return dateA - dateB;
    });

  if (packagePayments.length === 0) {
    return {
      hasAdvancePackage: false,
      totalPurchased: 0,
      usedClasses: 0,
      remainingClasses: null,
      latestPayment: null,
      status: "none",
      expiresAt: null,
      daysUntilExpiry: null
    };
  }

  const firstPaymentDate = packagePayments[0].paidAt || new Date(0);
  const presentRecords = getPresentRecordsForStudent(student.id, records)
    .filter(record => record.classDate >= firstPaymentDate);
  const totalPurchased = packagePayments.reduce((sum, payment) => sum + payment.classesPurchased, 0);
  const usedClasses = presentRecords.length;
  const remainingClasses = Math.max(totalPurchased - usedClasses, 0);
  const latestPayment = packagePayments[packagePayments.length - 1];
  const expiresAt = parseISODate(latestPayment.validUntil) || null;
  const daysUntilExpiry = expiresAt ? daysBetween(asOf, expiresAt) : null;

  let status = "ok";
  if (remainingClasses === 0) status = "depleted";
  else if (expiresAt && daysUntilExpiry < 0) status = "expired";
  else if (remainingClasses <= 2) status = "low_classes";
  else if (expiresAt && daysUntilExpiry <= 5) status = "expiring";

  return {
    hasAdvancePackage: true,
    totalPurchased,
    usedClasses,
    remainingClasses,
    latestPayment,
    status,
    expiresAt,
    daysUntilExpiry
  };
}

export function getAdvanceCreditStatusLabel(creditStatus) {
  if (!creditStatus.hasAdvancePackage) return "Sem pacote";
  if (creditStatus.status === "depleted") return "Pacote esgotado";
  if (creditStatus.status === "expired") return "Pacote vencido";
  if (creditStatus.status === "low_classes") return "Poucas aulas";
  if (creditStatus.status === "expiring") return `Vence em ${creditStatus.daysUntilExpiry} dia${creditStatus.daysUntilExpiry === 1 ? "" : "s"}`;
  return "Credito ativo";
}

export function getAdvanceCreditStatusColors(creditStatus) {
  if (creditStatus.status === "depleted" || creditStatus.status === "expired") {
    return { background: "#fee2e2", color: "#dc2626" };
  }
  if (creditStatus.status === "low_classes" || creditStatus.status === "expiring") {
    return { background: "#fef3c7", color: "#d97706" };
  }
  if (creditStatus.hasAdvancePackage) {
    return { background: "rgba(242, 207, 124, 0.14)", color: "#F2CF7C" };
  }
  return { background: "#f3f4f6", color: "#6b7280" };
}

export function calculateBillingStatus(student, records, asOf = new Date()) {
  const billingType = student.billingType || BILLING_TYPES.perClass;
  const storedCycleStartDate = parseISODate(student.billingCycleStart);
  const storedDueDate = parseISODate(student.billingDueDate);
  const renewsMonthly = (billingType === BILLING_TYPES.monthly || billingType === BILLING_TYPES.monthlyPackage) && student.billingAutoRenew !== false;
  const cycleStartDate = renewsMonthly && storedCycleStartDate
    ? getMonthlyCycleDate(storedCycleStartDate, asOf)
    : storedCycleStartDate;
  const dueDate = renewsMonthly && storedDueDate
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
  return { background: "rgba(242, 207, 124, 0.14)", color: "#F2CF7C" };
}
