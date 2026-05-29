import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

const charDoc = (uid) => doc(db, 'users', uid, 'backup', 'characters');

export const uploadChars = async (uid, data) => {
  if (!db) return;
  await setDoc(charDoc(uid), { chars: data, updatedAt: serverTimestamp() });
};

export const downloadChars = async (uid) => {
  if (!db) return null;
  const snap = await getDoc(charDoc(uid));
  return snap.exists() ? (snap.data().chars ?? null) : null;
};

// On login: download cloud, merge with local (cloud wins on ID conflict), upload result.
export const syncOnLogin = async (uid, getLocal, setLocal) => {
  const local = getLocal();
  const cloud = await downloadChars(uid);

  if (!cloud) {
    if (Object.keys(local).length > 0) await uploadChars(uid, local);
    return;
  }

  if (Object.keys(local).length === 0) {
    setLocal(cloud);
    return;
  }

  // Both have data — union, cloud wins on ID collision
  const merged = { ...local, ...cloud };
  setLocal(merged);
  await uploadChars(uid, merged);
};

let _timer = null;
export const debouncedUpload = (uid, data, ms = 2000) => {
  clearTimeout(_timer);
  _timer = setTimeout(() => {
    uploadChars(uid, data).catch(() => {}); // silent — offline resilient
  }, ms);
};
