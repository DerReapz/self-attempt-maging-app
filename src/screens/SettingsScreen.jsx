import { useState, useEffect } from 'react';
import { useTheme, useSetTheme, THEMES, buildCustomTheme } from '../context/ThemeContext.jsx';
import { PROVIDERS, WEB_PROVIDERS, getStoredProvider, getStoredKey, getStoredMode, storeMode, getStoredWebProvider, storeWebProvider } from '../utils/aiProvider.js';
import ProviderBar from '../components/ProviderBar.jsx';
import { exportCharsToJson } from '../utils/storage.js';
import { exportAllAsPDFZip } from '../utils/backup.js';
import {
  NATIVE_DIRS, getNativeDir, setNativeDir,
  supportsFileSystemAccess, getStoredDirHandle, pickBackupFolder, clearDirHandle,
} from '../utils/backupLocation.js';

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

function isNativePlatform() {
  try { return window?.Capacitor?.isNativePlatform?.() === true; } catch { return false; }
}

function BackupLocationSection() {
  const G       = useTheme();
  const native  = isNativePlatform();
  const hasFSA  = !native && supportsFileSystemAccess();

  const [nDir,       setNDir]       = useState(() => getNativeDir());
  const [folderName, setFolderName] = useState('');
  const [picking,    setPicking]    = useState(false);

  // Load the stored folder name for display on web
  useEffect(() => {
    if (!hasFSA) return;
    getStoredDirHandle().then(h => setFolderName(h?.name || '')).catch(() => {});
  }, [hasFSA]);

  const handlePickFolder = async () => {
    setPicking(true);
    try {
      const h = await pickBackupFolder();
      setFolderName(h.name);
    } catch (e) {
      if (e.name !== 'AbortError') alert('Could not set folder: ' + e.message);
    } finally {
      setPicking(false);
    }
  };

  const handleClear = async () => {
    await clearDirHandle();
    setFolderName('');
  };

  const handleNativeDir = (id) => {
    setNDir(id);
    setNativeDir(id);
  };

  const pill = (active) => ({
    flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
    padding: '9px 4px', borderRadius: 2, cursor: 'pointer',
    border: `1px solid ${active ? G.gold : G.border}`,
    background: active ? G.goldFaint : 'transparent',
    color: active ? G.gold : G.muted,
  });

  return (
    <Section title="Backup Location">
      {native ? (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            {NATIVE_DIRS.map(d => (
              <button key={d.id} onClick={() => handleNativeDir(d.id)} style={pill(nDir === d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <Hint>{NATIVE_DIRS.find(d => d.id === nDir)?.hint}</Hint>
        </>
      ) : hasFSA ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{
              flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 2,
              border: `1px solid ${G.border}`, fontSize: 13, color: folderName ? G.text : G.muted,
              fontStyle: folderName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {folderName || 'Browser default downloads folder'}
            </div>
            <button onClick={handlePickFolder} disabled={picking} style={{
              fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
              padding: '8px 14px', borderRadius: 2, cursor: 'pointer', flexShrink: 0,
              border: `1px solid ${G.gold}`, background: 'transparent', color: G.gold,
            }}>
              {picking ? '…' : folderName ? 'Change' : 'Choose Folder'}
            </button>
            {folderName && (
              <button onClick={handleClear} style={{
                fontFamily: 'Cinzel,serif', fontSize: 10, padding: '8px 12px', borderRadius: 2,
                cursor: 'pointer', border: `1px solid ${G.red}44`, background: 'transparent', color: G.red, flexShrink: 0,
              }}>✕</button>
            )}
          </div>
          <Hint>
            {folderName
              ? `Backups will be saved directly to "${folderName}".`
              : 'Choose a folder to save backups there automatically. Otherwise files go to your browser\'s default downloads folder.'}
          </Hint>
        </>
      ) : (
        <Hint>
          Backup files are saved to your browser's default downloads folder. To change it, update the download location in your browser settings.
        </Hint>
      )}
    </Section>
  );
}

export default function SettingsScreen() {
  const G = useTheme();
  const [provider, setProvider] = useState(() => getStoredProvider());
  const [aiMode,    setAiMode]    = useState(() => getStoredMode());
  const [webProv,   setWebProv]   = useState(() => getStoredWebProvider());
  const [apiKey,    setApiKey]    = useState(() => getStoredKey(getStoredProvider()));
  const [textSize,  setTextSize]  = useState(() => localStorage.getItem('mage_text_size') || 'normal');

  const handleAiMode = (m) => { setAiMode(m); storeMode(m); };
  const handleWebProv = (id) => { setWebProv(id); storeWebProvider(id); };
  const [toast,    setToast]    = useState('');

  const showToast = (msg, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  const handleTextSize = (id) => {
    setTextSize(id);
    applyTextSize(id);
  };

  const [backupBusy, setBackupBusy] = useState(false);

  const handleExport = async () => {
    try {
      const uri = await exportCharsToJson();
      showToast(uri ? `Saved to ${uri}` : 'Exported ✓', 4000);
    } catch (e) {
      showToast('Export failed: ' + e.message);
    }
  };

  const handleBackupZip = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const { loadAll } = await import('../utils/storage.js');
      await exportAllAsPDFZip(loadAll());
      showToast('Backup ZIP downloaded ✓', 4000);
    } catch (e) {
      showToast('Backup failed: ' + e.message);
    } finally {
      setBackupBusy(false);
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

        <Section title="AI Query Mode">
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['api','Direct API'],['web','Open in Browser']].map(([m, lbl]) => {
              const active = aiMode === m;
              return (
                <button key={m} onClick={() => handleAiMode(m)} style={{
                  flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
                  padding: '10px 4px', borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${active ? G.gold : G.border}`,
                  background: active ? G.goldFaint : 'transparent',
                  color: active ? G.gold : G.muted,
                }}>
                  {lbl}
                </button>
              );
            })}
          </div>

          {aiMode === 'api' ? (
            <>
              <p style={{ fontSize: 12, color: G.textDim, lineHeight: 1.7, marginBottom: 14 }}>
                Queries are answered directly in the app using your API key.
                Select a provider, enter your key, then tap <strong style={{ color: G.gold, fontFamily: 'Cinzel,serif', fontSize: 10 }}>Save</strong>.
                Keys are stored only on this device.
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
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: G.textDim, lineHeight: 1.7, marginBottom: 14 }}>
                Your query is formatted and copied to clipboard, then the selected AI's chat opens in your browser — just paste and go. No API key needed.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WEB_PROVIDERS.map(p => {
                  const active = webProv === p.id;
                  return (
                    <button key={p.id} onClick={() => handleWebProv(p.id)} style={{
                      flex: '1 1 80px', fontFamily: 'Cinzel,serif', fontSize: 11,
                      letterSpacing: '.1em', padding: '10px 4px', borderRadius: 2, cursor: 'pointer',
                      border: `1px solid ${active ? G.gold : G.border}`,
                      background: active ? G.goldFaint : 'transparent',
                      color: active ? G.gold : G.muted,
                    }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: G.muted, lineHeight: 1.6, marginTop: 10 }}>
                Selected: <span style={{ color: G.gold, fontFamily: 'Cinzel,serif' }}>
                  {WEB_PROVIDERS.find(p => p.id === webProv)?.label}
                </span> — tap Ask in Oracle or Cassandra, then paste the copied prompt into the chat.
              </p>
            </>
          )}
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

        <BackupLocationSection />

        <Section title="Character Data">
          <ActionBtn color={G.teal} onClick={handleBackupZip}>{backupBusy ? 'Building…' : '↓ Backup All — PDF ZIP'}</ActionBtn>
          <Hint>Exports every character as a PDF, bundled into a single .zip file.</Hint>
          <div style={{ marginTop: 10 }}>
            <ActionBtn color={G.goldDim} onClick={handleExport}>↓ Export .mage (JSON)</ActionBtn>
            <Hint>Saves mage_characters.json — use this to re-import characters into the app.</Hint>
          </div>
          <div style={{ marginTop: 14 }}>
            <ActionBtn color={G.red} onClick={handleClearChars}>✕ Delete All Characters</ActionBtn>
            <Hint>Permanently removes all character data from this device. Backup first to keep a copy.</Hint>
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
