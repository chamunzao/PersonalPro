import { BILLING_TYPES, calculateAdvanceCreditStatus, calculateBillingStatus } from "../billing/billingCalculations";
import { formatDate, formatDateISO, parseBrazilianDate } from "../../lib/dates";

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = recordKey.split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function getLastPresentDate(studentId, records) {
  const presentDates = records
    .filter(record => record.status === "present" && getRecordParts(record.key).studentId === studentId)
    .map(record => parseBrazilianDate(getRecordParts(record.key).date))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a);

  return presentDates[0] || null;
}

function daysBetween(start, end) {
  const dayMs = 24 * 60 * 60 * 1000;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endDay - startDay) / dayMs);
}

function isSameMonth(paymentMonth, date) {
  return paymentMonth === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function hasPaymentForMonth(studentId, payments, date) {
  return payments.some(payment => {
    const paidStudentId = payment.studentId || payment.key?.split("_")[1];
    return paidStudentId === studentId && isSameMonth(payment.month, date);
  });
}

function buildBillingAlert(student, billingStatus, payments, today) {
  if (billingStatus.billingType === BILLING_TYPES.perClass) return null;
  const hasCurrentPayment = hasPaymentForMonth(student.id, payments, today);

  if (!hasCurrentPayment && billingStatus.daysUntilDue !== null && billingStatus.daysUntilDue < 0) {
    return {
      id: `payment-overdue-${student.id}`,
      type: "payment_overdue",
      severity: "danger",
      title: "Pagamento vencido",
      message: `${student.name} está com vencimento em atraso.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (!hasCurrentPayment && billingStatus.daysUntilDue !== null && billingStatus.daysUntilDue <= 5) {
    return {
      id: `payment-due-${student.id}`,
      type: "payment_due",
      severity: "warning",
      title: "Vencimento próximo",
      message: `${student.name} vence em ${billingStatus.daysUntilDue} dia${billingStatus.daysUntilDue === 1 ? "" : "s"}.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (billingStatus.status === "depleted") {
    return {
      id: `package-depleted-${student.id}`,
      type: "package_depleted",
      severity: "danger",
      title: "Pacote esgotado",
      message: `${student.name} já usou todas as ${billingStatus.contractedClasses} aulas contratadas.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (billingStatus.status === "low_classes") {
    return {
      id: `package-low-${student.id}`,
      type: "package_low",
      severity: "warning",
      title: "Pacote acabando",
      message: `${student.name} tem ${billingStatus.remainingClasses} aula${billingStatus.remainingClasses === 1 ? "" : "s"} restante${billingStatus.remainingClasses === 1 ? "" : "s"}.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  return null;
}

function buildAdvanceCreditAlert(student, creditStatus) {
  if (!creditStatus.hasAdvancePackage) return null;

  if (creditStatus.status === "depleted") {
    return {
      id: `credit-depleted-${student.id}`,
      type: "credit_depleted",
      severity: "danger",
      title: "Credito esgotado",
      message: `${student.name} não tem aulas pagas disponíveis.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (creditStatus.status === "expired") {
    return {
      id: `credit-expired-${student.id}`,
      type: "credit_expired",
      severity: "danger",
      title: "Pacote vencido",
      message: `${student.name} tem pacote vencido com ${creditStatus.remainingClasses} aula${creditStatus.remainingClasses === 1 ? "" : "s"} restante${creditStatus.remainingClasses === 1 ? "" : "s"}.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (creditStatus.status === "low_classes") {
    return {
      id: `credit-low-${student.id}`,
      type: "credit_low",
      severity: "warning",
      title: "Renovação próxima",
      message: `${student.name} tem ${creditStatus.remainingClasses} aula${creditStatus.remainingClasses === 1 ? "" : "s"} paga${creditStatus.remainingClasses === 1 ? "" : "s"} restante${creditStatus.remainingClasses === 1 ? "" : "s"}.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  if (creditStatus.status === "expiring") {
    return {
      id: `credit-expiring-${student.id}`,
      type: "credit_expiring",
      severity: "warning",
      title: "Pacote perto de vencer",
      message: `${student.name} tem pacote vencendo em ${creditStatus.daysUntilExpiry} dia${creditStatus.daysUntilExpiry === 1 ? "" : "s"}.`,
      studentId: student.id,
      studentName: student.name
    };
  }

  return null;
}

function buildInactivityAlert(student, records, today) {
  const lastPresentDate = getLastPresentDate(student.id, records);
  if (!lastPresentDate) return null;

  const inactiveDays = daysBetween(lastPresentDate, today);
  if (inactiveDays < 14) return null;

  return {
    id: `inactive-${student.id}`,
    type: "inactive_student",
    severity: inactiveDays >= 30 ? "danger" : "warning",
    title: "Aluno inativo",
    message: `${student.name} está há ${inactiveDays} dias sem presença registrada.`,
    studentId: student.id,
    studentName: student.name
  };
}

function buildUnmarkedClassAlerts(students, records, getClassesForDate, today) {
  const todayISO = formatDateISO(today);
  const todayText = formatDate(today);
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const classes = getClassesForDate(todayISO);

  return classes
    .filter(cls => {
      const [hour, minute] = cls.time.split(":").map(Number);
      const classMinutes = hour * 60 + minute;
      const recordKey = `${todayText}_${cls.studentId}_${cls.time}`;
      const hasRecord = records.some(record => record.key === recordKey);
      return classMinutes < currentMinutes && !hasRecord;
    })
    .map(cls => ({
      id: `unmarked-${cls.studentId}-${cls.time}`,
      type: "unmarked_class",
      severity: "info",
      title: "Aula sem registro",
      message: `${cls.studentName} teve aula às ${cls.time} hoje e ainda não foi marcada.`,
      studentId: cls.studentId,
      studentName: cls.studentName,
      classKey: `${todayText}_${cls.studentId}_${cls.time}`,
      date: todayText,
      time: cls.time
    }));
}

const severityOrder = {
  danger: 0,
  warning: 1,
  info: 2
};

export function calculateAlerts({ students, records, payments, getClassesForDate, today = new Date() }) {
  const studentAlerts = students.flatMap(student => {
    const billingStatus = calculateBillingStatus(student, records, today);
    const creditStatus = calculateAdvanceCreditStatus(student, records, payments, today);
    return [
      buildAdvanceCreditAlert(student, creditStatus),
      buildBillingAlert(student, billingStatus, payments, today),
      buildInactivityAlert(student, records, today)
    ].filter(Boolean);
  });

  const classAlerts = buildUnmarkedClassAlerts(students, records, getClassesForDate, today);

  return [...studentAlerts, ...classAlerts].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });
}
