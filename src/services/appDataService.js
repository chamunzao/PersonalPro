import {
  db,
  collection,
  getDocs
} from '../firebase';
import { DEMO_EMAIL, getDemoAppData } from './demoData';
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

export async function loadAppData(userId, userEmail = "") {
  const isDemoAccount = String(userEmail || "").toLowerCase() === DEMO_EMAIL;

  try {
    const themeKey = await getThemeKey(userId);
    const studentsSnap = await getDocs(collection(db, `users/${userId}/students`));
    const recordsSnap = await getDocs(collection(db, `users/${userId}/records`));
    const paymentsSnap = await getDocs(collection(db, `users/${userId}/payments`));
    const overridesSnap = await getDocs(collection(db, `users/${userId}/scheduleOverrides`));

    if (isDemoAccount && studentsSnap.empty) {
      return getDemoAppData();
    }

    return {
      themeKey,
      students: studentsSnap.docs.map(mapStudentDoc),
      records: recordsSnap.docs.map(mapRecordDoc),
      payments: paymentsSnap.docs.map(mapPaymentDoc),
      scheduleOverrides: overridesSnap.docs.map(mapScheduleOverrideDoc)
    };
  } catch (error) {
    if (isDemoAccount) {
      console.warn("Using bundled demo data because Firestore demo data could not be loaded.", error);
      return getDemoAppData();
    }
    throw error;
  }
}
