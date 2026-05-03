import { jsDayToIndex } from "../../lib/dates";

export const SCHEDULE_ITEM_TYPES = {
  fixed: "fixed",
  extra: "extra",
  replacement: "replacement",
  rescheduled: "rescheduled"
};

export function getScheduleItemTypeLabel(type) {
  if (type === SCHEDULE_ITEM_TYPES.extra) return "Avulsa";
  if (type === SCHEDULE_ITEM_TYPES.replacement) return "Reposição";
  if (type === SCHEDULE_ITEM_TYPES.rescheduled) return "Remarcada";
  return "Fixa";
}

export function getScheduleOverrideId(dateISO, studentId) {
  return `${dateISO}_${studentId}`;
}

export function getBaseScheduleItemsForStudent(dateISO, student) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayIndex = jsDayToIndex(dateObj.getDay());

  return (student.schedule || [])
    .filter(scheduleItem => scheduleItem.day === dayIndex)
    .map(scheduleItem => ({
      time: scheduleItem.time,
      type: SCHEDULE_ITEM_TYPES.fixed
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function getScheduleItemsForStudent(dateISO, student, scheduleOverride) {
  if (scheduleOverride?.items) {
    return scheduleOverride.items
      .map(item => ({
        time: item.time,
        type: item.type || SCHEDULE_ITEM_TYPES.extra,
        note: item.note || "",
        pricePerClass: item.pricePerClass ?? null
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  if (scheduleOverride?.times) {
    const baseTimes = new Set(getBaseScheduleItemsForStudent(dateISO, student).map(item => item.time));
    return scheduleOverride.times
      .map(time => ({
        time,
        type: baseTimes.has(time) ? SCHEDULE_ITEM_TYPES.fixed : SCHEDULE_ITEM_TYPES.extra
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  return getBaseScheduleItemsForStudent(dateISO, student);
}

export function buildScheduleOverridePayload(items) {
  const sortedItems = [...items].sort((a, b) => a.time.localeCompare(b.time));
  return {
    times: sortedItems.map(item => item.time),
    items: sortedItems.map(item => ({
      time: item.time,
      type: item.type || SCHEDULE_ITEM_TYPES.extra,
      note: item.note || "",
      pricePerClass: item.pricePerClass ?? null
    }))
  };
}

export function getClassesForDate(dateISO, students, scheduleOverrides) {
  const classes = [];

  students.forEach(student => {
    const override = scheduleOverrides.find(
      item => item.date === dateISO && item.studentId === student.id
    );
    const scheduleItems = getScheduleItemsForStudent(dateISO, student, override);

    scheduleItems.forEach(item => {
      classes.push({
        studentId: student.id,
        studentName: student.name,
        time: item.time,
        pricePerClass: item.pricePerClass ?? student.pricePerClass,
        scheduleType: item.type || SCHEDULE_ITEM_TYPES.fixed,
        scheduleTypeLabel: getScheduleItemTypeLabel(item.type),
        scheduleNote: item.note || ""
      });
    });
  });

  return classes.sort((a, b) => a.time.localeCompare(b.time));
}
