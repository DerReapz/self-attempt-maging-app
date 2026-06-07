import { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Toast } from '../components/SharedUI.jsx';
import { loadAll, saveAll, newId, exportCharsToJson, subscribe } from '../utils/storage.js';
import { exportCharAsPDF } from '../utils/pdfExport.js';
import { exportAllAsPDFZip, importFromPDF, importFromPDFZip } from '../utils/backup.js';
import { pullVaultNow, pushAllVault, subscribeVaultStatus } from '../lib/vault.js';
import { getUser } from '../lib/dmSync.js';

export default function CharacterList({ onOpen, onStartCreate }) {
  const G = useTheme();
  const card = { background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, padding: '12px 14px', marginBottom: 12 };
  const btnS = (extra = {}) => ({ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', border: `1px solid ${G.gold}`, borderRadius: 3, background: 'transparent', color: G.gold, padding: '9px 18px', cursor: 'pointer', ...extra });
  const [chars,       setChars]       = useState(loadAll);
  const [toast,       setToast]       = useState('');
  const [busy,        setBusy]        = useState(false);
  const [vaultStatus, setVaultStatus] = useState('offline');
  const [signedIn,    setSignedIn]    = useState(false);
  const lastStatusRef                 = useRef('offline');

  useEffect(() => subscribe((next) => setChars(next)), []);

  useEffect(() => subscribeVaultStatus((s) => {
    // When the auto-pull on sign-in finishes, surface a toast so the user
    // knows the cloud round-trip happened (or failed visibly).
    if (lastStatusRef.current === 'pulling' && s === 'idle') {
      toast2('Cloud sync up to date ✓', 2500);
    } else if (lastStatusRef.current === 'pulling' && s === 'error') {
      toast2('Cloud pull failed — open Settings → DM Sync for details', 5000);
    }
    lastStatusRef.current = s;
    setVaultStatus(s);
  }), []);

  useEffect(() => { getUser().then((u) => setSignedIn(!!u)).catch(() => setSignedIn(false)); }, [vaultStatus]);

  const toast2 = (msg, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  const handleNew = () => {
    const id = newId();
    const updated = { ...loadAll(), [id]: { id, createdAt: Date.now(), updatedAt: Date.now(), sheet: null } };
    saveAll(updated);
    setChars(updated);
    onOpen(id);
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = await new Promise((res, rej) => {
        const inp = Object.assign(document.createElement('input'), {
          type: 'file', accept: '.mage,.json,.pdf,.zip',
        });
        inp.onchange = (e) => {
          const f = e.target.files?.[0];
          f ? res(f) : rej(new Error('No file'));
        };
        document.body.appendChild(inp);
        inp.click();
        document.body.removeChild(inp);
      });

      const name = file.name.toLowerCase();

      if (name.endsWith('.pdf')) {
        const ch      = await importFromPDF(file);
        const id      = ch.id || newId();
        const updated = { ...loadAll(), [id]: { ...ch, id, updatedAt: Date.now() } };
        saveAll(updated);
        setChars(updated);
        toast2(`Restored "${ch.sheet?.identity?.name || 'Unnamed Mage'}" from PDF ✓`);

      } else if (name.endsWith('.zip')) {
        const { chars, skipped } = await importFromPDFZip(file);
        const all = loadAll();
        for (const ch of chars) {
          const id = ch.id || newId();
          all[id]  = { ...ch, id, updatedAt: Date.now() };
        }
        saveAll(all);
        setChars(loadAll());
        const skipNote = skipped.length ? ` (${skipped.length} skipped)` : '';
        toast2(`Restored ${chars.length} character${chars.length !== 1 ? 's' : ''} from ZIP${skipNote} ✓`, 4000);

      } else {
        const data    = JSON.parse(await file.text());
        const id      = data.id || newId();
        const updated = { ...loadAll(), [id]: { ...data, id, updatedAt: Date.now() } };
        saveAll(updated);
        setChars(updated);
        toast2('Character imported ✓');
      }
    } catch (e) {
      if (e.message !== 'No file') toast2('Import failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const uri = await exportCharsToJson();
      toast2(uri ? `Saved to ${uri}` : 'Characters exported ✓', 4000);
    } catch (e) {
      toast2('Export failed: ' + e.message);
    }
  };

  const handleBackupZip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      toast2('Building PDF backup…', 60000);
      await exportAllAsPDFZip(chars);
      toast2('Backup ZIP downloaded ✓', 4000);
    } catch (e) {
      toast2('Backup failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete "${name || 'Unnamed Mage'}"?`)) return;
    const updated = { ...loadAll() };
    delete updated[id];
    saveAll(updated);
    setChars(updated);
  };

  const handleExportSingle = async (ch) => {
    try {
      await exportCharAsPDF(ch);
      toast2('PDF downloaded ✓');
    } catch (e) {
      toast2('PDF export failed: ' + e.message);
    }
  };

  const refreshChars = () => setChars(loadAll());

  const handleRestore = async (force = false) => {
    if (busy) return;
    setBusy(true);
    toast2(force ? 'Force pulling from cloud…' : 'Pulling from cloud…', 60000);
    try {
      // An explicit restore forgets local deletions so anything in the cloud
      // backup comes back (that's the whole point of the button).
      const r = await pullVaultNow({ force, ignoreGraveyard: true });
      if (r.error) {
        toast2(`Cloud pull failed: ${r.error}`, 6000);
        return;
      }
      const changed = r.added + r.updated + r.deleted;
      const noun    = `character${r.total === 1 ? '' : 's'}`;
      if (r.total === 0) {
        toast2('Cloud vault is empty — nothing to restore', 4000);
      } else if (changed === 0) {
        toast2(`Cloud has ${r.total} ${noun}, all match local ✓`, 4000);
      } else {
        toast2(
          `Cloud has ${r.total} ${noun}: +${r.added} new, ↻${r.updated} updated, −${r.deleted} removed`,
          5000,
        );
      }
    } catch (e) {
      toast2('Cloud pull failed: ' + (e?.message || String(e)), 6000);
    } finally {
      setBusy(false);
    }
  };

  const handleForceRestore = async () => {
    if (busy) return;
    if (!window.confirm(
      'Force restore will overwrite local characters with the cloud copy and ' +
      'remove any characters that exist locally but not in the cloud. Continue?'
    )) return;
    await handleRestore(true);
  };

  const handleBackup = async () => {
    if (busy) return;
    setBusy(true);
    toast2('Backing up to cloud…', 60000);
    try {
      const r = await pushAllVault();
      if (r.error) {
        toast2(`Backup failed: ${r.error}`, 6000);
      } else if (r.pushed === 0) {
        toast2('No characters to back up', 2500);
      } else if (r.cloudTotal != null && r.cloudTotal < r.pushed) {
        // Push reported success but the verifying re-count saw fewer rows
        // than we just pushed — RLS silently dropping inserts, or a stale
        // session writing under a different player_id. The user needs to
        // see this, not a happy success toast.
        toast2(
          `Backup wrote ${r.pushed} but cloud only has ${r.cloudTotal} — check Settings → DM Sync`,
          7000,
        );
      } else {
        toast2(
          r.cloudTotal != null
            ? `Backed up ${r.pushed} character${r.pushed === 1 ? '' : 's'} (cloud has ${r.cloudTotal}) ✓`
            : `Backed up ${r.pushed} character${r.pushed === 1 ? '' : 's'} ✓`,
          4000,
        );
      }
    } catch (e) {
      toast2('Backup failed: ' + (e?.message || String(e)), 6000);
    } finally {
      setBusy(false);
    }
  };

  const sorted = Object.values(chars).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div style={{ minHeight: '100%', background: G.bg, backgroundImage: 'radial-gradient(ellipse at 20% 10%,#1a1208 0%,transparent 55%)', overflowY: 'auto' }}>

      <div style={{ textAlign: 'center', padding: '28px 20px 16px', borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 28, color: G.gold, textShadow: `0 0 40px ${G.gold}44` }}>MAGE</div>
        <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.5em', color: G.goldDim, marginTop: 2 }}>THE ASCENSION</div>
        <div style={{ fontFamily: 'EB Garamond,serif', fontStyle: 'italic', fontSize: 13, color: G.muted, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
          Character Roster
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <button
          onClick={onStartCreate}
          style={{
            width: '100%', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '.18em',
            border: `1px solid ${G.gold}`, borderRadius: 3, cursor: 'pointer',
            background: `linear-gradient(135deg, ${G.goldFaint}, transparent)`,
            color: G.gold, padding: '14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✦</span>
          GUIDED CHARACTER CREATION
          <span style={{ fontSize: 18 }}>✦</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        <button style={btnS({ fontSize: 10, color: G.goldDim, borderColor: `${G.gold}55` })} onClick={handleNew}>+ Blank Sheet</button>
        <button style={btnS({ fontSize: 10, color: G.goldDim, borderColor: `${G.gold}55` })} onClick={handleImport} disabled={busy}>{busy ? 'Importing…' : '↑ Import / Restore'}</button>
        <button style={btnS({ fontSize: 10, color: G.goldDim, borderColor: `${G.gold}55` })} onClick={handleExportAll}>↓ Export .mage</button>
        <button style={btnS({ fontSize: 10, color: G.teal, borderColor: `${G.teal}55` })} onClick={handleBackupZip} disabled={busy}>{busy ? 'Building…' : '↓ Backup PDF ZIP'}</button>
        {signedIn && (
          <button
            onClick={() => handleRestore(false)}
            onContextMenu={(e) => { e.preventDefault(); handleForceRestore(); }}
            disabled={busy || vaultStatus === 'pulling'}
            title="Tap: merge cloud into local (last-write-wins). Long-press / right-click: force overwrite local with cloud."
            style={btnS({
              fontSize: 10,
              color: vaultStatus === 'error' ? G.red : G.blue,
              borderColor: vaultStatus === 'error' ? `${G.red}88` : `${G.blue}66`,
            })}
          >
            {vaultStatus === 'pulling' ? 'Pulling…' : vaultStatus === 'error' ? '⚠ Retry Cloud Pull' : '↻ Restore from Cloud'}
          </button>
        )}
        {signedIn && (
          <button
            onClick={handleBackup}
            disabled={busy || vaultStatus === 'pulling' || vaultStatus === 'pushing'}
            title="Force-push every local character up to your account vault"
            style={btnS({ fontSize: 10, color: G.teal, borderColor: `${G.teal}66` })}
          >
            {vaultStatus === 'pushing' ? 'Backing up…' : '↑ Backup to Cloud'}
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px 100px', maxWidth: 620, margin: '0 auto' }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: G.goldDim, fontSize: 15, fontStyle: 'italic', marginTop: 40 }}>
            No characters yet. Create your first mage above.
          </div>
        )}
        {sorted.map((ch) => {
          const s    = ch.sheet;
          const name = s?.identity?.name || 'Unnamed Mage';
          const trad = s?.identity?.tradition || '—';
          const arete = (s?.arete || []).filter(Boolean).length;
          const ts = new Date(ch.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          return (
            <div
              key={ch.id}
              onClick={() => onOpen(ch.id)}
              style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 15, color: G.gold, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 13, color: G.textDim }}>{trad}</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 5 }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: `${G.gold}77` }}>ARETE {arete}</span>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: `${G.gold}44` }}>{ts}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExportSingle(ch); }}
                  style={{ fontFamily: 'Cinzel,serif', fontSize: 10, border: `1px solid ${G.gold}44`, borderRadius: 3, background: 'transparent', color: G.goldDim, padding: '5px 10px', cursor: 'pointer' }}
                >↓</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ch.id, name); }}
                  style={{ fontFamily: 'Cinzel,serif', fontSize: 10, border: `1px solid ${G.red}`, borderRadius: 3, background: 'transparent', color: G.red, padding: '5px 10px', cursor: 'pointer' }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
