const priority = {
  overdue: 0,
  pending: 1,
  paid: 2
};

export function sortPaymentItemsByAction(items) {
  return [...items].sort((a, b) => {
    const priorityA = priority[a.paymentState] ?? 3;
    const priorityB = priority[b.paymentState] ?? 3;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return String(a.student?.name || "").localeCompare(String(b.student?.name || ""));
  });
}

export function filterPaymentItems(items, activeFilter) {
  const sortedItems = sortPaymentItemsByAction(items);
  if (activeFilter === "all") return sortedItems;
  return sortedItems.filter(item => item.paymentState === activeFilter);
}

export function getPaymentFilterCounts(items) {
  return items.reduce((acc, item) => {
    acc.all += 1;
    if (item.paymentState in acc) acc[item.paymentState] += 1;
    return acc;
  }, { all: 0, pending: 0, overdue: 0, paid: 0 });
}

export function getPaymentReferenceDate(selectedYear, selectedMonth, now = new Date()) {
  const selectedTime = selectedYear * 12 + selectedMonth;
  const currentTime = now.getFullYear() * 12 + now.getMonth();

  if (selectedTime === currentTime) return now;
  if (selectedTime < currentTime) return new Date(selectedYear, selectedMonth + 1, 0);
  return new Date(selectedYear, selectedMonth, 1);
}

export function isPaymentDetailsExpanded(expandedKeys, paymentKey) {
  return expandedKeys.has(paymentKey);
}

export function getPaymentDetailsLabel(isExpanded) {
  return isExpanded ? "Ocultar detalhes" : "Ver detalhes";
}
