// DM sync — opt-in cloud push of character sheets to a Supabase backend.
//
// Storage layout (all in localStorage):
//   mage_session_links : { [session_id]: localCharId }
// One linked character per session; a player can be in many sessions.
//
// Hook into the existing save path via storage.subscribe().

import { supabase, ensureProfile, isConfigured } from './supabase.js';
import { loadAll, subscribe } from '../utils/storage.js';

const LINKS_KEY = 'mage_session_links';

export function getLinks() {
  try { return JSON.parse(localStorage.getItem(LINKS_KEY) || '{}'); }
  catch { return {}; }
}

function saveLinks(links) {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export function getLink(sessionId) {
  return getLinks()[sessionId] || null;
}

export function setLink(sessionId, localCharId) {
  const next = { ...getLinks(), [sessionId]: localCharId };
  saveLinks(next);
}

export function clearLink(sessionId) {
  const next = { ...getLinks() };
  delete next[sessionId];
  saveLinks(next);
}

// ── Auth helpers ───────────────────────────────────────────────────────────

export async function getUser() {
  if (!isConfigured()) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await ensureProfile();
}

export async function signUp(email, password, handle) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await ensureProfile(handle);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ── Session management ────────────────────────────────────────────────────

export async function listMySessions() {
  if (!isConfigured()) return [];
  // RLS combines sessions where the user is DM with sessions where they are a member.
  const { data, error } = await supabase
    .from('game_sessions')
    .select('id, name, invite_code, dm_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Join by invite code. Calls a SECURITY DEFINER RPC so the player can look up
// the session by code without needing to SELECT it first (RLS blocks that
// pre-membership). The RPC inserts the membership and returns the session.
export async function joinSession(code) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) throw new Error('Enter an invite code');
  const { data, error } = await supabase.rpc('join_session_by_code', { p_code: normalized });
  if (error) throw error;
  if (!data) throw new Error('Invite code not found');
  return data;
}

export async function leaveSession(sessionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('session_members')
    .delete()
    .eq('session_id', sessionId)
    .eq('player_id', user.id);
  if (error) throw error;
  clearLink(sessionId);
}

// ── Pushing a character ───────────────────────────────────────────────────

async function pushOne(sessionId, ch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const name = ch?.sheet?.identity?.name || 'Unnamed Mage';
  const { error } = await supabase
    .from('characters')
    .upsert(
      { session_id: sessionId, player_id: user.id, name, sheet: ch.sheet || {} },
      { onConflict: 'session_id,player_id' },
    );
  if (error) throw error;
}

export async function pushBoundCharacter(sessionId) {
  const localId = getLink(sessionId);
  if (!localId) throw new Error('No character bound to this session');
  const ch = loadAll()[localId];
  if (!ch) throw new Error('Bound character no longer exists');
  await pushOne(sessionId, ch);
}

// ── Auto-sync on save ─────────────────────────────────────────────────────

let debounceTimer = null;
let pendingChars  = null;

function scheduleSync(allChars) {
  pendingChars = allChars;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const chars = pendingChars;
    pendingChars = null;
    debounceTimer = null;
    if (!isConfigured()) return;
    const user = await getUser().catch(() => null);
    if (!user) return;
    const links = getLinks();
    const tasks = Object.entries(links)
      .filter(([, localId]) => chars[localId])
      .map(([sessionId, localId]) => pushOne(sessionId, chars[localId]).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[dmSync] push failed', sessionId, e.message);
      }));
    await Promise.all(tasks);
  }, 800);
}

let started = false;
export function startAutoSync() {
  if (started) return;
  started = true;
  subscribe(scheduleSync);
}
