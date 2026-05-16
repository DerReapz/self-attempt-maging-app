// ── Native (Capacitor) directory options ────────────────────────────────────

export const NATIVE_DIRS = [
  {
    id:    'Documents',
    label: 'App Documents',
    hint:  'App-specific documents folder (default)',
  },
  {
    id:    'ExternalStorage',
    label: 'Device Storage',
    hint:  'Saves to a MageBackups/ folder on internal device storage',
  },
];

export function getNativeDir() {
  return localStorage.getItem('mage_backup_native_dir') || 'Documents';
}

export function setNativeDir(id) {
  localStorage.setItem('mage_backup_native_dir', id);
}

// ── Web: File System Access API ─────────────────────────────────────────────

export function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// IndexedDB is needed because FileSystemDirectoryHandle cannot go in localStorage.
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('mage_prefs', 1);
    r.onupgradeneeded = (e) => e.target.result.createObjectStore('kv');
    r.onsuccess = (e) => res(e.target.result);
    r.onerror   = (e) => rej(e.target.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

async function idbPut(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

async function idbDel(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction('kv', 'readwrite').objectStore('kv').delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

const HANDLE_KEY = 'backup_dir_handle';

export async function getStoredDirHandle() {
  try { return await idbGet(HANDLE_KEY); } catch { return null; }
}

export async function storeDirHandle(handle) {
  await idbPut(HANDLE_KEY, handle);
}

export async function clearDirHandle() {
  await idbDel(HANDLE_KEY);
}

// Returns the stored handle if read/write permission is still granted, else null.
export async function getPermittedHandle() {
  const h = await getStoredDirHandle();
  if (!h) return null;
  try {
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await h.requestPermission({ mode: 'readwrite' });
    return perm === 'granted' ? h : null;
  } catch { return null; }
}

// Opens the OS folder picker and persists the chosen directory.
export async function pickBackupFolder() {
  const h = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
  await storeDirHandle(h);
  return h;
}

// Writes a Blob to the stored directory. Returns true on success, false if
// no directory is configured or permission was denied.
export async function saveToDirHandle(filename, blob) {
  const h = await getPermittedHandle();
  if (!h) return false;
  const fh = await h.getFileHandle(filename, { create: true });
  const w  = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return true;
}
