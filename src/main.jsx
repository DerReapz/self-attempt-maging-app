import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Global handlers so an uncaught error or unhandled promise rejection
// during startup is shown to the user instead of leaving a blank screen.
// Once anything fires we paint an in-place overlay with the message and
// a Reload button — the same first-aid the ErrorBoundary offers for
// render-time crashes.
function showBootError(label, msg) {
  try {
    if (document.getElementById('mage-boot-error')) return;
    const w = document.createElement('div');
    w.id = 'mage-boot-error';
    w.style.cssText = [
      'position:fixed','inset:0','z-index:99999','background:#080808',
      'color:#e8d9b0','font-family:EB Garamond, Georgia, serif',
      'padding:24px 18px','overflow:auto','box-sizing:border-box',
    ].join(';');
    w.innerHTML = `
      <div style="max-width:720px;margin:0 auto;">
        <div style="font-family:Cinzel Decorative,Cinzel,serif;font-size:22px;color:#c8a84b;letter-spacing:.1em;text-align:center;margin-bottom:6px;">The Tellurian Falters</div>
        <div style="font-style:italic;font-size:14px;color:#8a7a60;text-align:center;margin-bottom:18px;">${label}</div>
        <pre style="white-space:pre-wrap;word-break:break-word;background:rgba(192,48,48,0.08);border:1px solid #c0303088;border-radius:4px;padding:12px 14px;font-size:13px;color:#c03030;font-family:ui-monospace,monospace;"></pre>
        <button id="mage-boot-reload" style="margin-top:16px;font-family:Cinzel,serif;font-size:11px;letter-spacing:.18em;border:1px solid #c8a84b;border-radius:3px;background:transparent;color:#c8a84b;padding:10px 18px;cursor:pointer;">↻ RELOAD</button>
      </div>`;
    w.querySelector('pre').textContent = msg || 'Unknown error';
    w.querySelector('#mage-boot-reload').addEventListener('click', () => window.location.reload());
    document.body.appendChild(w);
  } catch { /* nothing else we can do */ }
}

window.addEventListener('error', (e) => {
  showBootError('Startup error', (e?.error && (e.error.message + '\n\n' + e.error.stack)) || e?.message || 'Unknown error');
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e?.reason;
  const msg = r && (r.message || String(r));
  showBootError('Unhandled promise rejection', msg ? (msg + (r.stack ? '\n\n' + r.stack : '')) : 'Unknown rejection');
});

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
