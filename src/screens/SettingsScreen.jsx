import { useState } from 'react';
import { useTheme, useSetTheme, THEMES, buildCustomTheme } from '../context/ThemeContext.jsx';
import { PROVIDERS, getStoredProvider, getStoredKey } from '../utils/aiProvider.js';
import ProviderBar from '../components/ProviderBar.jsx';
import { exportCharsToJson } from '../utils/storage.js';

const TEXT_SIZES = [
  { id: 'normal', label: 'Normal', zoom: '1'    },
  { id: 'large',  label: 'Large',  zoom: '1.12' },
  { id: 'xl',     label: 'X-Large',zoom: '1.25' },
];

export function applyTextSize(id) {
  const found = TEXT_SIZES.find(t => t.id === id) || TEXT_SIZES[0];
  document.documentElement.style.zoom = found.zoom;
  localStorage.setItem('mage_text_size', id);
}

const BG_PRESETS   = ['#080808','#0a0a10','#0d0808','#080d08','#1a1208','#0a0812','#f5eed8','#eee8d0','#dde8ee'];
const ACC_PRESETS  = ['#c8a84b','#8aa0c8','#a870c8','#70c8a8','#c87870','#c8b090','#6080c8','#c89860','#7ab87a'];

function Section({ title, children }) {
  const G = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.28em',
        color: G.gold, textTransform: 'uppercase',
        paddingBottom: 8, marginBottom: 12,
        borderBottom: `1px solid ${G.goldFaint}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }) {
  const G = useTheme();
  return <p style={{ fontSize: 11, color: G.muted, lineHeight: 1.65, marginTop: 6 }}>{children}</p>;
}

function ActionBtn({ color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em',
      padding: '11px', borderRadius: 2, cursor: 'pointer',
      border: `1px solid ${color}`, background: 'transparent', color,
    }}>
      {children}
    </button>
  );
}

function Swatch({ color, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 3, background: color, cursor: 'pointer',
      border: selected ? '2px solid #fff' : '2px solid transparent',
      boxShadow: selected ? `0 0 8px ${color}` : 'none',
      flexShrink: 0,
    }} />
  );
}

function ThemeSection() {
  const G = useTheme();
  const setTheme = useSetTheme();
  const [mode, setMode] = useState(() => localStorage.getItem('mage_theme_mode') || 'dark');
  const [customBg,  setCustomBg]  = useState(() => localStorage.getItem('mage_custom_bg')  || '#0d0808');
  const [customAcc, setCustomAcc] = useState(() => localStorage.getItem('mage_custom_acc') || '#c8a84b');

  const applyMode = (m) => {
    setMode(m);
    localStorage.setItem('mage_theme_mode', m);
    if (m === 'dark')   setTheme(THEMES.dark);
    if (m === 'light')  setTheme(THEMES.light);
    if (m === 'custom') setTheme(buildCustomTheme(customBg, customAcc));
  };

  const applyCustom = (bg, acc) => {
    localStorage.setItem('mage_custom_bg',  bg);
    localStorage.setItem('mage_custom_acc', acc);
    if (mode === 'custom') setTheme(buildCustomTheme(bg, acc));
  };

  const MODES = [
    { id: 'dark',   label: 'Dark'   },
    { id: 'light',  label: 'Light'  },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <Section title="Theme">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {MODES.map(m => {
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => applyMode(m.id)} style={{
              flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
              padding: '9px 4px', borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${active ? G.gold : G.border}`,
              background: active ? G.goldFaint : 'transparent',
              color: active ? G.gold : G.muted,
            }}>
              {m.label}
            </button>
          );
        })}
      </div>

      {mode === 'custom' && (
        <div style={{ padding: '10px 12px', border: `1px solid ${G.goldFaint}`, borderRadius: 2 }}>
          <div style={{ fontSize: 11, color: G.muted, marginBottom: 8 }}>Background</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {BG_PRESETS.map(c => (
              <Swatch key={c} color={c} selected={customBg === c} onClick={() => { setCustomBg(c); applyCustom(c, customAcc); }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="color" value={customBg}
                onChange={e => { setCustomBg(e.target.value); applyCustom(e.target.value, customAcc); }}
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 3, background: 'transparent', cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: G.muted, marginBottom: 8 }}>Accent</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ACC_PRESETS.map(c => (
              <Swatch key={c} color={c} selected={customAcc === c} onClick={() => { setCustomAcc(c); applyCustom(customBg, c); }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="color" value={customAcc}
                onChange={e => { setCustomAcc(e.target.value); applyCustom(customBg, e.target.value); }}
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 3, background: 'transparent', cursor: 'pointer' }} />
            </div>
          </div>
        </div>
      )}
      <Hint>Theme takes effect immediately across the entire app.</Hint>
    </Section>
  );
}

export default function SettingsScreen() {
  const G = useTheme();
  const [provider, setProvider] = useState(() => getStoredProvider());
  const [apiKey,   setApiKey]   = useState(() => getStoredKey(getStoredProvider()));
  const [textSize, setTextSize] = useState(() => localStorage.getItem('mage_text_size') || 'normal');
  const [toast,    setToast]    = useState('');

  const showToast = (msg, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  const handleTextSize = (id) => {
    setTextSize(id);
    applyTextSize(id);
  };

  const handleExport = async () => {
    try {
      const uri = await exportCharsToJson();
      showToast(uri ? `Saved to ${uri}` : 'Exported ✓', 4000);
    } catch (e) {
      showToast('Export failed: ' + e.message);
    }
  };

  const handleClearChars = () => {
    if (!window.confirm('Delete ALL characters? This cannot be undone.')) return;
    localStorage.removeItem('mage_characters');
    showToast('All characters deleted.');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: G.bg, backgroundImage: 'radial-gradient(ellipse at 50% 0%,#1a1208 0%,transparent 60%)' }}>

      <div style={{ flexShrink: 0, textAlign: 'center', padding: '20px 20px 14px', borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 20, color: G.gold, textShadow: `0 0 30px ${G.gold}44` }}>
          SETTINGS
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 110px', minHeight: 0 }}>

        <Section title="AI Provider & Keys">
          <p style={{ fontSize: 12, color: G.textDim, lineHeight: 1.7, marginBottom: 14 }}>
            Select a provider, enter your API key, then tap <strong style={{ color: G.gold, fontFamily: 'Cinzel,serif', fontSize: 10 }}>Save</strong>.
            Keys are stored only on this device and sent only to the provider's own API.
          </p>
          <ProviderBar
            provider={provider}
            apiKey={apiKey}
            onProvider={p => { setProvider(p); setApiKey(getStoredKey(p)); }}
            onKey={k => setApiKey(k)}
          />
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PROVIDERS.map(p => {
              const saved = !!getStoredKey(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: G.muted, fontFamily: 'Cinzel,serif', letterSpacing: '.06em' }}>{p.label}</span>
                  <span style={{ color: saved ? G.teal : '#555', fontFamily: 'Cinzel,serif' }}>
                    {saved ? '✓ key saved' : '— not set'}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        <ThemeSection />

        <Section title="Text Size">
          <div style={{ display: 'flex', gap: 8 }}>
            {TEXT_SIZES.map(t => {
              const active = textSize === t.id;
              return (
                <button key={t.id} onClick={() => handleTextSize(t.id)} style={{
                  flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
                  padding: '9px 4px', borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${active ? G.gold : G.border}`,
                  background: active ? G.goldFaint : 'transparent',
                  color: active ? G.gold : G.muted,
                }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <Hint>Scales all content including icons. Takes effect immediately.</Hint>
        </Section>

        <Section title="Character Data">
          <ActionBtn color={G.teal} onClick={handleExport}>↓ Export All Characters</ActionBtn>
          <Hint>Saves mage_characters.json to your device's Documents folder.</Hint>
          <div style={{ marginTop: 14 }}>
            <ActionBtn color={G.red} onClick={handleClearChars}>✕ Delete All Characters</ActionBtn>
            <Hint>Permanently removes all character data from this device. Export first to keep a backup.</Hint>
          </div>
        </Section>

        <Section title="About">
          <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.9 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: G.gold, marginBottom: 2 }}>
              Mage: The Ascension Companion
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 12 }}>
              2nd Edition · Character Manager & Reference
            </div>
            <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.7 }}>
              Mage: The Ascension is a trademark of Paradox Interactive AB. This is an unofficial fan companion app, not affiliated with or endorsed by Paradox Interactive or White Wolf Publishing.
            </div>
          </div>
        </Section>
      </div>

      {toast ? (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: G.card, border: `1px solid ${G.gold}`, borderRadius: 3,
          padding: '8px 18px', color: G.gold, fontFamily: 'Cinzel,serif', fontSize: 11,
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
