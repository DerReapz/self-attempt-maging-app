import { useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

// ── Simple boolean track (Arete, Quintessence)
export function Track({ values, onChange, color, size = 16 }) {
  const G = useTheme();
  const c = color ?? G.gold;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {values.map((v, i) => (
        <span key={i} onClick={() => onChange(values.map((x, j) => (j === i ? !x : x)))}
          style={{ width: size, height: size, borderRadius: 2, border: `1.5px solid ${c}`, background: v ? c : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'background .12s', boxShadow: v ? `0 0 5px ${c}88` : 'none' }} />
      ))}
    </span>
  );
}

// ── 3-state damage track: 0=empty, 1=slash, 2=cross, -1=locked
export function DamageTrack({ values, onChange, shape = 'square', color }) {
  const G = useTheme();
  const color_ = color ?? G.gold;
  const S = 16;
  const timers = useRef({});

  const cycle    = (i) => { if (values[i] === -1) return; onChange(values.map((v, j) => j === i ? (v + 1) % 3 : v)); };
  const longPress = (i) => { const locked = values[i] === -1; onChange(values.map((v, j) => j === i ? (locked ? 0 : -1) : v)); };

  const pointerDown = (i, e) => {
    e.preventDefault();
    timers.current[i] = setTimeout(() => { timers.current[i] = null; longPress(i); }, 500);
  };
  const pointerUp   = (i) => { if (timers.current[i]) { clearTimeout(timers.current[i]); timers.current[i] = null; cycle(i); } };
  const pointerCancel = (i) => { clearTimeout(timers.current[i]); timers.current[i] = null; };

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {values.map((v, i) => {
        const locked = v === -1;
        const dim = locked ? `${color_}44` : color_;
        const dash = locked ? '3,2' : null;
        return (
          <svg key={i} width={S} height={S} viewBox={`0 0 ${S} ${S}`}
            onPointerDown={(e) => pointerDown(i, e)} onPointerUp={() => pointerUp(i)}
            onPointerLeave={() => pointerCancel(i)} onPointerCancel={() => pointerCancel(i)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: locked ? 'default' : 'pointer', flexShrink: 0, display: 'block', userSelect: 'none', touchAction: 'none' }}
          >
            {shape === 'circle'
              ? <circle cx={S/2} cy={S/2} r={S/2-1} fill="transparent" stroke={dim} strokeWidth="1.5" strokeDasharray={dash}/>
              : <rect x={1} y={1} width={S-2} height={S-2} rx={1.5} fill="transparent" stroke={dim} strokeWidth="1.5" strokeDasharray={dash}/>}
            {v >= 1 && <line x1={3} y1={3} x2={S-3} y2={S-3} stroke={color_} strokeWidth="1.8" strokeLinecap="round"/>}
            {v >= 2 && <line x1={S-3} y1={3} x2={3} y2={S-3} stroke={color_} strokeWidth="1.8" strokeLinecap="round"/>}
          </svg>
        );
      })}
    </span>
  );
}

// ── Dot rating (1–max filled circles)
export function Dots({ max = 5, value, onChange, color }) {
  const G = useTheme();
  const c = color ?? G.gold;
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
          style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${c}`, background: i < value ? c : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'background .12s', boxShadow: i < value ? `0 0 4px ${c}88` : 'none' }} />
      ))}
    </span>
  );
}

// ── Gold section divider
export function Divider({ children }) {
  const G = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 8px' }}>
      <span style={{ color: G.gold, fontSize: 12 }}>◆</span>
      <div style={{ flex: 1, height: 1, background: G.goldFaint }} />
      {children && (
        <>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.22em', color: G.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
          <div style={{ flex: 1, height: 1, background: G.goldFaint }} />
        </>
      )}
      <span style={{ color: G.gold, fontSize: 12 }}>◆</span>
    </div>
  );
}

// ── Labelled text input field
export function Field({ label, value, onChange, flex = '1 1 160px', fs = 13 }) {
  const G = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flex }}>
      <span style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: G.goldDim, whiteSpace: 'nowrap', fontWeight: 600 }}>{label}:</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: fs, outline: 'none', padding: '1px 0', minWidth: 0 }} />
    </div>
  );
}

// ── Skill row with label, specialty, and dot rating
export function SkillRow({ label, spec, onSpec, value, onChange }) {
  const G = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
      <span style={{ fontSize: 13, color: G.text, minWidth: 84, flexShrink: 0 }}>{label}</span>
      <input value={spec} onChange={(e) => onSpec(e.target.value)} placeholder="specialty"
        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.goldDim, fontSize: 11, fontStyle: 'italic', outline: 'none', padding: '0 1px', minWidth: 0 }} />
      <Dots max={5} value={value} onChange={onChange} />
    </div>
  );
}

// ── Free-label row (backgrounds, merits, flaws)
export function FreeRow({ name, onName, value, onChange, placeholder = '…' }) {
  const G = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <input value={name} onChange={(e) => onName(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: 13, outline: 'none', padding: '1px 2px', minWidth: 0 }} />
      <Dots max={5} value={value} onChange={onChange} />
    </div>
  );
}

// ── Multiple line inputs
export function Lines({ values, onChange }) {
  const G = useTheme();
  return (
    <>
      {values.map((v, i) => (
        <input key={i} value={v} onChange={(e) => onChange(values.map((l, j) => j === i ? e.target.value : l))}
          style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: 13, outline: 'none', padding: '3px 2px', marginBottom: 4, boxSizing: 'border-box' }} />
      ))}
    </>
  );
}

// ── Textarea with label
export function TArea({ label, value, onChange, rows = 4 }) {
  const G = useTheme();
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.2em', color: G.goldDim, marginBottom: 3 }}>{label.toUpperCase()}</div>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: 13, outline: 'none', padding: '4px 2px', lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical' }} />
    </div>
  );
}

// ── Sphere editor block
export function SphereBlock({ sphere, onUpdate }) {
  const G = useTheme();
  return (
    <div style={{ marginBottom: 10, padding: '8px 10px', border: `1px solid ${G.goldFaint}`, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input value={sphere.name} onChange={(e) => onUpdate({ ...sphere, name: e.target.value })} placeholder="Sphere…"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldDim}`, color: G.text, fontFamily: 'Cinzel,serif', fontSize: 12, outline: 'none', padding: '1px 2px' }} />
        <span style={{ flexShrink: 0 }}>
          <Dots max={5} value={sphere.value} onChange={(v) => onUpdate({ ...sphere, value: v })} color={G.purple} />
        </span>
      </div>
      {sphere.descs.map((d, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim, minWidth: 10, flexShrink: 0 }}>{i + 1}</span>
          <input value={d} onChange={(e) => onUpdate({ ...sphere, descs: sphere.descs.map((x, j) => j === i ? e.target.value : x) })}
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.textDim, fontSize: 12, outline: 'none', padding: '1px 2px' }} />
        </div>
      ))}
    </div>
  );
}

// ── Toast notification
export function Toast({ msg }) {
  const G = useTheme();
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: G.card, border: `1px solid ${G.gold}`, borderRadius: 4, padding: '10px 20px', fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', color: G.gold, boxShadow: '0 4px 20px #00000088', zIndex: 999, maxWidth: '90vw', textAlign: 'center', whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
}
