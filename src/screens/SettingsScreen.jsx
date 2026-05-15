import { useState } from 'react';
import { G } from '../palette.js';
import { PROVIDERS, getStoredProvider, getStoredKey } from '../utils/aiProvider.js';
import ProviderBar from '../components/ProviderBar.jsx';
import { exportCharsToJson } from '../utils/storage.js';

const TEXT_SIZES = [
  { id: 'normal', label: 'Normal',   pct: '100%' },
  { id: 'large',  label: 'Large',    pct: '112%' },
  { id: 'xl',     label: 'X-Large',  pct: '125%' },
];

export function applyTextSize(id) {
  const found = TEXT_SIZES.find(t => t.id === id) || TEXT_SIZES[0];
  document.documentElement.style.fontSize = found.pct;
  localStorage.setItem('mage_text_size', id);
}

function Section({ title, children }) {
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

export default function SettingsScreen() {
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

      {/* Header */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '20px 20px 14px', borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 20, color: G.gold, textShadow: `0 0 30px ${G.gold}44` }}>
          SETTINGS
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 110px', minHeight: 0 }}>

        {/* ── AI Provider & Keys ── */}
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

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <div style={{ fontSize: 12, color: G.muted, marginBottom: 10 }}>Text Size</div>
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
          <Hint>Adjusts the base text size across the entire app. Takes effect immediately.</Hint>
        </Section>

        {/* ── Character Data ── */}
        <Section title="Character Data">
          <ActionBtn color={G.teal} onClick={handleExport}>↓ Export All Characters</ActionBtn>
          <Hint>Saves mage_characters.json to your device's Documents folder.</Hint>
          <div style={{ marginTop: 14 }}>
            <ActionBtn color={G.red} onClick={handleClearChars}>✕ Delete All Characters</ActionBtn>
            <Hint>Permanently removes all character data from this device. Export first to keep a backup.</Hint>
          </div>
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.9 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: G.gold, marginBottom: 2 }}>
              Mage: The Ascension Companion
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 12 }}>
              2nd Edition · Character Manager & Reference
            </div>
            <div style={{ fontSize: 11, color: '#5a5040', lineHeight: 1.7 }}>
              Mage: The Ascension is a trademark of Paradox Interactive AB. This is an unofficial fan companion app, not affiliated with or endorsed by Paradox Interactive or White Wolf Publishing. All game content references are used for personal, non-commercial play aid purposes only.
            </div>
          </div>
        </Section>
      </div>

      {/* Toast */}
      {toast ? (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: `1px solid ${G.gold}`, borderRadius: 3,
          padding: '8px 18px', color: G.gold, fontFamily: 'Cinzel,serif', fontSize: 11,
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
