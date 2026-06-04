import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import { loadAll, saveAll, setSyncCallback } from '../utils/storage.js';
import { fetchFromVault, debouncedSync } from '../utils/vaultSync.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  // undefined = resolving session, null = signed out, object = signed in
  const [user,       setUser]       = useState(supabase ? undefined : null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [skipped,    setSkipped]    = useState(() => !!localStorage.getItem('mage_auth_skipped'));

  useEffect(() => {
    if (!supabase) return;

    // Resolve existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSignIn(session.user);
      else setUser(null);
    });

    // React to subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleSignIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        setSyncCallback(null);
        setSyncStatus('idle');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (u) => {
    setSyncStatus('syncing');
    try {
      await syncOnLogin(u.id);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
    setSyncCallback((data) => debouncedSync(u.id, data));
    // Upload merged state so cloud reflects any local-only characters
    debouncedSync(u.id, loadAll(), 1000);
    setUser(u);
  };

  const syncOnLogin = async (uid) => {
    const local = loadAll();
    const rows  = await fetchFromVault(uid);

    if (!rows.length) {
      // First login — push local characters up
      debouncedSync(uid, local, 0);
      return;
    }

    // Merge: cloud row wins if its updated_at is newer than the local copy
    const merged = { ...local };
    for (const row of rows) {
      const serverTs  = new Date(row.updated_at).getTime();
      const localChar = local[row.local_id];
      if (!localChar || serverTs > (localChar.updatedAt || 0)) {
        merged[row.local_id] = { ...row.sheet, id: row.local_id };
      }
    }
    saveAll(merged);
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('mage_auth_skipped');
    setSkipped(false);
  };

  const skipLogin = () => {
    localStorage.setItem('mage_auth_skipped', '1');
    setSkipped(true);
  };

  const showLogin = () => {
    localStorage.removeItem('mage_auth_skipped');
    setSkipped(false);
  };

  return (
    <AuthCtx.Provider value={{ user, syncStatus, skipped, login, register, logout, skipLogin, showLogin }}>
      {children}
    </AuthCtx.Provider>
  );
}
