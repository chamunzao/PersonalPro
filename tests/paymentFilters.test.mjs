import assert from "node:assert/strict";
import {
  filterPaymentItems,
  getPaymentDetailsLabel,
  getPaymentReferenceDate,
  getPaymentFilterCounts,
  isPaymentDetailsExpanded,
  sortPaymentItemsByAction
} from "../src/features/payments/paymentFilters.js";

const items = [
  { student: { id: "paid" }, paymentState: "paid" },
  { student: { id: "pending" }, paymentState: "pending" },
  { student: { id: "overdue" }, paymentState: "overdue" },
  { student: { id: "second-pending" }, paymentState: "pending" }
];

assert.deepEqual(
  sortPaymentItemsByAction(items).map(item => item.student.id),
  ["overdue", "pending", "second-pending", "paid"],
  "action sorting puts overdue and pending students before paid students"
);

assert.deepEqual(
  filterPaymentItems(items, "pending").map(item => item.student.id),
  ["pending", "second-pending"],
  "pending filter excludes overdue and paid students"
);

assert.deepEqual(
  filterPaymentItems(items, "overdue").map(item => item.student.id),
  ["overdue"],
  "overdue filter shows only overdue students"
);

assert.deepEqual(
  filterPaymentItems(items, "paid").map(item => item.student.id),
  ["paid"],
  "paid filter shows only paid students"
);

assert.deepEqual(
  getPaymentFilterCounts(items),
  { all: 4, pending: 2, overdue: 1, paid: 1 },
  "filter counts summarize each payment state"
);

const now = new Date(2026, 4, 11);

assert.equal(
  getPaymentReferenceDate(2026, 4, now).toISOString(),
  now.toISOString(),
  "current selected month uses today as payment reference"
);

assert.equal(
  getPaymentReferenceDate(2026, 3, now).toISOString(),
  new Date(2026, 3, 30).toISOString(),
  "past selected month uses the last day of that month"
);

assert.equal(
  getPaymentReferenceDate(2026, 5, now).toISOString(),
  new Date(2026, 5, 1).toISOString(),
  "future selected month uses the first day of that month"
);

assert.equal(isPaymentDetailsExpanded(new Set(), "2026-05_demo"), false, "payment details start collapsed");
assert.equal(isPaymentDetailsExpanded(new Set(["2026-05_demo"]), "2026-05_demo"), true, "expanded payment details are detected by key");
assert.equal(getPaymentDetailsLabel(false), "Ver detalhes", "collapsed details invite expansion");
assert.equal(getPaymentDetailsLabel(true), "Ocultar detalhes", "expanded details can be hidden again");
