import { GYM_FEE_PER_CLASS, REVENUE_LIMIT } from "../../lib/constants";
import { parseBrazilianDate } from "../../lib/dates";

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = recordKey.split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function isRecordInMonth(record, monthKey) {
  const { date } = getRecordParts(record.key);
  const [day, month, year] = date.split("/");
  if (!day || !month || !year) return false;
  return `${year}-${month}` === monthKey;
}

function getClassPrice(record, student) {
  if (Number.isFinite(record.customPrice)) return record.customPrice;
  const parsedCustomPrice = Number(record.customPrice);
  if (Number.isFinite(parsedCustomPrice) && parsedCustomPrice > 0) return parsedCustomPrice;

  const parsedDefaultPrice = Number(student?.pricePerClass);
  return Number.isFinite(parsedDefaultPrice) ? parsedDefaultPrice : 0;
}

function sortRecordsByDateAndTime(a, b) {
  const aParts = getRecordParts(a.key);
  const bParts = getRecordParts(b.key);
  const dateDiff = parseBrazilianDate(aParts.date) - parseBrazilianDate(bParts.date);
  if (dateDiff !== 0) return dateDiff;
  return aParts.time.localeCompare(bParts.time);
}

export function calculateMonthlyReport({ students, records, payments, monthKey }) {
  const studentsById = new Map(students.map(student => [student.id, student]));
  const monthRecords = records.filter(record => isRecordInMonth(record, monthKey));
  const presentRecords = monthRecords
    .filter(record => record.status === "present")
    .sort(sortRecordsByDateAndTime);
  const absentRecords = monthRecords.filter(record => record.status === "absent");
  const monthPayments = payments.filter(payment => payment.month === monthKey);
  const paidStudentIds = new Set(monthPayments.map(payment => payment.studentId || payment.key?.split("_")[1]));

  const studentRows = students.map(student => ({
    student,
    totalClasses: 0,
    presentClasses: 0,
    absentClasses: 0,
    grossRevenue: 0,
    gymFees: 0,
    netRevenue: 0,
    paid: paidStudentIds.has(student.id)
  }));
  const rowsByStudentId = new Map(studentRows.map(row => [row.student.id, row]));

  monthRecords.forEach(record => {
    const { studentId } = getRecordParts(record.key);
    const row = rowsByStudentId.get(studentId);
    if (!row) return;

    row.totalClasses += 1;
    if (record.status === "present") row.presentClasses += 1;
    if (record.status === "absent") row.absentClasses += 1;
  });

  let accumulatedRevenue = 0;
  let totalGymFees = 0;
  let grossRevenue = 0;

  presentRecords.forEach(record => {
    const { studentId } = getRecordParts(record.key);
    const student = studentsById.get(studentId);
    const row = rowsByStudentId.get(studentId);
    const classRevenue = getClassPrice(record, student);
    const shouldChargeGymFee = accumulatedRevenue < REVENUE_LIMIT;
    const gymFee = shouldChargeGymFee ? GYM_FEE_PER_CLASS : 0;

    accumulatedRevenue += classRevenue;
    grossRevenue += classRevenue;
    totalGymFees += gymFee;

    if (row) {
      row.grossRevenue += classRevenue;
      row.gymFees += gymFee;
      row.netRevenue = row.grossRevenue - row.gymFees;
    }
  });

  const totalClasses = monthRecords.length;
  const presentClasses = presentRecords.length;
  const absentClasses = absentRecords.length;
  const attendanceRate = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
  const absenceRate = totalClasses > 0 ? (absentClasses / totalClasses) * 100 : 0;
  const totalStudents = students.length;
  const studentsWithPayment = monthPayments.length;
  const paymentRate = totalStudents > 0 ? (studentsWithPayment / totalStudents) * 100 : 0;
  const netRevenue = grossRevenue - totalGymFees;
  const revenuePercentage = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;

  return {
    monthRecords,
    monthPayments,
    totalClasses,
    presentClasses,
    absentClasses,
    attendanceRate,
    absenceRate,
    grossRevenue,
    gymFees: totalGymFees,
    netRevenue,
    revenuePercentage,
    studentsWithPayment,
    totalStudents,
    paymentRate,
    studentRows
  };
}
