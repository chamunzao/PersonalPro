import assert from "node:assert/strict";
import {
  buildAbsenceReplacementMessage,
  buildCommunicationMessages,
  buildInactiveStudentMessage,
  buildNextClassConfirmationMessage,
  buildPackageEndingMessage,
  buildPaymentReminderMessage,
  buildPostClassMessage,
  buildWeeklyConfirmationMessage
} from "../src/features/communication/messageTemplates.js";

const student = {
  id: "ana",
  name: "Ana Beatriz",
  pricePerClass: 90,
  billingType: "package",
  packageClasses: 8,
  packagePrice: 720,
  billingDueDate: "2026-05-20",
  schedule: [
    { day: 0, time: "07:00" },
    { day: 2, time: "08:00" }
  ]
};

const records = [
  { key: "01/05/2026_ana_07:00", status: "present" },
  { key: "03/05/2026_ana_07:00", status: "present" },
  { key: "07/05/2026_ana_08:00", status: "absent" }
];

const packagePayments = [
  {
    key: "package-ana",
    paid: true,
    type: "package",
    studentId: "ana",
    month: "2026-05",
    classesPurchased: 3,
    amountPaid: 270,
    dateISO: "2026-05-01",
    validUntil: "2026-05-31"
  }
];

assert.match(
  buildWeeklyConfirmationMessage({ student }),
  /Ana[\s\S]*Segunda: 07:00[\s\S]*Quarta: 08:00/,
  "weekly confirmation uses first name and real fixed schedule"
);

assert.match(
  buildPaymentReminderMessage({ student, records, payments: [], asOf: new Date(2026, 4, 13) }),
  /Ana[\s\S]*R\$\s?720,00/,
  "payment reminder uses first name and expected plan value"
);

assert.match(
  buildPackageEndingMessage({ student, records, payments: packagePayments, asOf: new Date(2026, 4, 13) }),
  /Ana[\s\S]*1 aula/,
  "package ending message uses the remaining package balance"
);

assert.match(
  buildPostClassMessage({ student, classDateText: "13/05/2026", focus: "mobilidade de quadril" }),
  /Ana[\s\S]*13\/05\/2026[\s\S]*mobilidade de quadril/,
  "post-class message includes class date and focus when available"
);

assert.match(
  buildAbsenceReplacementMessage({ student, missedDateText: "12/05/2026", replacementDateText: "14/05/2026", replacementTime: "07:30" }),
  /Ana[\s\S]*12\/05\/2026[\s\S]*14\/05\/2026[\s\S]*07:30/,
  "absence replacement message includes absence and replacement details"
);

assert.match(
  buildNextClassConfirmationMessage({ student, nextClass: { dateText: "15/05/2026", time: "08:00" } }),
  /Ana[\s\S]*15\/05\/2026[\s\S]*08:00/,
  "next class confirmation uses next class date and time"
);

assert.match(
  buildInactiveStudentMessage({ student }),
  /Ana[\s\S]*retomar/,
  "inactive student message invites the student to resume"
);

const fallbackMessages = buildCommunicationMessages({
  student: { id: "empty", name: "", schedule: [] },
  records: [],
  payments: [],
  asOf: new Date(2026, 4, 13)
});

const scheduledMessages = buildCommunicationMessages({
  student,
  records,
  payments: packagePayments,
  asOf: new Date(2026, 4, 13)
});

assert.match(
  scheduledMessages.nextClassConfirmation,
  /13\/05\/2026[\s\S]*08:00/,
  "next class confirmation should use the next fixed class when schedule is available"
);

assert.ok(
  Object.values(fallbackMessages).every(message => typeof message === "string" && message.length > 0),
  "all communication messages should be safe when optional student data is missing"
);
