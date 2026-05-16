import {
  db,
  collection,
  getDocs
} from '../firebase.js';
import { DEMO_EMAIL, getDemoAppData } from './demoData.js';
import { getThemeKey } from './settingsService.js';

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
    exerciseNotes: data.exerciseNotes || {},
    exerciseLogs: data.exerciseLogs || {},
    executedWorkout: data.executedWorkout || null,
    sessionCheckout: data.sessionCheckout || {}
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

async function readCollection({ path, mapDoc, fallback = [], required = false, deps }) {
  const { collectionFn, getDocsFn } = deps;

  try {
    const snap = await getDocsFn(collectionFn(db, path));
    return {
      data: snap.docs.map(mapDoc),
      empty: snap.empty
    };
  } catch (error) {
    console.error(`Error loading Firestore collection ${path}:`, error);
    if (required) throw error;
    return {
      data: fallback,
      empty: true,
      error
    };
  }
}

export async function loadAppData(userId, userEmail = "", deps = {}) {
  const isDemoAccount = String(userEmail || "").toLowerCase() === DEMO_EMAIL;
  const resolvedDeps = {
    collectionFn: deps.collectionFn || collection,
    getDocsFn: deps.getDocsFn || getDocs,
    getThemeKeyFn: deps.getThemeKeyFn || getThemeKey
  };

  try {
    let themeKey = null;
    try {
      themeKey = await resolvedDeps.getThemeKeyFn(userId);
    } catch (error) {
      console.warn("Theme settings could not be loaded. Continuing with default theme.", error);
    }

    const studentsResult = await readCollection({
      path: `users/${userId}/students`,
      mapDoc: mapStudentDoc,
      required: true,
      deps: resolvedDeps
    });

    const [recordsResult, paymentsResult, overridesResult] = await Promise.all([
      readCollection({ path: `users/${userId}/records`, mapDoc: mapRecordDoc, deps: resolvedDeps }),
      readCollection({ path: `users/${userId}/payments`, mapDoc: mapPaymentDoc, deps: resolvedDeps }),
      readCollection({ path: `users/${userId}/scheduleOverrides`, mapDoc: mapScheduleOverrideDoc, deps: resolvedDeps })
    ]);

    if (isDemoAccount && studentsResult.empty) {
      return getDemoAppData();
    }

    return {
      themeKey,
      students: studentsResult.data,
      records: recordsResult.data,
      payments: paymentsResult.data,
      scheduleOverrides: overridesResult.data
    };
  } catch (error) {
    if (isDemoAccount) {
      console.warn("Using bundled demo data because Firestore demo data could not be loaded.", error);
      return getDemoAppData();
    }
    throw error;
  }
}
