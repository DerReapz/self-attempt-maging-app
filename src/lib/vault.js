// Per-player character vault.
//
// When the user is signed in, every locally-saved character is mirrored
// into public.player_characters under their auth user id. On a fresh
// install or new device, signing in pulls the vault back down, merging
// row-by-row against any local state via last-write-wins on the
// client-side updatedAt timestamp. Realtime keeps two signed-in devices
// of the same account converged live.

import { supabase, isConfigured } from './supabase.js';
import { loadAll, saveAll, subscribe } from '../utils/storage.js';

const PUSH_DEBOUNCE_MS = 700;

let snapshot       = {};                 // last-known character map (id → ch)
let pending        = new Map();          // char_id → ch | null (null = soft-delete)
let pushTimer      = null;
let realtimeCh     = null;
let userId         = null;
let started        = false;
let applyingRemote = false;              // suppress push handler during merges

const status     = { current: 'offline', lastError: '' };
const listeners  = new Set();

const setStatus = (s, lastError) => {
  status.current = s;
  if (lastError !== undefined) status.lastError = lastError;
  if (s !== 'error') status.lastError = '';
  for (const fn of listeners) { try { fn(status.current, status.lastError); } catch { /* ignore */ } }
};

export const getVaultStatus    = () => status.current;
export const getVaultLastError = () => status.lastError;
export const subscribeVaultStatus = (fn) => {
  listeners.add(fn);
  try { fn(status.current, status.lastError); } catch { /* ignore */ }
  return () => listeners.delete(fn);
};

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

function tombstoneRow(uid, id, prev) {
  const now = new Date().toISOString();
  return {
    player_id:         uid,
    char_id:           id,
    name:              prev?.sheet?.identity?.name || 'Deleted Mage',
    sheet:             prev?.sheet || {},
    client_updated_at: now,
    deleted_at:        now,
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
      const row = ch == null ? tombstoneRow(userId, id, snapshot[id]) : liveRow(userId, id, ch);
      const { error } = await supabase
        .from('player_characters')
        .upsert(row, { onConflict: 'player_id,char_id' });
      if (error) throw error;
    }
    setStatus('idle');
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
  for (const [id, ch] of Object.entries(allChars)) {
    if (!prev[id] || prev[id].updatedAt !== ch.updatedAt) {
      pending.set(id, ch);
    }
  }
  for (const id of Object.keys(prev)) {
    if (!(id in allChars)) pending.set(id, null);
  }
  snapshot = allChars;
  if (pending.size) scheduleFlush();
}

// ── Pull / merge ──────────────────────────────────────────────────────────

function mergeRowInto(next, row) {
  const localCh  = next[row.char_id];
  const remoteTs = row.client_updated_at ? new Date(row.client_updated_at).getTime() : 0;
  const localTs  = localCh?.updatedAt || 0;

  if (row.deleted_at) {
    if (localCh && localTs <= remoteTs) delete next[row.char_id];
    return;
  }
  if (!localCh || remoteTs > localTs) {
    next[row.char_id] = { ...(localCh || {}), ...rowToLocal(row) };
  }
}

export async function pullVaultNow() {
  if (!userId) return { added: 0, updated: 0, deleted: 0, error: 'Not signed in' };
  setStatus('pulling');
  try {
    const { data, error } = await supabase
      .from('player_characters')
      .select('char_id, name, sheet, client_updated_at, deleted_at')
      .eq('player_id', userId);
    if (error) throw error;

    const before = loadAll();
    const next   = { ...before };
    const remoteIds = new Set();
    let added = 0, updated = 0, deleted = 0;

    for (const row of (data || [])) {
      remoteIds.add(row.char_id);
      const hadLocal = !!next[row.char_id];
      const localJson = hadLocal ? JSON.stringify(next[row.char_id]) : null;
      mergeRowInto(next, row);
      const hasLocal = !!next[row.char_id];

      if (row.deleted_at) {
        if (hadLocal && !hasLocal) deleted++;
      } else if (!hadLocal && hasLocal) {
        added++;
      } else if (hadLocal && hasLocal && JSON.stringify(next[row.char_id]) !== localJson) {
        updated++;
      }
    }

    applyingRemote = true;
    try { saveAll(next); } finally { applyingRemote = false; }
    snapshot = next;

    for (const [id, ch] of Object.entries(next)) {
      if (!remoteIds.has(id)) pending.set(id, ch);
    }
    if (pending.size) scheduleFlush();
    setStatus('idle');
    return { added, updated, deleted, error: null };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn('[vault] pull failed', msg);
    setStatus('error', `Pull: ${msg}`);
    return { added: 0, updated: 0, deleted: 0, error: msg };
  }
}

function applyRemoteRow(row) {
  if (!row) return;
  const next = { ...loadAll() };
  const before = JSON.stringify(next[row.char_id]);
  mergeRowInto(next, row);
  if (JSON.stringify(next[row.char_id]) === before && !(row.deleted_at && next[row.char_id] === undefined)) return;

  applyingRemote = true;
  try { saveAll(next); } finally { applyingRemote = false; }
  snapshot = next;
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
