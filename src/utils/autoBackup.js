import { zip } from 'fflate';
import { loadAll } from './storage.js';
import { buildPDFBytes } from './pdfExport.js';
import { uploadToCloud } from './cloudBackup.js';

// ── Config ─────────────────────────────────────────────────────────────────

const LS = {
  enabled:  'mage_cloud_enabled',
  provider: 'mage_cloud_provider',
  token:    'mage_cloud_token',
  url:      'mage_cloud_webdav_url',
  username: 'mage_cloud_webdav_user',
  password: 'mage_cloud_webdav_pass',
  lastOk:   'mage_cloud_last_ok',
  lastErr:  'mage_cloud_last_err',
};

export function getCloudConfig() {
  return {
    enabled:  localStorage.getItem(LS.enabled)  === 'true',
    provider: localStorage.getItem(LS.provider) || '',
    token:    localStorage.getItem(LS.token)    || '',
    url:      localStorage.getItem(LS.url)      || '',
    username: localStorage.getItem(LS.username) || '',
    password: localStorage.getItem(LS.password) || '',
    lastOk:   localStorage.getItem(LS.lastOk)   || '',
    lastErr:  localStorage.getItem(LS.lastErr)  || '',
  };
}

export function setCloudConfig(partial) {
  const map = {
    enabled: LS.enabled, provider: LS.provider, token: LS.token,
    url: LS.url, username: LS.username, password: LS.password,
  };
  for (const [k, lsKey] of Object.entries(map)) {
    if (k in partial) localStorage.setItem(lsKey, String(partial[k]));
  }
}

// ── Backup runner ──────────────────────────────────────────────────────────

function safeName(ch) {
  return (ch.sheet?.identity?.name || 'mage_character').replace(/[^a-z0-9_\- ]/gi, '_');
}

// Runs a cloud backup immediately. Throws on failure.
export async function runCloudBackup() {
  const cfg = getCloudConfig();
  if (!cfg.enabled || !cfg.provider) throw new Error('Cloud backup not configured.');

  const chars = Object.values(loadAll());
  if (!chars.length) throw new Error('No characters to back up.');

  // Build a ZIP of all character PDFs
  const files = {};
  const seen  = {};
  for (const ch of chars) {
    const base  = safeName(ch);
    const n     = seen[base] = (seen[base] || 0) + 1;
    files[n > 1 ? `${base}_${n}.pdf` : `${base}.pdf`] = buildPDFBytes(ch);
  }

  const zipBytes = await new Promise((res, rej) => {
    zip(files, { level: 6 }, (err, data) => (err ? rej(err) : res(data)));
  });

  // Auto-backups always overwrite a fixed filename so the cloud folder stays clean
  await uploadToCloud(cfg.provider, cfg, zipBytes, 'mage_autobackup.zip');

  const ts = new Date().toISOString();
  localStorage.setItem(LS.lastOk,  ts);
  localStorage.setItem(LS.lastErr, '');
  return ts;
}

// ── 15-minute scheduler ────────────────────────────────────────────────────

let _intervalId = null;

export function startAutoBackupScheduler() {
  if (_intervalId !== null) return; // already running

  const tick = async () => {
    if (document.visibilityState !== 'visible') return;
    if (!getCloudConfig().enabled) return;
    try { await runCloudBackup(); }
    catch (e) { localStorage.setItem(LS.lastErr, e.message); }
  };

  _intervalId = setInterval(tick, 15 * 60 * 1000);
}

export function stopAutoBackupScheduler() {
  if (_intervalId !== null) { clearInterval(_intervalId); _intervalId = null; }
}
