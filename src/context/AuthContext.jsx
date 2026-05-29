import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../utils/firebase.js';
import { loadAll, saveAll, setSyncCallback } from '../utils/storage.js';
import { syncOnLogin, debouncedUpload } from '../utils/cloudSync.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  // undefined = still loading, null = signed out, object = signed in
  const [user,       setUser]       = useState(auth ? undefined : null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [skipped,    setSkipped]    = useState(() => !!localStorage.getItem('mage_auth_skipped'));

  useEffect(() => {
    if (!auth) return; // Firebase not configured — stay in offline mode

    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setSyncStatus('syncing');
        try {
          await syncOnLogin(u.uid, loadAll, saveAll);
          setSyncStatus('synced');
        } catch {
          setSyncStatus('error');
        }
        setSyncCallback((data) => debouncedUpload(u.uid, data));
      } else {
        setSyncCallback(null);
        setSyncStatus('idle');
      }
      setUser(u);
    });
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    await signOut(auth);
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
