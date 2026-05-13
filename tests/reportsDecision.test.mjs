import assert from "node:assert/strict";
import {
  calculateMonthlyReport,
  calculatePreviousMonthComparison,
  calculateWeeklyRevenueForecast,
  getActiveFrequencyStudents,
  getPendingPaymentStudents,
  getTopAbsenceStudents,
  getTopRevenueStudents,
  getUpcomingPackageRisks
} from "../src/features/reports/reportsCalculations.js";

const students = [
  {
    id: "ana",
    name: "Ana",
    pricePerClass: 100,
    billingType: "monthly_package",
    packagePrice: 600,
    billingDueDate: "2026-05-15",
    billingCycleStart: "2026-05-01",
    billingAutoRenew: true
  },
  {
    id: "bruno",
    name: "Bruno",
    pricePerClass: 80,
    billingType: "package",
    packageClasses: 4,
    packagePrice: 320,
    billingDueDate: "2026-05-20"
  },
  {
    id: "carla",
    name: "Carla",
    pricePerClass: 90,
    billingType: "monthly",
    packagePrice: 540,
    billingDueDate: "2026-05-18",
    billingCycleStart: "2026-05-01",
    billingAutoRenew: true
  }
];

const records = [
  { key: "04/04/2026_ana_07:00", status: "present", customPrice: 100 },
  { key: "05/05/2026_ana_07:00", status: "present", customPrice: 100 },
  { key: "07/05/2026_ana_07:00", status: "absent", customPrice: 100 },
  { key: "01/05/2026_bruno_08:00", status: "present", customPrice: 80 },
  { key: "03/05/2026_bruno_08:00", status: "present", customPrice: 80 },
  { key: "05/05/2026_bruno_08:00", status: "present", customPrice: 80 },
  { key: "07/05/2026_bruno_08:00", status: "absent", customPrice: 80 },
  { key: "09/05/2026_carla_09:00", status: "absent", customPrice: 90 },
  { key: "11/05/2026_carla_09:00", status: "absent", customPrice: 90 }
];

const payments = [
  { key: "2026-04_ana", paid: true, month: "2026-04", studentId: "ana", amountPaid: 600 },
  {
    key: "package-bruno",
    paid: true,
    type: "package",
    month: "2026-05",
    studentId: "bruno",
    amountPaid: 320,
    classesPurchased: 4,
    dateISO: "2026-05-01",
    validUntil: "2026-05-31"
  }
];

const report = calculateMonthlyReport({ students, records, payments, monthKey: "2026-05" });

const comparison = calculatePreviousMonthComparison({ students, records, payments, monthKey: "2026-05" });
assert.equal(comparison.current.monthKey, "2026-05", "comparison keeps selected month");
assert.equal(comparison.previous.monthKey, "2026-04", "comparison calculates previous month key");
assert.equal(comparison.netRevenueDelta, comparison.current.netRevenue - comparison.previous.netRevenue, "comparison exposes net revenue delta");
assert.ok(comparison.netRevenueDelta > 0, "current month should outperform previous month in fixture");

assert.deepEqual(
  getPendingPaymentStudents(report, 3).map(item => item.student.id),
  ["ana", "carla"],
  "pending payment report lists unpaid students for the selected month"
);

assert.deepEqual(
  getTopAbsenceStudents(report, 2).map(item => [item.student.id, item.absentClasses]),
  [["carla", 2], ["ana", 1]],
  "absence ranking orders students by missing classes and ignores zero-absence students"
);

assert.deepEqual(
  getTopRevenueStudents(report, 2).map(item => item.student.id),
  ["bruno", "ana"],
  "revenue ranking orders students by net revenue"
);

assert.deepEqual(
  getActiveFrequencyStudents(report, 2).map(item => [item.student.id, item.presentClasses]),
  [["bruno", 3], ["ana", 1]],
  "active frequency report ranks students by completed classes"
);

assert.deepEqual(
  getUpcomingPackageRisks({ students, records, payments, asOf: new Date(2026, 4, 13), limit: 3 }).map(item => [item.student.id, item.remainingClasses]),
  [["bruno", 1]],
  "package risks include students with low remaining classes"
);

assert.deepEqual(
  calculateWeeklyRevenueForecast({ students, records, payments, fromDate: new Date(2026, 4, 13) }).map(item => [item.student.id, item.amount]),
  [["ana", 600], ["carla", 540]],
  "weekly revenue forecast includes unpaid plans due in the next seven days"
);
