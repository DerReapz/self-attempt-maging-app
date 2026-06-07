import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { isConfigured } from '../lib/supabase.js';
import {
  getUser, signIn, signUp, signOut,
  listMySessions, joinSession, leaveSession,
  getLinks, setLink, clearLink, pushBoundCharacter,
} from '../lib/dmSync.js';
import { pullVaultNow, subscribeVaultStatus } from '../lib/vault.js';
import { loadAll } from '../utils/storage.js';

function Hint({ children }) {
  const G = useTheme();
  return <p style={{ fontSize: 11, color: G.muted, lineHeight: 1.65, marginTop: 6 }}>{children}</p>;
}

function Field({ label, children }) {
  const G = useTheme();
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.22em',
        color: G.goldDim, textTransform: 'uppercase', marginBottom: 4,
      }}>{label}</div>
      {children}
    </div>
  );
}

export default function DMSyncSection() {
  const G = useTheme();
  const inputS = {
    width: '100%', background: G.surface, border: `1px solid ${G.border}`,
    color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 14,
    padding: '8px 10px', borderRadius: 2, boxSizing: 'border-box',
  };
  const btnS = (color = G.gold, extra = {}) => ({
    width: '100%', fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em',
    padding: '11px', borderRadius: 2, cursor: 'pointer',
    border: `1px solid ${color}`, background: 'transparent', color, ...extra,
  });

  const configured = isConfigured();
  const [user,      setUser]      = useState(null);
  const [busy,      setBusy]      = useState(false);
  const [mode,      setMode]      = useState('signin'); // signin | signup
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [handle,    setHandle]    = useState('');
  const [err,       setErr]       = useState('');
  const [sessions,  setSessions]  = useState([]);
  const [links,     setLinks]     = useState(getLinks());
  const [invite,    setInvite]    = useState('');

  const refreshUser = async () => setUser(await getUser());
  const refreshAll  = async () => {
    setLinks(getLinks());
    try { setSessions(await listMySessions()); }
    catch (e) { setErr(e.message); }
  };

  useEffect(() => { refreshUser(); }, []);
  useEffect(() => { if (user) refreshAll(); else setSessions([]); }, [user?.id]);

  if (!configured) {
    return (
      <Section title="DM Sync">
        <Hint>
          Cloud sync is not configured in this build. Provide VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY at build time (see <code>.env.example</code>) to enable it.
        </Hint>
      </Section>
    );
  }

  const tryAsync = async (fn) => {
    if (busy) return;
    setErr(''); setBusy(true);
    try { await fn(); }
    catch (e) { setErr(e.message || String(e)); }
    finally   { setBusy(false); }
  };

  const submitAuth = () => tryAsync(async () => {
    if (mode === 'signup') await signUp(email, password, handle);
    else                   await signIn(email, password);
    await refreshUser();
  });

  const handleSignOut = () => tryAsync(async () => {
    await signOut();
    setUser(null);
  });

  const handleJoin = () => tryAsync(async () => {
    await joinSession(invite);
    setInvite('');
    await refreshAll();
  });

  const handleLeave = (sessionId) => tryAsync(async () => {
    if (!window.confirm('Leave this chronicle? Your character row will be removed for the DM.')) return;
    await leaveSession(sessionId);
    await refreshAll();
  });

  const handleBind = (sessionId, localId) => {
    if (!localId) clearLink(sessionId);
    else          setLink(sessionId, localId);
    setLinks(getLinks());
  };

  const handlePush = (sessionId) => tryAsync(async () => {
    await pushBoundCharacter(sessionId);
  });

  // ── Sign in / sign up form ─────────────────────────────────────────────
  if (!user) {
    return (
      <Section title="DM Sync">
        <Hint>
          Sign in to push your character sheet to a Storyteller's dashboard. You'll then
          enter an invite code your DM has shared and pick which local character syncs
          to that chronicle.
        </Hint>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          {['signin','signup'].map((m) => {
            const active = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.1em',
                padding: '9px 4px', borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${active ? G.gold : G.border}`,
                background: active ? G.goldFaint : 'transparent',
                color: active ? G.gold : G.muted,
              }}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            );
          })}
        </div>
        <Field label="Email">
          <input style={inputS} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password">
          <input style={inputS} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'signup' && (
          <Field label="Display Handle (optional)">
            <input style={inputS} type="text" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </Field>
        )}
        {err && <div style={{ color: G.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <button onClick={submitAuth} disabled={busy || !email || !password} style={btnS(G.gold, { opacity: busy ? 0.5 : 1 })}>
          {busy ? '…' : (mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT')}
        </button>
      </Section>
    );
  }

  // ── Signed in: sessions list + join + bindings ─────────────────────────
  const myChars = Object.values(loadAll());
  return (
    <Section title="DM Sync">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: G.textDim }}>Signed in as <strong style={{ color: G.gold }}>{user.email}</strong></div>
        <button onClick={handleSignOut} style={{
          fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
          padding: '6px 12px', borderRadius: 2, cursor: 'pointer',
          border: `1px solid ${G.gold}55`, background: 'transparent', color: G.goldDim,
        }}>Sign out</button>
      </div>

      <VaultStatusCard />

      <Field label="Join a chronicle (invite code)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={inputS} type="text" value={invite}
            onChange={(e) => setInvite(e.target.value.toUpperCase())}
            placeholder="6-character code"
            maxLength={8}
          />
          <button onClick={handleJoin} disabled={busy || !invite}
            style={{ ...btnS(G.gold), width: 'auto', padding: '8px 14px' }}>
            JOIN
          </button>
        </div>
      </Field>

      {err && <div style={{ color: G.red, fontSize: 12, margin: '6px 0' }}>{err}</div>}

      {sessions.length === 0 ? (
        <Hint>You're not in any chronicles yet. Ask your DM for an invite code.</Hint>
      ) : (
        <div style={{ marginTop: 12 }}>
          {sessions.map((s) => {
            const isDm   = s.dm_id === user.id;
            const linked = links[s.id] || '';
            return (
              <div key={s.id} style={{
                background: G.card, border: `1px solid ${G.border}`,
                borderRadius: 3, padding: '10px 12px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: G.gold }}>{s.name}</div>
                  <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: G.muted }}>
                    {isDm ? 'YOU ARE DM' : `CODE ${s.invite_code}`}
                  </div>
                </div>
                {!isDm && (
                  <>
                    <Field label="Sync this character to the chronicle">
                      <select
                        value={linked}
                        onChange={(e) => handleBind(s.id, e.target.value)}
                        style={{ ...inputS, padding: '8px 10px' }}
                      >
                        <option value="">— None (don't sync) —</option>
                        {myChars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.sheet?.identity?.name || 'Unnamed Mage'}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => handlePush(s.id)} disabled={!linked || busy}
                        style={{ ...btnS(G.teal), opacity: linked ? 1 : 0.45 }}>
                        ↑ PUSH NOW
                      </button>
                      <button onClick={() => handleLeave(s.id)} disabled={busy}
                        style={btnS(G.red)}>
                        LEAVE
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Hint>
        Once a character is bound, every edit auto-pushes to the DM after a short delay.
        Unbind by selecting "None".
      </Hint>
    </Section>
  );
}

function VaultStatusCard() {
  const G = useTheme();
  const [status,     setStatus]     = useState('idle');
  const [lastError,  setLastError]  = useState('');
  const [cloudCount, setCloudCount] = useState(null);
  const [busy,       setBusy]       = useState(false);
  useEffect(() => subscribeVaultStatus((s, err, count) => {
    setStatus(s);
    setLastError(err || '');
    setCloudCount(count ?? null);
  }), []);

  const isMissingTable =
    lastError && /relation .*player_characters.* does not exist/i.test(lastError);

  const countLine = cloudCount == null
    ? null
    : `Cloud vault: ${cloudCount} character${cloudCount === 1 ? '' : 's'}`;

  const label =
    status === 'pulling' ? 'Pulling from cloud…' :
    status === 'pushing' ? 'Pushing changes…' :
    status === 'error'   ? (isMissingTable
                              ? 'Vault table missing — apply migration 005_player_vault.sql'
                              : 'Sync error') :
    status === 'offline' ? 'Cloud not configured' :
    status === 'unauth'  ? 'Sign in to sync' :
                           'Auto-sync on — characters saved to your account';

  const color =
    status === 'error'                                   ? G.red  :
    status === 'pulling' || status === 'pushing'         ? G.teal :
                                                           G.goldDim;

  const pull = async (force = false) => {
    if (busy) return;
    if (force && !window.confirm(
      'Force pull will overwrite local characters with the cloud copy and ' +
      'drop any characters that exist locally but not in the cloud. Continue?'
    )) return;
    setBusy(true);
    try { await pullVaultNow({ force }); }
    finally { setBusy(false); }
  };

  const disabled = busy || status === 'offline' || status === 'unauth';

  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`,
      borderRadius: 3, padding: '10px 12px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.22em',
            color: G.goldDim, textTransform: 'uppercase', marginBottom: 2,
          }}>Character vault</div>
          <div style={{ fontSize: 12, color }}>{label}</div>
          {countLine && (
            <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>{countLine}</div>
          )}
        </div>
        <button
          onClick={() => pull(false)}
          disabled={disabled}
          style={{
            fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
            border: `1px solid ${G.gold}55`, borderRadius: 2,
            background: 'transparent', color: G.goldDim,
            padding: '6px 10px', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? '…' : '↓ PULL'}
        </button>
        <button
          onClick={() => pull(true)}
          disabled={disabled}
          title="Overwrite local characters with the cloud copy"
          style={{
            fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em',
            border: `1px solid ${G.red}55`, borderRadius: 2,
            background: 'transparent', color: G.red,
            padding: '6px 10px', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          ⚠ FORCE
        </button>
      </div>
      {status === 'error' && lastError && (
        <div style={{
          marginTop: 8, padding: '6px 8px',
          background: `${G.red}15`, border: `1px solid ${G.red}55`, borderRadius: 2,
          fontFamily: 'EB Garamond,serif', fontSize: 11, color: G.red,
          wordBreak: 'break-word',
        }}>
          {lastError}
        </div>
      )}
    </div>
  );
}

// Tiny local copy of Settings' Section component so this module doesn't depend
// on internals of SettingsScreen.jsx.
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
