import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { isConfigured } from '../lib/supabase.js';
import {
  getUser, listMySessions,
  fetchStoryPages, createStoryPage, updateStoryPageContent,
  updateStoryPageTitle, deleteStoryPage, subscribeStoryPages,
} from '../lib/dmSync.js';

const LAST_SESSION_KEY = 'mage_story_last_session';

const byPos = (a, b) =>
  (a.position - b.position) ||
  String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
  String(a.id).localeCompare(String(b.id));

export default function StoryScreen() {
  const G = useTheme();
  const [user,      setUser]      = useState(null);
  const [sessions,  setSessions]  = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem(LAST_SESSION_KEY) || '');
  const [pages,     setPages]     = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  const [status,    setStatus]    = useState('idle'); // idle | loading | saving | error
  const [savedAt,   setSavedAt]   = useState(null);
  const [err,       setErr]       = useState('');
  const [renaming,  setRenaming]  = useState(false);

  // Active-page edit tracking so remote events don't clobber what's being typed.
  const editingRef    = useRef(false);
  const dirtyRef      = useRef(false);
  const lastEditRef   = useRef(0);
  const saveTimerRef  = useRef(null);
  const pendingRef    = useRef(null); // { pageId, content }
  const activeIdRef   = useRef(null); // mirror so realtime closures read the current page

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const session = sessions.find((s) => s.id === sessionId) || null;
  const isDM    = session && user && session.dm_id === user.id;
  const active  = pages.find((p) => p.id === activeId) || null;

  // ── Auth + session list ──────────────────────────────────────────────
  useEffect(() => { (async () => setUser(await getUser().catch(() => null)))(); }, []);

  useEffect(() => {
    if (!user) { setSessions([]); return; }
    (async () => {
      try { setSessions(await listMySessions()); }
      catch (e) { setErr(e.message); }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!sessions.length) return;
    if (!sessions.find((s) => s.id === sessionId)) setSessionId(sessions[0].id);
  }, [sessions]);

  // ── Page state helpers ───────────────────────────────────────────────
  const upsertPage = (row) => setPages((prev) => {
    const i = prev.findIndex((p) => p.id === row.id);
    if (i === -1) return [...prev, row].sort(byPos);
    const next = [...prev];
    next[i] = { ...next[i], ...row };
    return next.sort(byPos);
  });

  const patchActiveContent = (content) =>
    setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, content } : p)));

  // ── Save plumbing ────────────────────────────────────────────────────
  const doSave = async (job) => {
    try {
      setStatus('saving');
      await updateStoryPageContent(job.pageId, job.content);
      setSavedAt(new Date());
      if (pendingRef.current && pendingRef.current.pageId === job.pageId &&
          pendingRef.current.content === job.content) {
        dirtyRef.current = false;
      }
      setStatus('idle');
    } catch (e) {
      setErr(e.message); setStatus('error');
    }
  };

  const flushSave = () => {
    if (!pendingRef.current) return;
    clearTimeout(saveTimerRef.current);
    const job = pendingRef.current;
    pendingRef.current = null;
    doSave(job);
  };

  const scheduleSave = (pageId, content) => {
    pendingRef.current = { pageId, content };
    dirtyRef.current = true;
    lastEditRef.current = Date.now();
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const job = pendingRef.current;
      pendingRef.current = null;
      if (job) doSave(job);
    }, 700);
  };

  // ── Load + subscribe per session ─────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setPages([]); setActiveId(null); return; }
    localStorage.setItem(LAST_SESSION_KEY, sessionId);

    let cancelled = false;
    setStatus('loading'); setErr(''); pendingRef.current = null; dirtyRef.current = false;
    (async () => {
      try {
        const rows = await fetchStoryPages(sessionId);
        if (cancelled) return;
        const sorted = [...rows].sort(byPos);
        setPages(sorted);
        setActiveId((cur) => (sorted.find((p) => p.id === cur) ? cur : (sorted[0]?.id || null)));
        setStatus('idle');
      } catch (e) {
        if (!cancelled) { setErr(e.message); setStatus('error'); }
      }
    })();

    const unsub = subscribeStoryPages(sessionId, (payload) => {
      const { eventType, new: row, old } = payload;
      if (eventType === 'DELETE') {
        const goneId = old?.id;
        if (!goneId) return;
        setPages((prev) => prev.filter((p) => p.id !== goneId));
        setActiveId((cur) => (cur === goneId ? null : cur));
        return;
      }
      if (!row) return;
      // For the active page, don't trample an in-progress edit.
      if (row.id === activeIdRef.current) {
        const idle = !editingRef.current && Date.now() - lastEditRef.current > 1500;
        if (!idle || dirtyRef.current) {
          // Apply title/position changes but keep the local content buffer.
          setPages((prev) => prev.map((p) =>
            p.id === row.id ? { ...p, title: row.title, position: row.position } : p));
          return;
        }
      }
      upsertPage(row);
    });

    return () => { cancelled = true; unsub(); flushSave(); };
  }, [sessionId]);

  // When the active page no longer exists, fall back to the first chapter.
  useEffect(() => {
    if (activeId && !pages.find((p) => p.id === activeId)) {
      setActiveId(pages[0]?.id || null);
    }
  }, [pages, activeId]);

  // ── Actions ──────────────────────────────────────────────────────────
  const selectPage = (id) => {
    if (id === activeId) return;
    flushSave();
    editingRef.current = false; dirtyRef.current = false; lastEditRef.current = 0;
    setRenaming(false);
    setActiveId(id);
  };

  const onContentChange = (e) => {
    const v = e.target.value;
    patchActiveContent(v);
    if (activeId) scheduleSave(activeId, v);
  };

  const addChapter = async () => {
    setErr('');
    try {
      const maxPos = pages.reduce((m, p) => Math.max(m, p.position || 0), -1);
      const row = await createStoryPage(sessionId, `Chapter ${pages.length + 1}`, maxPos + 1);
      upsertPage(row);
      selectPage(row.id);
      setRenaming(true);
    } catch (e) { setErr(e.message); }
  };

  const commitRename = async (title) => {
    setRenaming(false);
    const t = (title || '').trim();
    if (!active || !t || t === active.title) return;
    upsertPage({ id: active.id, title: t });
    try { await updateStoryPageTitle(active.id, t); }
    catch (e) { setErr(e.message); }
  };

  const removeChapter = async () => {
    if (!active) return;
    const canDelete = isDM || active.created_by === user.id;
    if (!canDelete) { setErr('Only the chapter author or the DM can delete this chapter.'); return; }
    if (!window.confirm(`Delete chapter "${active.title}"? This removes it for everyone in the chronicle.`)) return;
    const goneId = active.id;
    flushSave();
    setPages((prev) => prev.filter((p) => p.id !== goneId));
    try { await deleteStoryPage(goneId); }
    catch (e) { setErr(e.message); }
  };

  // ── Gates ────────────────────────────────────────────────────────────
  if (!isConfigured()) {
    return <Gate G={G} msg={<>Cloud sync isn't configured in this build, so the shared chronicle is unavailable. The DM Sync section in Settings explains how to enable it.</>} />;
  }
  if (!user) {
    return <Gate G={G} msg={<>Sign in from <strong style={{ color: G.gold }}>Settings → DM Sync</strong> to read and write the shared chronicle for your campaigns.</>} />;
  }
  if (!sessions.length) {
    return <Gate G={G} msg={<>You're not in any chronicles yet. Join one from <strong style={{ color: G.gold }}>Settings → DM Sync</strong> with an invite code.</>} />;
  }

  const savedLabel =
    status === 'saving' ? 'Saving…' :
    status === 'error'  ? 'Save failed' :
    savedAt             ? `Saved ${savedAt.toLocaleTimeString()}` :
    active?.updated_at  ? `Last edit ${new Date(active.updated_at).toLocaleString()}` :
                          '';

  const canDeleteActive = active && (isDM || active.created_by === user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: G.bg, color: G.text, paddingBottom: 60 }}>
      {/* Header: title + session picker */}
      <div style={{ padding: '14px 14px 6px', borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold, letterSpacing: '.1em', marginBottom: 8 }}>
          The Chronicle
        </div>
        <select
          value={sessionId}
          onChange={(e) => { flushSave(); setSessionId(e.target.value); }}
          style={{
            width: '100%', background: G.surface, border: `1px solid ${G.border}`,
            color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 13,
            padding: '7px 9px', borderRadius: 2, boxSizing: 'border-box',
          }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.dm_id === user.id ? '  (DM)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Chapter sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: `1px solid ${G.goldFaint}`, overflowX: 'auto' }}>
        {pages.map((p) => {
          const on = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => selectPage(p.id)}
              onDoubleClick={() => { if (on) setRenaming(true); }}
              style={{
                flexShrink: 0, fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.08em',
                padding: '6px 12px', borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap',
                border: `1px solid ${on ? G.gold : G.border}`,
                background: on ? G.goldFaint : 'transparent',
                color: on ? G.gold : G.muted,
              }}
              title="Tap to open · double-tap to rename"
            >
              {p.title || 'Untitled'}
            </button>
          );
        })}
        <button
          onClick={addChapter}
          title="Add a chapter"
          style={{
            flexShrink: 0, fontFamily: 'Cinzel,serif', fontSize: 14, lineHeight: 1,
            padding: '5px 11px', borderRadius: 3, cursor: 'pointer',
            border: `1px dashed ${G.gold}66`, background: 'transparent', color: G.goldDim,
          }}
        >+</button>
      </div>

      {/* Active-chapter toolbar */}
      {active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', minHeight: 30 }}>
          {renaming ? (
            <input
              autoFocus
              defaultValue={active.title}
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(false); }}
              style={{
                flex: 1, background: G.surface, border: `1px solid ${G.gold}66`, color: G.text,
                fontFamily: 'Cinzel,serif', fontSize: 12, padding: '4px 8px', borderRadius: 2, boxSizing: 'border-box',
              }}
            />
          ) : (
            <div
              onClick={() => setRenaming(true)}
              style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 12, color: G.gold, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title="Tap to rename"
            >
              {active.title || 'Untitled'} <span style={{ color: G.muted, fontSize: 10 }}>✎</span>
            </div>
          )}
          {canDeleteActive && !renaming && (
            <button
              onClick={removeChapter}
              style={{
                flexShrink: 0, fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.12em',
                border: `1px solid ${G.red}88`, borderRadius: 3, background: 'transparent',
                color: G.red, padding: '5px 9px', cursor: 'pointer',
              }}
            >✕ DELETE</button>
          )}
        </div>
      )}

      {/* Status line */}
      <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: status === 'error' ? G.red : G.muted, padding: '0 14px 4px', minHeight: 12 }}>
        {err || savedLabel}
      </div>

      {/* Editor / empty state */}
      {active ? (
        <textarea
          key={active.id}
          value={active.content || ''}
          onChange={onContentChange}
          onFocus={() => { editingRef.current = true; }}
          onBlur={()  => { editingRef.current = false; }}
          placeholder="The tale unwritten…"
          style={{
            flex: 1, minHeight: 160, background: 'transparent', border: 'none', outline: 'none',
            color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 15, lineHeight: 1.65,
            padding: '10px 16px 16px', resize: 'none', boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ color: G.muted, fontStyle: 'italic', fontSize: 14 }}>
            No chapters yet. Start the chronicle with its first chapter.
          </div>
          <button
            onClick={addChapter}
            style={{
              fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em',
              border: `1px solid ${G.gold}`, borderRadius: 3, background: 'transparent',
              color: G.gold, padding: '10px 18px', cursor: 'pointer',
            }}
          >+ ADD CHAPTER</button>
        </div>
      )}
    </div>
  );
}

function Gate({ G, msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 20, background: G.bg, color: G.text, minHeight: '100%' }}>
      <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold, letterSpacing: '.1em', marginBottom: 14, textAlign: 'center' }}>
        The Chronicle
      </div>
      <p style={{ fontSize: 13, color: G.muted, lineHeight: 1.7, textAlign: 'center' }}>{msg}</p>
    </div>
  );
}
