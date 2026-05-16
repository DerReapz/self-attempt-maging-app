import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// We allow the app to load without Supabase configured — DM sync is opt-in.
// All Supabase calls in dmSync.js check `isConfigured()` first.
export const isConfigured = () => Boolean(url && key);

export const supabase = createClient(
  url || 'http://invalid.local',
  key || 'invalid',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
);

// Idempotently ensure a public.profiles row exists for the current user.
export async function ensureProfile(handle) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const fallback = user.email?.split('@')[0] || 'mage';
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, handle: handle || fallback }, { onConflict: 'id' });
  if (error) throw error;
  return user;
}
