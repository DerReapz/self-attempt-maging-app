const LS_KEY = 'mage_chars';

export const loadAll = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
};

// Subscribers are notified every time saveAll runs. Used by dmSync to push
// linked characters to Supabase without coupling the editor to network code.
const subscribers = new Set();
export const subscribe = (fn) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

export const saveAll = (data) => {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  for (const fn of subscribers) {
    try { fn(data); } catch { /* swallow — sync must not break saves */ }
  }
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
