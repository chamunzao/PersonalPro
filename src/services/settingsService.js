import {
  db,
  doc,
  getDoc,
  setDoc
} from '../firebase';

const THEME_SETTINGS_PATH = 'settings/theme';

export async function getThemeKey(userId) {
  const themeSnap = await getDoc(doc(db, `users/${userId}/${THEME_SETTINGS_PATH}`));

  if (!themeSnap.exists()) return null;
  return themeSnap.data().themeKey || null;
}

export async function saveThemeKey(userId, themeKey) {
  await setDoc(doc(db, `users/${userId}/${THEME_SETTINGS_PATH}`), { themeKey });
}
