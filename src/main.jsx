import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

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
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
