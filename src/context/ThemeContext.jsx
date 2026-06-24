import { createContext, useContext, useState } from 'react';

// ── Built-in themes ────────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    bg: '#080808', card: '#0e0e0e', surface: '#120f0a',
    border: '#c8a84b33', gold: '#c8a84b', goldDim: '#c8a84b88', goldFaint: '#c8a84b2a',
    text: '#e8d9b0', textDim: '#b8a880', muted: '#8a7a60',
    purple: '#c4a0e8', teal: '#5cad8f', red: '#c03030', blue: '#7ab8c8',
  },
  light: {
    bg: '#f5eed8', card: '#ede3c5', surface: '#f2e8d0',
    border: '#7a501022', gold: '#7a5010', goldDim: '#7a501088', goldFaint: '#7a501018',
    text: '#1a0e04', textDim: '#5a3a18', muted: '#8a6a40',
    purple: '#6a30a0', teal: '#1a7050', red: '#901010', blue: '#1a5080',
  },
};

// ── Custom theme builder ───────────────────────────────────────────────────
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function toHex([r,g,b]) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function shift(hex, d) {
  return toHex(hexToRgb(hex).map(v => v + d));
}

export function buildCustomTheme(bg, accent) {
  const [r,g,b] = hexToRgb(bg);
  const lum = (r*299 + g*587 + b*114) / 1000;
  const dark = lum < 128;
  const d = dark ? 8 : -14;
  return {
    bg,
    card:      shift(bg, d),
    surface:   shift(bg, d * 1.6),
    border:    accent + '33',
    gold:      accent,
    goldDim:   accent + '88',
    goldFaint: accent + '1e',
    text:      dark ? '#e8e0d0' : '#1a1208',
    textDim:   dark ? '#c0b0a0' : '#503a20',
    muted:     dark ? '#8a8070' : '#8a7060',
    purple:    dark ? '#c4a0e8' : '#6a30a0',
    teal:      dark ? '#5cad8f' : '#1a7050',
    red:       dark ? '#c03030' : '#901010',
    blue:      dark ? '#7ab8c8' : '#1a5080',
  };
}

// ── Context ────────────────────────────────────────────────────────────────
const Ctx = createContext({ G: THEMES.dark, setTheme: () => {} });

export const useTheme    = () => useContext(Ctx).G;
export const useSetTheme = () => useContext(Ctx).setTheme;

// Validate "#rrggbb"; fall back to a sentinel so a corrupted localStorage
// value can't produce NaN-laced CSS that wedges the UI on cold start.
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v, fb) => (typeof v === 'string' && HEX.test(v) ? v : fb);

export function ThemeProvider({ children }) {
  const [G, setG] = useState(() => {
    try {
      const mode = localStorage.getItem('mage_theme_mode') || 'dark';
      if (mode === 'custom') {
        const bg  = safeHex(localStorage.getItem('mage_custom_bg'),  '#0d0808');
        const acc = safeHex(localStorage.getItem('mage_custom_acc'), '#c8a84b');
        return buildCustomTheme(bg, acc);
      }
      return THEMES[mode] || THEMES.dark;
    } catch {
      return THEMES.dark;
    }
  });

  return <Ctx.Provider value={{ G, setTheme: setG }}>{children}</Ctx.Provider>;
}
