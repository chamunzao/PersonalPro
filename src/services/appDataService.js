import {
  db,
  collection,
  getDocs
} from '../firebase';
import { getThemeKey } from './settingsService';

function mapStudentDoc(studentDoc) {
  return {
    id: studentDoc.id,
    ...studentDoc.data()
  };
}

function mapRecordDoc(recordDoc) {
  const data = recordDoc.data();

  return {
    key: data.key || decodeURIComponent(recordDoc.id),
    status: data.status,
    activity: data.activity || null,
    customPrice: data.customPrice || null,
    sessionNote: data.sessionNote || null,
    exerciseNotes: data.exerciseNotes || {}
  };
}

function mapPaymentDoc(paymentDoc) {
  return {
    key: paymentDoc.id,
    ...paymentDoc.data()
  };
}

function mapScheduleOverrideDoc(overrideDoc) {
  return {
    key: overrideDoc.id,
    date: overrideDoc.id.split("_")[0],
    studentId: overrideDoc.id.split("_")[1],
    ...overrideDoc.data()
  };
}

export async function loadAppData(userId) {
  const themeKey = await getThemeKey(userId);
  const studentsSnap = await getDocs(collection(db, `users/${userId}/students`));
  const recordsSnap = await getDocs(collection(db, `users/${userId}/records`));
  const paymentsSnap = await getDocs(collection(db, `users/${userId}/payments`));
  const overridesSnap = await getDocs(collection(db, `users/${userId}/scheduleOverrides`));

  return {
    themeKey,
    students: studentsSnap.docs.map(mapStudentDoc),
    records: recordsSnap.docs.map(mapRecordDoc),
    payments: paymentsSnap.docs.map(mapPaymentDoc),
    scheduleOverrides: overridesSnap.docs.map(mapScheduleOverrideDoc)
  };
}
