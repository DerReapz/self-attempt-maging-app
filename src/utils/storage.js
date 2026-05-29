const LS_KEY = 'mage_chars';
const BACKUP_FILE = 'mage_chars_backup.json';

export const loadAll = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
};

async function writeBackup(json) {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: BACKUP_FILE,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  } catch { /* non-fatal on web */ }
}

let _syncCallback = null;
export const setSyncCallback = (fn) => { _syncCallback = fn; };

export const saveAll = (data) => {
  const json = JSON.stringify(data);
  localStorage.setItem(LS_KEY, json);
  writeBackup(json);
  if (_syncCallback) _syncCallback(data);
};

// Call this before rendering. If localStorage is empty (fresh install/reinstall),
// restores characters from the Documents backup written by a previous install.
export const restoreFromBackupIfEmpty = async () => {
  if (Object.keys(loadAll()).length > 0) return;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { data } = await Filesystem.readFile({
      path: BACKUP_FILE,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
    }
  } catch { /* no backup or running in browser */ }
};

export const clearAll = () => {
  localStorage.removeItem(LS_KEY);
  import('@capacitor/filesystem').then(({ Filesystem, Directory }) => {
    Filesystem.deleteFile({ path: BACKUP_FILE, directory: Directory.Documents }).catch(() => {});
  });
};

export const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const exportCharsToJson = async () => {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem').catch(() => null) || {};
  const data = loadAll();
  const json = JSON.stringify(data, null, 2);

  if (Filesystem) {
    try {
      const result = await Filesystem.writeFile({
        path: 'mage_characters.json',
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return result.uri || 'Documents/mage_characters.json';
    } catch (e) {
      // Fall through to blob download
    }
  }

  // Fallback for browser
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url, download: 'mage_characters.json',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return null;
};
