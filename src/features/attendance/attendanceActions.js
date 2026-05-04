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
    return { label: 'Presente', background: '#d1fae5', color: '#059669', border: '#a7f3d0' };
  }
  if (status === 'absent') {
    return { label: 'Ausente', background: '#fee2e2', color: '#dc2626', border: '#fecaca' };
  }
  return { label: 'Pendente', background: '#f3f4f6', color: theme?.primary || '#6b7280', border: '#e5e7eb' };
}
