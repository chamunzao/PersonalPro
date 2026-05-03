import { db, doc, setDoc, deleteDoc } from '../../firebase';

export async function updateAttendanceRecord({ user, classKey, status, activity, price, setRecords }) {
  if (!user) return;

  const parts = classKey.split('_');
  const date = parts[0];
  const studentId = parts[1];
  const time = parts.slice(2).join('_');
  const recordKey = `${date}_${studentId}_${time}`;
  const recordDoc = doc(db, `users/${user.uid}/records/${recordKey}`);

  if (status === null) {
    await deleteDoc(recordDoc);
  } else {
    const data = { status };
    if (activity !== undefined) data.activity = activity || null;
    if (price !== undefined) data.customPrice = price ? parseFloat(price) : null;
    await setDoc(recordDoc, data, { merge: true });
  }

  setRecords(prev => {
    const existing = prev.findIndex(record => record.key === classKey);
    if (status === null) {
      return existing >= 0 ? prev.filter((_, index) => index !== existing) : prev;
    }

    const nextRecord = {
      key: classKey,
      status,
      activity: activity !== undefined ? (activity || null) : (existing >= 0 ? prev[existing].activity : null),
      customPrice: price !== undefined ? (price ? parseFloat(price) : null) : (existing >= 0 ? prev[existing].customPrice : null)
    };

    if (existing >= 0) {
      const next = [...prev];
      next[existing] = nextRecord;
      return next;
    }

    return [...prev, nextRecord];
  });
}

export function getAttendanceStatusStyle(status, theme) {
  if (status === 'present') {
    return { label: 'Presente', background: '#d1fae5', color: '#059669', border: '#a7f3d0' };
  }
  if (status === 'absent') {
    return { label: 'Ausente', background: '#fee2e2', color: '#dc2626', border: '#fecaca' };
  }
  return { label: 'Pendente', background: '#f3f4f6', color: theme?.primary || '#6b7280', border: '#e5e7eb' };
}
