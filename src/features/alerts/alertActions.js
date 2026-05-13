import { formatDate, formatDateISO } from "../../lib/dates.js";

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseISODate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isSnoozed(action, today) {
  const snoozedUntil = parseISODate(action.snoozedUntil);
  if (!snoozedUntil) return false;
  return snoozedUntil >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function getDefaultSnoozeDate(today = new Date()) {
  const date = new Date(today);
  date.setDate(today.getDate() + 3);
  return formatDateISO(date);
}

export function buildAlertActionRecord({
  alertId,
  status,
  snoozedUntil = "",
  ignoredForMonth = "",
  today = new Date()
}) {
  return {
    alertId,
    status,
    snoozedUntil: status === "snoozed" ? snoozedUntil : "",
    ignoredForMonth: status === "ignored" ? (ignoredForMonth || getMonthKey(today)) : "",
    createdAt: formatDate(today),
    updatedAt: formatDate(today)
  };
}

export function filterActionableAlerts(alerts = [], actions = [], today = new Date()) {
  const actionsByAlertId = new Map(actions.map(action => [action.alertId, action]));
  const currentMonth = getMonthKey(today);

  return alerts.filter(alert => {
    const action = actionsByAlertId.get(alert.id);
    if (!action) return true;
    if (action.status === "resolved") return false;
    if (action.status === "snoozed" && isSnoozed(action, today)) return false;
    if (action.status === "ignored" && action.ignoredForMonth === currentMonth) return false;
    return true;
  });
}
