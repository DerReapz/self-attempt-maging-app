import { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Toast } from '../components/SharedUI.jsx';
import { loadAll, saveAll, newId, exportCharsToJson } from '../utils/storage.js';
import { exportCharAsPDF } from '../utils/pdfExport.js';
import { exportAllAsPDFZip, importFromPDF, importFromPDFZip } from '../utils/backup.js';

export default function CharacterList({ onOpen, onStartCreate }) {
  const G = useTheme();
  const card = { background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, padding: '12px 14px', marginBottom: 12 };
  const btnS = (extra = {}) => ({ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', border: `1px solid ${G.gold}`, borderRadius: 3, background: 'transparent', color: G.gold, padding: '9px 18px', cursor: 'pointer', ...extra });
  const [chars, setChars] = useState(loadAll);
  const [toast, setToast] = useState('');
  const [busy,  setBusy]  = useState(false);

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
