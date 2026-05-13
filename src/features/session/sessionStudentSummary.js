import {
  calculateAdvanceCreditStatus,
  calculateBillingStatus,
  getAdvanceCreditStatusLabel,
  getBillingStatusLabel
} from "../billing/billingCalculations.js";
import { parseBrazilianDate } from "../../lib/dates.js";

function getFirstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = String(recordKey || "").split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function parseRecordDate(record) {
  const { date } = getRecordParts(record.key);
  const parsed = parseBrazilianDate(date || "");
  return isValidDate(parsed) ? parsed : null;
}

function getFinancialSeverity({ billingStatus, creditStatus }) {
  if (creditStatus?.hasAdvancePackage) {
    if (creditStatus.status === "depleted" || creditStatus.status === "expired") return "danger";
    if (creditStatus.status === "low_classes" || creditStatus.status === "expiring") return "warning";
    return "ok";
  }

  if (billingStatus?.status === "overdue" || billingStatus?.status === "depleted") {
    return "danger";
  }
  if (billingStatus?.status === "due_soon" || billingStatus?.status === "low_classes") {
    return "warning";
  }
  return "ok";
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

export function getStudentRiskTags(anamnesis = {}) {
  const tags = [];

  if (hasText(anamnesis.injuries)) {
    tags.push({ key: "injuries", label: "Lesao registrada", detail: anamnesis.injuries });
  }
  if (hasText(anamnesis.restrictions)) {
    tags.push({ key: "restrictions", label: "Restricao de treino", detail: anamnesis.restrictions });
  }
  if (hasText(anamnesis.conditions)) {
    tags.push({ key: "conditions", label: "Condicao de saude", detail: anamnesis.conditions });
  }
  if (hasText(anamnesis.medications)) {
    tags.push({ key: "medications", label: "Uso de medicamento", detail: anamnesis.medications });
  }
  if (hasText(anamnesis.availability)) {
    tags.push({ key: "availability", label: "Disponibilidade mapeada", detail: anamnesis.availability });
  }

  return tags;
}

export function getLastStudentSessionRecord(studentId, records = [], selectedDate = new Date()) {
  const selected = isValidDate(selectedDate) ? selectedDate : new Date();

  return records
    .filter(record => {
      const parts = getRecordParts(record.key);
      if (parts.studentId !== studentId) return false;

      const recordDate = parseRecordDate(record);
      if (!recordDate) return false;

      return recordDate <= selected;
    })
    .sort((a, b) => {
      const dateA = parseRecordDate(a);
      const dateB = parseRecordDate(b);
      const dateDiff = dateB - dateA;
      if (dateDiff !== 0) return dateDiff;

      return getRecordParts(b.key).time.localeCompare(getRecordParts(a.key).time);
    })[0] || null;
}

export function buildSessionStudentSummary({
  student,
  records = [],
  payments = [],
  anamnesis = {},
  activeWorkout = null,
  selectedDate = new Date()
}) {
  if (!student) {
    return {
      studentName: "",
      firstName: "",
      financialLabel: "Sem aluno",
      financialSeverity: "ok",
      riskTags: [],
      lastSessionNote: "",
      activeWorkoutName: "",
      primaryAlert: null
    };
  }

  const billingStatus = calculateBillingStatus(student, records, selectedDate);
  const creditStatus = calculateAdvanceCreditStatus(student, records, payments, selectedDate);
  const riskTags = getStudentRiskTags(anamnesis);
  const lastRecord = getLastStudentSessionRecord(student.id, records, selectedDate);
  const financialSeverity = getFinancialSeverity({ billingStatus, creditStatus });
  const financialLabel = creditStatus.hasAdvancePackage
    ? `${getAdvanceCreditStatusLabel(creditStatus)}${creditStatus.remainingClasses !== null ? ` - ${creditStatus.remainingClasses} restantes` : ""}`
    : `${billingStatus.billingTypeLabel} - ${getBillingStatusLabel(billingStatus)}`;

  const primaryAlert = riskTags[0]
    || (financialSeverity !== "ok" ? { key: "financial", label: financialLabel, detail: "" } : null)
    || (!activeWorkout ? { key: "workout", label: "Sem treino ativo", detail: "" } : null);

  return {
    studentName: student.name || "",
    firstName: getFirstName(student.name),
    financialLabel,
    financialSeverity,
    riskTags,
    lastSessionNote: lastRecord?.sessionNote || "",
    activeWorkoutName: activeWorkout?.name || "",
    primaryAlert
  };
}
