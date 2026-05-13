import assert from "node:assert/strict";
import {
  buildSessionStudentSummary,
  getStudentRiskTags,
  getLastStudentSessionRecord
} from "../src/features/session/sessionStudentSummary.js";

const student = {
  id: "student-1",
  name: "Mariana Silva",
  billingType: "package",
  packageClasses: 8,
  packagePrice: 640,
  billingCycleStart: "2026-05-01",
  billingDueDate: "2026-05-10"
};

const records = [
  {
    key: "08/05/2026_student-1_08:00",
    status: "present",
    sessionNote: "Aumentou carga no leg press."
  },
  {
    key: "12/05/2026_student-1_08:00",
    status: "present",
    sessionNote: "Sentiu desconforto no ombro."
  },
  {
    key: "12/05/2026_other_09:00",
    status: "present",
    sessionNote: "Registro de outro aluno."
  }
];

const payments = [
  {
    key: "pkg-1",
    studentId: "student-1",
    paid: true,
    type: "package",
    classesPurchased: 3,
    dateISO: "2026-05-01",
    validUntil: "2026-05-30"
  }
];

const anamnesis = {
  goal: "Hipertrofia",
  injuries: "Dor no ombro direito",
  restrictions: "Evitar desenvolvimento pesado",
  conditions: "",
  medications: "",
  availability: "Segunda e quarta"
};

assert.deepEqual(
  getStudentRiskTags(anamnesis).map(item => item.label),
  ["Lesao registrada", "Restricao de treino", "Disponibilidade mapeada"],
  "risk tags should summarize the relevant anamnesis points for in-person class"
);

assert.equal(
  getLastStudentSessionRecord("student-1", records, new Date(2026, 4, 13)).sessionNote,
  "Sentiu desconforto no ombro.",
  "last session should be the latest record for the selected student before the class date"
);

const summary = buildSessionStudentSummary({
  student,
  records,
  payments,
  anamnesis,
  activeWorkout: { name: "Hipertrofia A/B" },
  selectedDate: new Date(2026, 4, 13)
});

assert.equal(summary.firstName, "Mariana", "summary should expose the student first name");
assert.equal(summary.activeWorkoutName, "Hipertrofia A/B", "summary should expose active workout name");
assert.equal(summary.lastSessionNote, "Sentiu desconforto no ombro.", "summary should expose last session note");
assert.equal(summary.financialSeverity, "warning", "summary should warn when package classes are low");
assert.equal(summary.primaryAlert.label, "Lesao registrada", "risk should be the primary alert before generic information");
