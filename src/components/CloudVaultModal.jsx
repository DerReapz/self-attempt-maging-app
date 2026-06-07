import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { loadAll } from '../utils/storage.js';
import {
  listCloudCharacters, restoreOneFromCloud, deleteFromCloud, pullVaultNow,
} from '../lib/vault.js';

// Popup that lists every character stored in the cloud vault and lets the user
// restore a copy to this device or permanently delete it from the cloud.
export default function CloudVaultModal({ onClose, onToast }) {
  const G = useTheme();
  const [rows,    setRows]    = useState(null); // null = loading
  const [err,     setErr]     = useState('');
  const [busyId,  setBusyId]  = useState('');   // char_id mid-action, or '*' for all
  const [confirmDel, setConfirmDel] = useState(null);

  const localIds = new Set(Object.keys(loadAll()));

  const load = async () => {
    setErr('');
    const { rows: r, error } = await listCloudCharacters();
    if (error) { setErr(error); setRows([]); return; }
    setRows(r);
  };

  useEffect(() => { load(); }, []);

  const doRestore = async (row) => {
    if (busyId) return;
    setBusyId(row.char_id);
    const { error, name } = await restoreOneFromCloud(row.char_id);
    setBusyId('');
    if (error) { onToast?.(`Restore failed: ${error}`, 6000); return; }
    onToast?.(`Restored "${name}" ✓`, 3000);
    load();
  };

  const doRestoreAll = async () => {
    if (busyId) return;
    setBusyId('*');
    const r = await pullVaultNow({ ignoreGraveyard: true });
    setBusyId('');
    if (r.error) { onToast?.(`Restore failed: ${r.error}`, 6000); return; }
    onToast?.(`Restored all — cloud has ${r.total} character${r.total === 1 ? '' : 's'} ✓`, 4000);
    load();
  };

  const doDelete = async () => {
    const row = confirmDel;
    setConfirmDel(null);
    if (!row) return;
    setBusyId(row.char_id);
    const { error } = await deleteFromCloud(row.char_id);
    setBusyId('');
    if (error) { onToast?.(`Delete failed: ${error}`, 6000); return; }
    onToast?.('Deleted from cloud', 2500);
    load();
  };

  const nameOf = (row) => row.sheet?.identity?.name || row.name || 'Unnamed Mage';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: G.bg, border: `1px solid ${G.gold}55`, borderRadius: 6,
          width: '100%', maxWidth: 460, maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 10px 40px #000a',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${G.goldFaint}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold }}>
              Cloud Vault
            </div>
            <div style={{ fontFamily: 'EB Garamond,serif', fontStyle: 'italic', fontSize: 12, color: G.muted, marginTop: 1 }}>
              Restore a copy to this device, or delete from the cloud.
            </div>
          </div>
          <button onClick={onClose} style={{
            fontFamily: 'Cinzel,serif', fontSize: 16, lineHeight: 1, color: G.goldDim,
            border: `1px solid ${G.gold}44`, borderRadius: 3, background: 'transparent',
            padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {rows === null && (
            <div style={{ color: G.muted, fontStyle: 'italic', textAlign: 'center', padding: '28px 0' }}>Loading…</div>
          )}
          {err && (
            <div style={{
              margin: '8px 0', padding: '8px 10px', background: `${G.red}15`,
              border: `1px solid ${G.red}55`, borderRadius: 3, color: G.red, fontSize: 12,
            }}>{err}</div>
          )}
          {rows !== null && rows.length === 0 && !err && (
            <div style={{ color: G.goldDim, fontStyle: 'italic', textAlign: 'center', padding: '28px 0' }}>
              The cloud vault is empty. Use “↑ Backup to Cloud” to store your characters.
            </div>
          )}

          {(rows || []).map((row) => {
            const name      = nameOf(row);
            const trad      = row.sheet?.identity?.tradition;
            const onDevice  = localIds.has(row.char_id);
            const isDeleted = !!row.deleted_at;
            const ts        = row.client_updated_at ? new Date(row.client_updated_at).toLocaleString() : '';
            const rowBusy   = busyId === row.char_id || busyId === '*';
            return (
              <div key={row.char_id} style={{
                background: G.card, border: `1px solid ${G.border}`, borderRadius: 4,
                padding: '10px 12px', marginBottom: 10, opacity: rowBusy ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: G.gold, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {onDevice && (
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.12em', color: G.teal, border: `1px solid ${G.teal}55`, borderRadius: 2, padding: '2px 5px' }}>
                        ON DEVICE
                      </span>
                    )}
                    {isDeleted && (
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.12em', color: G.muted, border: `1px solid ${G.muted}55`, borderRadius: 2, padding: '2px 5px' }}>
                        DELETED BACKUP
                      </span>
                    )}
                  </div>
                </div>
                {trad && <div style={{ fontSize: 12, color: G.textDim, marginTop: 2 }}>{trad}</div>}
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: `${G.gold}55`, marginTop: 4 }}>{ts}</div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => doRestore(row)}
                    disabled={rowBusy}
                    style={{
                      fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
                      border: `1px solid ${G.blue}66`, borderRadius: 3, background: 'transparent',
                      color: G.blue, padding: '6px 12px', cursor: rowBusy ? 'default' : 'pointer',
                    }}
                  >
                    {onDevice ? '↻ Overwrite Local' : '↓ Restore'}
                  </button>
                  <button
                    onClick={() => setConfirmDel(row)}
                    disabled={rowBusy}
                    style={{
                      fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
                      border: `1px solid ${G.red}88`, borderRadius: 3, background: 'transparent',
                      color: G.red, padding: '6px 12px', cursor: rowBusy ? 'default' : 'pointer',
                    }}
                  >
                    ✕ Delete from cloud
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {rows && rows.length > 0 && (
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${G.goldFaint}`,
            display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
          }}>
            <button
              onClick={doRestoreAll}
              disabled={!!busyId}
              style={{
                fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
                border: `1px solid ${G.gold}66`, borderRadius: 3, background: 'transparent',
                color: G.gold, padding: '8px 14px', cursor: busyId ? 'default' : 'pointer',
              }}
            >
              {busyId === '*' ? 'Restoring…' : '↓ Restore All'}
            </button>
            <button onClick={onClose} style={{
              fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
              border: `1px solid ${G.border}`, borderRadius: 3, background: 'transparent',
              color: G.muted, padding: '8px 14px', cursor: 'pointer',
            }}>Close</button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div
          onClick={(e) => { e.stopPropagation(); setConfirmDel(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 401, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            background: G.card, border: `1px solid ${G.red}88`, borderRadius: 6,
            padding: '20px 18px', maxWidth: 340, width: '100%',
          }}>
            <div style={{ fontFamily: 'EB Garamond,serif', fontSize: 15, color: G.text, lineHeight: 1.5 }}>
              Permanently delete <strong style={{ color: G.gold }}>{nameOf(confirmDel)}</strong> from the cloud?
              {localIds.has(confirmDel.char_id) && (
                <div style={{ fontSize: 12, color: G.muted, marginTop: 8 }}>
                  This character is still on this device, so it may be backed up again on the next sync.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setConfirmDel(null)} style={{
                fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
                border: `1px solid ${G.border}`, borderRadius: 3, background: 'transparent',
                color: G.muted, padding: '8px 14px', cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={doDelete} style={{
                fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
                border: `1px solid ${G.red}`, borderRadius: 3, background: 'transparent',
                color: G.red, padding: '8px 14px', cursor: 'pointer',
              }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
