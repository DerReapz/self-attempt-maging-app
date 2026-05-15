import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { PROVIDERS, getStoredKey, storeProvider, storeKey } from '../utils/aiProvider.js';

export default function ProviderBar({ provider, apiKey, onProvider, onKey, accent }) {
  const G = useTheme();
  const ac = accent || G.gold;
  const [draft,  setDraft]  = useState(apiKey);
  const [saved,  setSaved]  = useState(false);

  // When parent switches provider, update draft to that provider's stored key
  const handleProvider = (p) => {
    const existing = getStoredKey(p);
    storeProvider(p);
    onProvider(p);
    setDraft(existing);
    onKey(existing);
    setSaved(false);
  };

  const handleSave = () => {
    storeKey(provider, draft);
    onKey(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dirty = draft !== apiKey;

  return (
    <div>
      {/* Provider pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {PROVIDERS.map(p => {
          const active = p.id === provider;
          return (
            <button key={p.id} onClick={() => handleProvider(p.id)} style={{
              flex: 1, fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.06em',
              padding: '5px 2px', borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${active ? ac : G.border}`,
              background: active ? `${ac}22` : 'transparent',
              color: active ? ac : G.muted,
            }}>{p.label}</button>
          );
        })}
      </div>

      {/* Key field + Save button */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="password"
          value={draft}
          onChange={e => { setDraft(e.target.value); setSaved(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          placeholder={PROVIDERS.find(p => p.id === provider)?.hint || 'API key'}
          style={{
            flex: 1, background: '#1a1510',
            border: `1px solid ${dirty ? ac + '88' : G.goldFaint}`,
            borderRadius: 2, color: G.textDim, fontFamily: 'monospace', fontSize: 11,
            padding: '6px 8px', outline: 'none', minWidth: 0,
            transition: 'border-color .15s',
          }}
        />
        <button
          onClick={handleSave}
          style={{
            fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.1em',
            padding: '6px 12px', borderRadius: 2, cursor: 'pointer', flexShrink: 0,
            border: `1px solid ${saved ? G.teal : ac}`,
            background: saved ? `${G.teal}22` : `${ac}18`,
            color: saved ? G.teal : ac,
            transition: 'all .15s',
          }}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}
