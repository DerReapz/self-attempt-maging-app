import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { isConfigured } from '../lib/supabase.js';
import {
  getUser, listMySessions,
  fetchStoryLog, saveStoryLog, subscribeStoryLog,
} from '../lib/dmSync.js';

const LAST_SESSION_KEY = 'mage_story_last_session';

export default function StoryScreen() {
  const G = useTheme();
  const [user,       setUser]       = useState(null);
  const [sessions,   setSessions]   = useState([]);
  const [sessionId,  setSessionId]  = useState(localStorage.getItem(LAST_SESSION_KEY) || '');
  const [content,    setContent]    = useState('');
  const [remoteTs,   setRemoteTs]   = useState(null);
  const [savedAt,    setSavedAt]    = useState(null);
  const [status,     setStatus]     = useState('idle');  // idle | loading | saving | error
  const [err,        setErr]        = useState('');

  // Local-edit tracking so remote events don't clobber what the user is typing.
  const editingRef = useRef(false);
  const localDirtyRef = useRef(false);
  const lastLocalEditRef = useRef(0);
  const saveTimerRef = useRef(null);

  useEffect(() => { (async () => setUser(await getUser().catch(() => null)))(); }, []);

  useEffect(() => {
    if (!user) { setSessions([]); return; }
    (async () => {
      try { setSessions(await listMySessions()); }
      catch (e) { setErr(e.message); }
    })();
  }, [user?.id]);

  // Pick a default session if the saved one no longer applies.
  useEffect(() => {
    if (!sessions.length) return;
    if (!sessions.find((s) => s.id === sessionId)) {
      setSessionId(sessions[0].id);
    }
  }, [sessions]);

  // Load + subscribe when the selected session changes.
  useEffect(() => {
    if (!sessionId) { setContent(''); setRemoteTs(null); return; }
    localStorage.setItem(LAST_SESSION_KEY, sessionId);

    let cancelled = false;
    setStatus('loading'); setErr('');
    (async () => {
      try {
        const row = await fetchStoryLog(sessionId);
        if (cancelled) return;
        setContent(row?.content || '');
        setRemoteTs(row?.updated_at || null);
        localDirtyRef.current = false;
        setStatus('idle');
      } catch (e) {
        if (!cancelled) { setErr(e.message); setStatus('error'); }
      }
    })();

    const unsub = subscribeStoryLog(sessionId, (row) => {
      if (!row || row.content == null) return;
      // Drop events that mirror our own write (or older).
      if (remoteTs && row.updated_at && row.updated_at <= remoteTs) return;
      // Don't trample an active edit. We'll merge on save.
      const idle = !editingRef.current && Date.now() - lastLocalEditRef.current > 1500;
      if (idle && !localDirtyRef.current) {
        setContent(row.content);
      }
      setRemoteTs(row.updated_at || null);
    });

    return () => { cancelled = true; unsub(); };
  }, [sessionId]);

  const scheduleSave = (next) => {
    localDirtyRef.current = true;
    lastLocalEditRef.current = Date.now();
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setStatus('saving');
        await saveStoryLog(sessionId, next);
        setSavedAt(new Date());
        localDirtyRef.current = false;
        setStatus('idle');
      } catch (e) {
        setErr(e.message); setStatus('error');
      }
    }, 700);
  };

  const onChange = (e) => {
    const v = e.target.value;
    setContent(v);
    if (sessionId) scheduleSave(v);
  };

  // ── Not configured / not signed in ────────────────────────────────────
  if (!isConfigured()) {
    return (
      <Wrap>
        <Title>The Chronicle</Title>
        <Hint G={G}>
          Cloud sync isn't configured in this build, so the shared story log is
          unavailable. The DM Sync section in Settings explains how to enable it.
        </Hint>
      </Wrap>
    );
  }

  if (!user) {
    return (
      <Wrap>
        <Title>The Chronicle</Title>
        <Hint G={G}>
          Sign in from <strong style={{ color: G.gold }}>Settings → DM Sync</strong> to
          read and write the shared story log for your chronicles.
        </Hint>
      </Wrap>
    );
  }

  if (!sessions.length) {
    return (
      <Wrap>
        <Title>The Chronicle</Title>
        <Hint G={G}>
          You're not in any chronicles yet. Join one from
          <strong style={{ color: G.gold }}> Settings → DM Sync</strong> with an invite code,
          and the shared story log will appear here.
        </Hint>
      </Wrap>
    );
  }

  const savedLabel =
    status === 'saving' ? 'Saving…' :
    status === 'error'  ? 'Save failed' :
    savedAt             ? `Saved ${savedAt.toLocaleTimeString()}` :
    remoteTs            ? `Last edit ${new Date(remoteTs).toLocaleString()}` :
                          '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: G.bg, color: G.text, paddingBottom: 60,
    }}>
      <div style={{ padding: '14px 14px 8px', borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{
          fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold,
          letterSpacing: '.1em', marginBottom: 8,
        }}>The Chronicle</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{
              flex: 1, background: G.surface, border: `1px solid ${G.border}`,
              color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 13,
              padding: '7px 9px', borderRadius: 2, boxSizing: 'border-box',
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.dm_id === user.id ? '  (DM)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{
          fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em',
          color: status === 'error' ? G.red : G.muted, marginTop: 6, minHeight: 12,
        }}>
          {err || savedLabel}
        </div>
      </div>

      <textarea
        value={content}
        onChange={onChange}
        onFocus={() => { editingRef.current = true; }}
        onBlur={()  => { editingRef.current = false; }}
        placeholder="The tale unwritten…"
        style={{
          flex: 1, minHeight: 200,
          background: 'transparent', border: 'none', outline: 'none',
          color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 15,
          lineHeight: 1.65, padding: '14px 16px', resize: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function Wrap({ children }) {
  const G = useTheme();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      padding: 20, background: G.bg, color: G.text, minHeight: '100%',
    }}>{children}</div>
  );
}

function Title({ children }) {
  const G = useTheme();
  return (
    <div style={{
      fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold,
      letterSpacing: '.1em', marginBottom: 14, textAlign: 'center',
    }}>{children}</div>
  );
}

function Hint({ G, children }) {
  return (
    <p style={{ fontSize: 13, color: G.muted, lineHeight: 1.7, textAlign: 'center' }}>
      {children}
    </p>
  );
}
