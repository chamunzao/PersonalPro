import { GYM_FEE_PER_CLASS, REVENUE_LIMIT } from "../../lib/constants";
import { formatDateISO, getDaysInMonth, parseBrazilianDate } from "../../lib/dates";
import {
  applyLocationMonthlyCap,
  calculateLocationFixedFee,
  calculateLocationVariableFee,
  getLocationName
} from "../locations/locationCalculations";

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

function getClassPrice(record, student, classMeta) {
  if (Number.isFinite(record.customPrice)) return record.customPrice;
  const parsedCustomPrice = Number(record.customPrice);
  if (Number.isFinite(parsedCustomPrice) && parsedCustomPrice > 0) return parsedCustomPrice;

  const parsedSchedulePrice = Number(classMeta?.pricePerClass);
  if (Number.isFinite(parsedSchedulePrice) && parsedSchedulePrice > 0) return parsedSchedulePrice;

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
  return calculateMonthlyReportWithLocations({ students, records, payments, monthKey });
}

export function calculateMonthlyReportWithLocations({ students, records, payments, monthKey, locations = [], getClassesForDate }) {
  const studentsById = new Map(students.map(student => [student.id, student]));
  const monthRecords = records.filter(record => isRecordInMonth(record, monthKey));
  const presentRecords = monthRecords
    .filter(record => record.status === "present")
    .sort(sortRecordsByDateAndTime);
  const absentRecords = monthRecords.filter(record => record.status === "absent");
  const monthPayments = payments.filter(payment => payment.month === monthKey);
  const paidStudentIds = new Set(monthPayments.map(payment => payment.studentId || payment.key?.split("_")[1]));
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const classMetaByKey = new Map();

  if (getClassesForDate && Number.isFinite(year) && Number.isFinite(monthIndex)) {
    const daysInMonth = getDaysInMonth(year, monthIndex);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      const dateISO = formatDateISO(date);
      const dateBR = `${String(day).padStart(2, "0")}/${monthText}/${yearText}`;
      getClassesForDate(dateISO).forEach(cls => {
        classMetaByKey.set(`${dateBR}_${cls.studentId}_${cls.time}`, cls);
      });
    }
  }

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
  const locationRowsMap = new Map();

  function getLocationRow(locationId) {
    const key = locationId || "no-location";
    if (!locationRowsMap.has(key)) {
      const location = locations.find(item => item.id === locationId);
      locationRowsMap.set(key, {
        locationId: key,
        location,
        locationName: location ? location.name : getLocationName(locationId, locations),
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        grossRevenue: 0,
        variableFees: 0,
        fixedFee: 0,
        totalFees: 0,
        netRevenue: 0
      });
    }
    return locationRowsMap.get(key);
  }

  monthRecords.forEach(record => {
    const meta = classMetaByKey.get(record.key);
    const row = getLocationRow(meta?.locationId || "");
    row.totalClasses += 1;
    if (record.status === "present") row.presentClasses += 1;
    if (record.status === "absent") row.absentClasses += 1;
  });

  presentRecords.forEach(record => {
    const { studentId } = getRecordParts(record.key);
    const student = studentsById.get(studentId);
    const row = rowsByStudentId.get(studentId);
    const meta = classMetaByKey.get(record.key);
    const classRevenue = getClassPrice(record, student, meta);
    const location = locations.find(item => item.id === meta?.locationId);
    const locationRow = getLocationRow(meta?.locationId || "");
    const hasConfiguredLocations = locations.length > 0;
    const shouldChargeGymFee = !hasConfiguredLocations && accumulatedRevenue < REVENUE_LIMIT;
    const gymFee = hasConfiguredLocations
      ? calculateLocationVariableFee(location, classRevenue)
      : shouldChargeGymFee ? GYM_FEE_PER_CLASS : 0;

    accumulatedRevenue += classRevenue;
    grossRevenue += classRevenue;
    totalGymFees += gymFee;
    locationRow.grossRevenue += classRevenue;
    locationRow.variableFees += gymFee;

    if (row) {
      row.grossRevenue += classRevenue;
      row.gymFees += gymFee;
      row.netRevenue = row.grossRevenue - row.gymFees;
    }
  });

  const locationRows = [...locationRowsMap.values()].map(row => {
    const uncappedFee = row.variableFees + calculateLocationFixedFee(row.location, row.grossRevenue > 0);
    row.fixedFee = calculateLocationFixedFee(row.location, row.grossRevenue > 0);
    row.totalFees = applyLocationMonthlyCap(row.location, uncappedFee);
    row.netRevenue = row.grossRevenue - row.totalFees;
    return row;
  }).sort((a, b) => b.grossRevenue - a.grossRevenue || a.locationName.localeCompare(b.locationName));

  if (locations.length > 0) {
    totalGymFees = locationRows.reduce((sum, row) => sum + row.totalFees, 0);
    studentRows.forEach(row => {
      row.netRevenue = row.grossRevenue - row.gymFees;
    });
  }

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
    studentRows,
    locationRows
  };
}
