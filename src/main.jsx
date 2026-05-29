import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { restoreFromBackupIfEmpty } from './utils/storage.js';

CapacitorUpdater.notifyAppReady();

// Global reset
const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; height: 100dvh; background: #080808; color: #e8d9b0; font-family: 'EB Garamond', Georgia, serif; overscroll-behavior: none; }
  input, textarea, button { font-family: inherit; font-size: inherit; }
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }
  textarea { resize: vertical; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0e0e0e; }
  ::-webkit-scrollbar-thumb { background: #c8a84b44; border-radius: 3px; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  @media (orientation: landscape) and (max-height: 480px) {
    #mage-nav button { padding: 4px 2px 5px !important; gap: 1px !important; }
    #mage-nav { min-height: 40px; }
  }
`;
document.head.appendChild(style);

restoreFromBackupIfEmpty().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
});
