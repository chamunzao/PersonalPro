import {
  getRecordDocId,
  updateAttendanceRecord
} from '../../services/recordsService';

export function getAttendanceRecordDocId(classKey) {
  return getRecordDocId(classKey);
}

export { updateAttendanceRecord };

export function getAttendanceStatusStyle(status, theme) {
  if (status === 'present') {
    return { label: 'Presente', background: 'rgba(242, 207, 124, 0.14)', color: '#F2CF7C', border: 'rgba(242, 207, 124, 0.35)' };
  }
  if (status === 'absent') {
    return { label: 'Ausente', background: '#fee2e2', color: '#dc2626', border: '#fecaca' };
  }
  return { label: 'Pendente', background: '#f3f4f6', color: theme?.primary || '#6b7280', border: '#e5e7eb' };
}
