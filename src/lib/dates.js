export function jsDayToIndex(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getDayOfWeek(year, month, day) {
  return new Date(year, month, day).getDay();
}

export function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function formatDateISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseBrazilianDate(dateText) {
  const [day, month, year] = dateText.split("/").map(Number);
  return new Date(year, month - 1, day);
}
