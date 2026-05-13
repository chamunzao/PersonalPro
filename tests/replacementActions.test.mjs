import assert from "node:assert/strict";
import {
  buildAbsenceReplacementMessage,
  buildReplacementOverride,
  getAvailableReplacementDefaults
} from "../src/features/schedule/replacementActions.js";

const replacement = buildReplacementOverride({
  dateISO: "2026-05-20",
  studentId: "student-1",
  existingItems: [{ time: "09:00", type: "fixed", note: "" }],
  replacementTime: "08:00",
  note: "Reposicao da falta de 13/05",
  pricePerClass: 90,
  locationId: "studio-1"
});

assert.equal(
  replacement.overrideId,
  "2026-05-20_student-1",
  "replacement override id should target the selected date and student"
);
assert.deepEqual(
  replacement.payload.times,
  ["08:00", "09:00"],
  "replacement should keep existing schedule items and sort times"
);
assert.equal(
  replacement.payload.items[0].type,
  "replacement",
  "replacement item should be marked with the replacement type"
);

assert.equal(
  buildAbsenceReplacementMessage({
    studentName: "Mariana Silva",
    missedDate: "13/05/2026",
    missedTime: "08:00",
    replacementDate: "20/05/2026",
    replacementTime: "08:00",
    reason: "imprevisto"
  }),
  "Oi, Mariana! Registrei sua falta do dia 13/05/2026 as 08:00 por imprevisto. Podemos repor em 20/05/2026 as 08:00. Se precisar ajustar, me chama por aqui.",
  "absence message should include missed class and replacement details"
);

assert.deepEqual(
  getAvailableReplacementDefaults(new Date(2026, 4, 13), "08:00"),
  { dateISO: "2026-05-20", time: "08:00" },
  "default replacement should suggest the same time one week later"
);
