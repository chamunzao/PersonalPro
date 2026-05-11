import { DEMO_EMAIL } from './demoData.js';

export function shouldSaveAttendanceRemotely(user) {
  return String(user?.email || '').toLowerCase() !== DEMO_EMAIL;
}
