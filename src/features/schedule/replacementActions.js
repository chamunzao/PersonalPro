function formatDateISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

function buildScheduleOverridePayload(items) {
  const sortedItems = [...items].sort((a, b) => a.time.localeCompare(b.time));
  return {
    times: sortedItems.map(item => item.time),
    items: sortedItems.map(item => ({
      time: item.time,
      type: item.type || "extra",
      note: item.note || "",
      pricePerClass: item.pricePerClass ?? null,
      locationId: item.locationId || ""
    }))
  };
}

export function getAvailableReplacementDefaults(sourceDate = new Date(), sourceTime = "") {
  const targetDate = new Date(sourceDate);
  targetDate.setDate(sourceDate.getDate() + 7);

  return {
    dateISO: formatDateISO(targetDate),
    time: sourceTime || "08:00"
  };
}

export function buildReplacementOverride({
  dateISO,
  studentId,
  existingItems = [],
  replacementTime,
  note = "",
  pricePerClass = null,
  locationId = ""
}) {
  const nextItems = [
    ...existingItems,
    {
      time: replacementTime,
      type: "replacement",
      note: cleanText(note),
      pricePerClass,
      locationId
    }
  ];

  return {
    overrideId: `${dateISO}_${studentId}`,
    payload: buildScheduleOverridePayload(nextItems)
  };
}

export function buildAbsenceReplacementMessage({
  studentName,
  missedDate,
  missedTime,
  replacementDate,
  replacementTime,
  reason = ""
}) {
  const firstName = cleanText(studentName).split(/\s+/)[0] || "tudo bem";
  const reasonText = cleanText(reason) ? ` por ${cleanText(reason)}` : "";
  const replacementText = replacementDate && replacementTime
    ? ` Podemos repor em ${replacementDate} as ${replacementTime}.`
    : " Me chama por aqui para combinarmos a reposicao.";

  return `Oi, ${firstName}! Registrei sua falta do dia ${missedDate} as ${missedTime}${reasonText}.${replacementText} Se precisar ajustar, me chama por aqui.`;
}
