import assert from "node:assert/strict";
import {
  getActiveWorkoutPlan,
  getLastStudentRecord,
  getNextStudentClass,
  getStudentMonthAttendance,
  getStudentProfileRiskTags
} from "../src/features/students/studentProfileSummary.js";

const student = {
  id: "student-1",
  name: "Mariana Silva",
  schedule: [
    { day: 0, time: "08:00" },
    { day: 2, time: "09:00" }
  ]
};

const records = [
  { key: "02/05/2026_student-1_08:00", status: "present", sessionNote: "Boa execucao." },
  { key: "09/05/2026_student-1_08:00", status: "absent", sessionNote: "" },
  { key: "12/05/2026_student-1_09:00", status: "present", sessionNote: "Subiu carga." },
  { key: "12/05/2026_other_09:00", status: "present", sessionNote: "Outro aluno." }
];

assert.deepEqual(
  getStudentMonthAttendance("student-1", records, new Date(2026, 4, 13)),
  { present: 2, absent: 1, total: 3, rate: 67 },
  "attendance summary should count only the selected student in the current month"
);

assert.equal(
  getLastStudentRecord("student-1", records).sessionNote,
  "Subiu carga.",
  "last record should be the latest class for the selected student"
);

assert.deepEqual(
  getStudentProfileRiskTags({
    injuries: "Dor no joelho",
    restrictions: "Evitar impacto",
    availability: "Segunda e quarta"
  }).map(tag => tag.label),
  ["Lesao registrada", "Restricao de treino", "Disponibilidade mapeada"],
  "risk tags should summarize relevant anamnesis points"
);

assert.equal(
  getActiveWorkoutPlan([
    { id: "old", name: "Treino antigo", active: false },
    { id: "active", name: "Treino atual", active: true }
  ]).id,
  "active",
  "active workout should be preferred"
);

assert.equal(
  getActiveWorkoutPlan([{ id: "first", name: "Treino A" }]).id,
  "first",
  "first workout should be used when none is active"
);

assert.deepEqual(
  getNextStudentClass(student, new Date(2026, 4, 13, 10, 0)),
  { date: "18/05/2026", time: "08:00", dayLabel: "Segunda" },
  "next class should return the next future scheduled slot"
);

assert.equal(
  getNextStudentClass({ id: "student-2", schedule: [] }, new Date(2026, 4, 13)),
  null,
  "student without future schedule should return null"
);
