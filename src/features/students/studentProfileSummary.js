import { DAYS } from "../../lib/constants.js";
import { formatDate, parseBrazilianDate } from "../../lib/dates.js";
import { getStudentRiskTags } from "../session/sessionStudentSummary.js";

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = String(recordKey || "").split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function isSameMonth(date, referenceDate) {
  return date.getFullYear() === referenceDate.getFullYear()
    && date.getMonth() === referenceDate.getMonth();
}

function getStudentScheduleDayIndex(date) {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
}

export function getStudentMonthAttendance(studentId, records = [], referenceDate = new Date()) {
  const monthRecords = records
    .filter(record => {
      const parts = getRecordParts(record.key);
      if (parts.studentId !== studentId) return false;
      const recordDate = parseBrazilianDate(parts.date);
      return !Number.isNaN(recordDate.getTime()) && isSameMonth(recordDate, referenceDate);
    });
  const present = monthRecords.filter(record => record.status === "present").length;
  const absent = monthRecords.filter(record => record.status === "absent").length;
  const total = present + absent;

  return {
    present,
    absent,
    total,
    rate: total > 0 ? Math.round((present / total) * 100) : 0
  };
}

export function getLastStudentRecord(studentId, records = []) {
  return records
    .filter(record => getRecordParts(record.key).studentId === studentId)
    .map(record => {
      const parts = getRecordParts(record.key);
      return {
        ...record,
        date: parts.date,
        time: parts.time,
        dateObj: parseBrazilianDate(parts.date)
      };
    })
    .filter(record => !Number.isNaN(record.dateObj.getTime()))
    .sort((a, b) => {
      const dateDiff = b.dateObj - a.dateObj;
      if (dateDiff !== 0) return dateDiff;
      return b.time.localeCompare(a.time);
    })[0] || null;
}

export function getStudentProfileRiskTags(anamnesis = {}) {
  return getStudentRiskTags(anamnesis);
}

export function getActiveWorkoutPlan(workoutPlans = []) {
  if (workoutPlans.length === 0) return null;
  return workoutPlans.find(plan => plan.active) || workoutPlans[0];
}

export function getNextStudentClass(student, referenceDate = new Date()) {
  const schedule = student?.schedule || [];
  if (schedule.length === 0) return null;

  const candidates = [];
  for (let offset = 0; offset <= 14; offset += 1) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + offset);
    const dayIndex = getStudentScheduleDayIndex(date);
    schedule
      .filter(item => Number(item.day) === dayIndex)
      .forEach(item => {
        const [hour, minute] = String(item.time || "00:00").split(":").map(Number);
        const classDate = new Date(date);
        classDate.setHours(hour || 0, minute || 0, 0, 0);
        if (classDate > referenceDate) {
          candidates.push({
            dateObj: classDate,
            date: formatDate(classDate),
            time: item.time,
            dayLabel: DAYS[dayIndex]
          });
        }
      });
  }

  const nextClass = candidates.sort((a, b) => a.dateObj - b.dateObj)[0];
  if (!nextClass) return null;
  return {
    date: nextClass.date,
    time: nextClass.time,
    dayLabel: nextClass.dayLabel
  };
}
