import {
  db,
  doc,
  setDoc,
  deleteDoc
} from '../firebase.js';
import { shouldSaveAttendanceRemotely } from './recordsPolicy.js';

export function getRecordDocId(classKey) {
  return encodeURIComponent(classKey);
}

function normalizeClassKey(classKey) {
  const parts = classKey.split('_');
  const date = parts[0];
  const studentId = parts[1];
  const time = parts.slice(2).join('_');

  return `${date}_${studentId}_${time}`;
}

function getRecordRef(userId, classKey) {
  const recordKey = normalizeClassKey(classKey);
  return doc(db, `users/${userId}/records/${getRecordDocId(recordKey)}`);
}

export async function saveAttendanceRecord({ userId, classKey, status, activity, price }) {
  const recordKey = normalizeClassKey(classKey);
  const recordRef = getRecordRef(userId, recordKey);

  if (status === null) {
    await deleteDoc(recordRef);
    return;
  }

  const data = { key: recordKey, status };
  if (activity !== undefined) data.activity = activity || null;
  if (price !== undefined) data.customPrice = price ? parseFloat(price) : null;

  await setDoc(recordRef, data, { merge: true });
}

export async function saveSessionNotes({ userId, classKey, sessionNote, exerciseNotes, exerciseLogs, executedWorkout, sessionCheckout }) {
  const recordKey = normalizeClassKey(classKey);

  await setDoc(getRecordRef(userId, recordKey), {
    key: recordKey,
    sessionNote: sessionNote || null,
    exerciseNotes: exerciseNotes || {},
    exerciseLogs: exerciseLogs || {},
    executedWorkout: executedWorkout || null,
    sessionCheckout: sessionCheckout || {}
  }, { merge: true });
}

export function applyAttendanceRecordUpdate(records, { classKey, status, activity, price }) {
  const existing = records.findIndex(record => record.key === classKey);

  if (status === null) {
    return existing >= 0 ? records.filter((_, index) => index !== existing) : records;
  }

  const nextRecord = {
    ...(existing >= 0 ? records[existing] : { key: classKey }),
    status,
    activity: activity !== undefined ? (activity || null) : (existing >= 0 ? records[existing].activity : null),
    customPrice: price !== undefined ? (price ? parseFloat(price) : null) : (existing >= 0 ? records[existing].customPrice : null)
  };

  if (existing >= 0) {
    const next = [...records];
    next[existing] = nextRecord;
    return next;
  }

  return [...records, nextRecord];
}

export function applySessionNotesUpdate(records, { classKey, sessionNote, exerciseNotes, exerciseLogs, executedWorkout, sessionCheckout }) {
  const existing = records.findIndex(record => record.key === classKey);
  const nextRecord = {
    ...(existing >= 0 ? records[existing] : { key: classKey, status: null, activity: null, customPrice: null }),
    sessionNote: sessionNote || null,
    exerciseNotes: exerciseNotes || {},
    exerciseLogs: exerciseLogs || {},
    executedWorkout: executedWorkout || null,
    sessionCheckout: sessionCheckout || {}
  };

  if (existing >= 0) {
    const next = [...records];
    next[existing] = nextRecord;
    return next;
  }

  return [...records, nextRecord];
}

export async function updateAttendanceRecord({ user, classKey, status, activity, price, setRecords }) {
  if (!user) return;

  if (shouldSaveAttendanceRemotely(user)) {
    await saveAttendanceRecord({
      userId: user.uid,
      classKey,
      status,
      activity,
      price
    });
  }

  setRecords(prev => applyAttendanceRecordUpdate(prev, { classKey, status, activity, price }));
}
