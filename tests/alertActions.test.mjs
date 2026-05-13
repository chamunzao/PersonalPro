import assert from "node:assert/strict";
import {
  buildAlertActionRecord,
  filterActionableAlerts,
  getDefaultSnoozeDate
} from "../src/features/alerts/alertActions.js";

const alerts = [
  { id: "payment-due-student-1", title: "Vencimento proximo" },
  { id: "package-low-student-2", title: "Pacote acabando" },
  { id: "unmarked-student-3-08:00", title: "Aula sem registro" }
];

const actions = [
  { alertId: "payment-due-student-1", status: "resolved" },
  { alertId: "package-low-student-2", status: "snoozed", snoozedUntil: "2026-05-15" },
  { alertId: "unmarked-student-3-08:00", status: "ignored", ignoredForMonth: "2026-05" }
];

assert.deepEqual(
  filterActionableAlerts(alerts, actions, new Date(2026, 4, 13)).map(alert => alert.id),
  [],
  "resolved, currently snoozed and ignored-for-month alerts should be hidden"
);

assert.deepEqual(
  filterActionableAlerts(alerts, actions, new Date(2026, 4, 16)).map(alert => alert.id),
  ["package-low-student-2"],
  "snoozed alert should return after snooze date"
);

assert.deepEqual(
  buildAlertActionRecord({
    alertId: "payment-due-student-1",
    status: "snoozed",
    snoozedUntil: "2026-05-16",
    today: new Date(2026, 4, 13)
  }),
  {
    alertId: "payment-due-student-1",
    status: "snoozed",
    snoozedUntil: "2026-05-16",
    ignoredForMonth: "",
    createdAt: "13/05/2026",
    updatedAt: "13/05/2026"
  },
  "action record should persist only the user decision"
);

assert.equal(
  getDefaultSnoozeDate(new Date(2026, 4, 13)),
  "2026-05-16",
  "default snooze date should be three days ahead"
);
