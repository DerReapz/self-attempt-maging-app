// Per-player character vault.
//
// When the user is signed in, every locally-saved character is mirrored
// into public.player_characters under their auth user id. On a fresh
// install or new device, signing in pulls the vault back down, merging
// row-by-row against any local state via last-write-wins on the
// client-side updatedAt timestamp. Realtime keeps two signed-in devices
// of the same account converged live.
//
// Deletion model: the cloud is a DURABLE BACKUP. Deleting a character on
// a device does NOT delete the cloud copy. Instead the id is recorded in
// a per-account local "graveyard" so background sync (sign-in pull,
// realtime) won't silently resurrect it. An explicit "Restore from Cloud"
// clears the graveyard and pulls every cloud character back. This lets a
// user delete a character locally and recover it from the cloud later.

import { supabase, isConfigured } from './supabase.js';
import { loadAll, saveAll, subscribe } from '../utils/storage.js';

const PUSH_DEBOUNCE_MS = 700;

let snapshot         = {};               // last-known character map (id → ch)
let pending          = new Map();        // char_id → ch (live upserts only)
let pushTimer        = null;
let realtimeCh       = null;
let userId           = null;
let started          = false;
let applyingRemote   = false;            // suppress push handler during merges
let lastCloudLiveIds = new Set();        // best-effort view of live cloud ids

const status     = { current: 'offline', lastError: '', cloudCount: null, hiddenCount: 0 };
const listeners  = new Set();

const notify = () => {
  for (const fn of listeners) {
    try { fn(status.current, status.lastError, status.cloudCount, status.hiddenCount); }
    catch { /* ignore */ }
  }
};

const setStatus = (s, lastError) => {
  status.current = s;
  if (lastError !== undefined) status.lastError = lastError;
  if (s !== 'error') status.lastError = '';
  notify();
};

const setCloudCount = (n) => {
  if (status.cloudCount === n) return;
  status.cloudCount = n;
  notify();
};

const setHiddenCount = (n) => {
  if (status.hiddenCount === n) return;
  status.hiddenCount = n;
  notify();
};

export const getVaultStatus    = () => status.current;
export const getVaultLastError = () => status.lastError;
export const getCloudCount     = () => status.cloudCount;
export const getHiddenCount    = () => status.hiddenCount;
export const subscribeVaultStatus = (fn) => {
  listeners.add(fn);
  try { fn(status.current, status.lastError, status.cloudCount, status.hiddenCount); } catch { /* ignore */ }
  return () => listeners.delete(fn);
};

// ── Local graveyard (per account) ───────────────────────────────────────────
// Ids the user has deleted on THIS device. Suppresses background resurrection
// without touching the cloud copy.

const GRAVEYARD_PREFIX = 'mage_vault_graveyard_';
const graveyardKey = () => GRAVEYARD_PREFIX + (userId || 'anon');

function loadGraveyard() {
  try { return new Set(JSON.parse(localStorage.getItem(graveyardKey()) || '[]')); }
  catch { return new Set(); }
}
function saveGraveyard(set) {
  try { localStorage.setItem(graveyardKey(), JSON.stringify([...set])); } catch { /* ignore */ }
}

// hiddenCount = graveyard ids that still exist live in the cloud (i.e.
// recoverable). Recomputed against the last known cloud view.
function recomputeHidden() {
  const g = loadGraveyard();
  let n = 0;
  for (const id of g) if (lastCloudLiveIds.has(id)) n++;
  setHiddenCount(n);
}

// Returns the number of live (non-tombstoned) rows in the cloud vault
// for the signed-in user. Updates the broadcast status so any subscriber
// (the vault card, the Characters screen) sees a fresh count.
export async function fetchCloudCount() {
  if (!userId) { setCloudCount(null); return null; }
  try {
    const { count, error } = await supabase
      .from('player_characters')
      .select('char_id', { count: 'exact', head: true })
      .eq('player_id', userId)
      .is('deleted_at', null);
    if (error) throw error;
    setCloudCount(count ?? 0);
    return count ?? 0;
  } catch (e) {
    console.warn('[vault] count failed', e?.message || e);
    setCloudCount(null);
    return null;
  }
}

// ── Row mappers ───────────────────────────────────────────────────────────

function rowToLocal(row) {
  const ts = row.client_updated_at ? new Date(row.client_updated_at).getTime() : Date.now();
  return { id: row.char_id, sheet: row.sheet, createdAt: ts, updatedAt: ts };
}

function liveRow(uid, id, ch) {
  return {
    player_id:         uid,
    char_id:           id,
    name:              ch?.sheet?.identity?.name || 'Unnamed Mage',
    sheet:             ch?.sheet || {},
    client_updated_at: new Date(ch?.updatedAt || Date.now()).toISOString(),
    deleted_at:        null,
  };
}

// ── Push path ─────────────────────────────────────────────────────────────

async function pushBatch() {
  if (!userId || !pending.size) return;
  setStatus('pushing');
  const batch = [...pending.entries()];
  pending.clear();
  try {
    for (const [id, ch] of batch) {
      if (ch == null) continue; // never tombstone — the cloud is a backup
      const { error } = await supabase
        .from('player_characters')
        .upsert(liveRow(userId, id, ch), { onConflict: 'player_id,char_id' });
      if (error) throw error;
      lastCloudLiveIds.add(id);
    }
    setStatus('idle');
    fetchCloudCount();
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn('[vault] push failed', msg);
    setStatus('error', `Push: ${msg}`);
  }
}

function scheduleFlush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushBatch, PUSH_DEBOUNCE_MS);
}

function onLocalChange(allChars) {
  if (applyingRemote || !userId) { snapshot = allChars; return; }

  const prev = snapshot;
  const graveyard = loadGraveyard();
  let graveyardChanged = false;

  for (const [id, ch] of Object.entries(allChars)) {
    if (!prev[id] || prev[id].updatedAt !== ch.updatedAt) {
      pending.set(id, ch);
    }
    // A character that's present locally again (re-created, re-imported) is no
    // longer "deleted on this device" — clear any stale graveyard entry.
    if (graveyard.delete(id)) graveyardChanged = true;
  }

  // A character removed locally is a DEVICE-LOCAL deletion only: record it in
  // the graveyard so background sync won't bring it back, but leave the cloud
  // copy untouched so it can be restored later.
  for (const id of Object.keys(prev)) {
    if (!(id in allChars)) {
      pending.delete(id);
      if (!graveyard.has(id)) { graveyard.add(id); graveyardChanged = true; }
    }
  }
  if (graveyardChanged) { saveGraveyard(graveyard); recomputeHidden(); }

  snapshot = allChars;
  if (pending.size) scheduleFlush();
}

// ── Pull / merge ──────────────────────────────────────────────────────────

function mergeRowInto(next, row, { force = false } = {}) {
  // Tombstoned rows are legacy artifacts from the old propagate-deletes
  // behavior. The cloud is now a durable backup: never delete a local
  // character because of a cloud tombstone — just ignore them.
  if (row.deleted_at) return;

  const localCh  = next[row.char_id];
  const remoteTs = row.client_updated_at ? new Date(row.client_updated_at).getTime() : 0;
  const localTs  = localCh?.updatedAt || 0;
  if (force || !localCh || remoteTs > localTs) {
    next[row.char_id] = { ...(localCh || {}), ...rowToLocal(row) };
  }
}

// Options:
//   force           — overwrite local with cloud and drop local-only chars
//                     (make local an exact mirror of the cloud).
//   ignoreGraveyard — explicit user restore: forget all local deletions so
//                     previously-deleted characters come back and stay.
export async function pullVaultNow({ force = false, ignoreGraveyard = false } = {}) {
  if (!userId) return { added: 0, updated: 0, deleted: 0, total: 0, skipped: 0, error: 'Not signed in' };
  setStatus('pulling');
  try {
    const { data, error } = await supabase
      .from('player_characters')
      .select('char_id, name, sheet, client_updated_at, deleted_at')
      .eq('player_id', userId);
    if (error) throw error;

    let graveyard = loadGraveyard();
    if (force || ignoreGraveyard) { graveyard = new Set(); saveGraveyard(graveyard); }

    // An explicit restore (force or ignoreGraveyard) also recovers rows that
    // were soft-deleted by the old propagate-deletes behavior — their sheet
    // data is still in the cloud. Background pulls keep ignoring tombstones.
    const explicit = force || ignoreGraveyard;

    const before = loadAll();
    const next   = { ...before };
    const cloudLiveIds = new Set();
    const resurrect    = [];              // tombstoned ids being brought back
    let added = 0, updated = 0, deleted = 0, totalLive = 0, skipped = 0;

    for (const row of (data || [])) {
      const isTomb = !!row.deleted_at;
      if (isTomb && !explicit) continue;   // background: ignore tombstones

      cloudLiveIds.add(row.char_id);
      totalLive++;

      if (!explicit && graveyard.has(row.char_id)) { skipped++; continue; }

      const hadLocal  = !!next[row.char_id];
      const localJson = hadLocal ? JSON.stringify(next[row.char_id]) : null;
      // Merge as live, dropping the deleted flag so resurrection works.
      mergeRowInto(next, isTomb ? { ...row, deleted_at: null } : row, { force });
      const hasLocal  = !!next[row.char_id];

      if (isTomb && hasLocal) resurrect.push(row.char_id);
      if (!hadLocal && hasLocal) added++;
      else if (hadLocal && hasLocal && JSON.stringify(next[row.char_id]) !== localJson) updated++;
    }

    // Force restore: drop local-only entries so local mirrors the cloud.
    if (force) {
      for (const id of Object.keys(next)) {
        if (!cloudLiveIds.has(id)) { delete next[id]; deleted++; }
      }
    }

    applyingRemote = true;
    try { saveAll(next); } finally { applyingRemote = false; }
    snapshot = next;
    lastCloudLiveIds = cloudLiveIds;

    // Prune graveyard ids that no longer exist in the cloud (tidy up).
    if (!explicit && graveyard.size) {
      let changed = false;
      for (const id of [...graveyard]) {
        if (!cloudLiveIds.has(id)) { graveyard.delete(id); changed = true; }
      }
      if (changed) saveGraveyard(graveyard);
    }

    // Re-push resurrected rows as live so the cloud tombstone is cleared.
    for (const id of resurrect) {
      if (next[id]) pending.set(id, next[id]);
    }

    // Auto-back-up any local-only characters not yet in the cloud (skip in
    // force mode, where local has been made to mirror the cloud).
    if (!force) {
      for (const [id, ch] of Object.entries(next)) {
        if (!cloudLiveIds.has(id)) pending.set(id, ch);
      }
    }
    if (pending.size) scheduleFlush();

    setCloudCount(totalLive);
    recomputeHidden();
    setStatus('idle');
    return { added, updated, deleted, total: totalLive, skipped, error: null };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn('[vault] pull failed', msg);
    setStatus('error', `Pull: ${msg}`);
    return { added: 0, updated: 0, deleted: 0, total: 0, skipped: 0, error: msg };
  }
}

// Force-push every local character to the cloud. Bypasses the debounced
// diff queue — used by the "Backup to Cloud" button so the user gets an
// unambiguous "yes everything is up there" round-trip on demand.
// Verifies by re-counting the live rows in the cloud after the writes;
// returns that count so the caller can prove the persistence to the user.
export async function pushAllVault() {
  if (!userId) return { pushed: 0, cloudTotal: null, error: 'Not signed in' };
  const chars = loadAll();
  const entries = Object.entries(chars);
  if (entries.length === 0) {
    const cloudTotal = await fetchCloudCount();
    setStatus('idle');
    return { pushed: 0, cloudTotal, error: null };
  }
  setStatus('pushing');
  let pushed = 0;
  try {
    for (const [id, ch] of entries) {
      const { error } = await supabase
        .from('player_characters')
        .upsert(liveRow(userId, id, ch), { onConflict: 'player_id,char_id' });
      if (error) throw error;
      lastCloudLiveIds.add(id);
      pushed++;
    }
    snapshot = chars;
    pending.clear();
    clearTimeout(pushTimer);
    setStatus('idle');
    const cloudTotal = await fetchCloudCount();
    return { pushed, cloudTotal, error: null };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn('[vault] backup failed', msg);
    setStatus('error', `Backup: ${msg}`);
    return { pushed, cloudTotal: null, error: msg };
  }
}

function applyRemoteRow(row) {
  if (!row) return;
  if (row.deleted_at) return;                 // ignore tombstones; cloud is a backup
  if (loadGraveyard().has(row.char_id)) return; // deleted here — don't resurrect

  const next = { ...loadAll() };
  const before = JSON.stringify(next[row.char_id]);
  mergeRowInto(next, row);
  lastCloudLiveIds.add(row.char_id);
  if (JSON.stringify(next[row.char_id]) === before) return;

  applyingRemote = true;
  try { saveAll(next); } finally { applyingRemote = false; }
  snapshot = next;
  fetchCloudCount();
}

// ── Auth lifecycle ────────────────────────────────────────────────────────

function subscribeRealtime(uid) {
  if (realtimeCh) { supabase.removeChannel(realtimeCh); realtimeCh = null; }
  realtimeCh = supabase
    .channel(`vault-${uid}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'player_characters', filter: `player_id=eq.${uid}` },
      (payload) => applyRemoteRow(payload.new || payload.old))
    .subscribe();
}

function unsubscribeRealtime() {
  if (realtimeCh) { supabase.removeChannel(realtimeCh); realtimeCh = null; }
}

async function onSignedIn(uid) {
  userId = uid;
  snapshot = loadAll();
  subscribeRealtime(uid);
  await pullVaultNow();
}

function onSignedOut() {
  userId = null;
  unsubscribeRealtime();
  setCloudCount(null);
  setHiddenCount(0);
  lastCloudLiveIds = new Set();
  pending.clear();
  clearTimeout(pushTimer);
  setStatus('unauth');
}

export async function startVaultAutoSync() {
  if (started) return;
  if (!isConfigured()) { setStatus('offline'); return; }
  started = true;

  subscribe(onLocalChange);
  snapshot = loadAll();

  supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === 'SIGNED_IN' && session?.user) onSignedIn(session.user.id);
    else if (evt === 'SIGNED_OUT')            onSignedOut();
  });

  const { data } = await supabase.auth.getUser();
  if (data?.user) await onSignedIn(data.user.id);
  else            setStatus('unauth');
}
