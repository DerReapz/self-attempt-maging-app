const LS_KEY = 'mage_chars';

export const loadAll = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
};

export const saveAll = (data) => {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
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
