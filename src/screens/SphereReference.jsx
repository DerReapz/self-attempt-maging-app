import { useState } from 'react';
import { G, SPHERE_COLORS } from '../palette.js';
import { SPHERE_DATA, SPHERE_OVERVIEW_ROWS } from '../data/spheres.js';

const LEVEL_NAMES = ['', 'Initiate', 'Apprentice', 'Disciple', 'Adept', 'Master'];

function PowerBar({ filled, color }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ width: 18, height: 5, borderRadius: 1, background: color, opacity: i < filled ? 1 : 0.2, boxShadow: i < filled ? `0 0 5px ${color}` : 'none' }} />
      ))}
    </div>
  );
}

function LevelEntry({ level, dot, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid rgba(58,46,30,0.4)`, paddingBottom: 10, marginBottom: 10 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
      >
        <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
          <span style={{ color, fontSize: 14, letterSpacing: '-0.05em', filter: `drop-shadow(0 0 4px ${color})` }}>{level.dots}</span>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>{level.name}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, color: G.gold, letterSpacing: '.08em', marginBottom: 4 }}>{level.title}</div>
          {open && (
            <>
              <p style={{ color: G.text, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{level.body}</p>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderLeft: `2px solid ${color}`, padding: '6px 10px', marginTop: 4 }}>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color, marginBottom: 4 }}>Examples</div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {level.examples.map((ex, i) => (
                    <li key={i} style={{ color: G.muted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 2 }}>
                      <span style={{ color, fontSize: 9, marginRight: 4 }}>◆</span>{ex}
                    </li>
                  ))}
                </ul>
              </div>
              <PowerBar filled={dot} color={color} />
            </>
          )}
        </div>
        <span style={{ color: G.goldDim, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{open ? '▾' : '▸'}</span>
      </div>
    </div>
  );
}

function SphereCard({ sphere }) {
  const [expanded, setExpanded] = useState(false);
  const c = sphere.color;
  return (
    <div style={{ background: G.surface, border: `1px solid #3a2e1e`, borderRadius: 2, overflow: 'hidden', marginBottom: 16, borderTop: `3px solid ${c}`, boxShadow: `0 0 20px ${c}22` }}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: `1px solid #3a2e1e`, background: '#1a1510', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 28, flexShrink: 0, filter: `drop-shadow(0 0 8px ${c})` }}>{sphere.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: G.muted, textTransform: 'uppercase', marginBottom: 2 }}>{sphere.meta}</div>
          <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 18, color: c, textShadow: `0 0 20px ${c}`, marginBottom: 4 }}>{sphere.name}</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted, letterSpacing: '.1em' }}>Traditions: {sphere.traditions}</div>
        </div>
        <span style={{ color: G.goldDim, fontSize: 18, flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid #3a2e1e` }}>
            <p style={{ fontStyle: 'italic', color: G.muted, fontSize: 13, lineHeight: 1.6 }}>{sphere.blurb}</p>
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            {sphere.levels.map((level, i) => (
              <LevelEntry key={i} level={level} dot={i + 1} color={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTable() {
  const levelHeaders = ['● Apprentice', '●● Initiate', '●●● Disciple', '●●●● Adept', '●●●●● Master'];
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, background: '#120f0a', border: '1px solid #3a2e1e' }}>
        <thead>
          <tr>
            {['Sphere', 'Domain', 'Traditions', ...levelHeaders].map((h, i) => (
              <th key={i} style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: G.muted, padding: '8px', borderBottom: '1px solid #3a2e1e', borderRight: '1px solid #3a2e1e', background: '#1a1510', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPHERE_DATA.map((sphere) => {
            const c = sphere.color;
            return (
              <tr key={sphere.id} style={{ borderBottom: '1px solid rgba(58,46,30,0.5)' }}>
                <td style={{ padding: '6px 8px', borderRight: '1px solid rgba(58,46,30,0.3)', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-block', fontFamily: 'Cinzel,serif', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderLeft: `3px solid ${c}`, color: c, background: `${c}18` }}>{sphere.name}</span>
                </td>
                <td style={{ padding: '6px 8px', borderRight: '1px solid rgba(58,46,30,0.3)', color: G.text, fontSize: 11 }}>{sphere.overview[0] ? SPHERE_OVERVIEW_ROWS.find(r => r.id === sphere.id)?.domain : ''}</td>
                <td style={{ padding: '6px 8px', borderRight: '1px solid rgba(58,46,30,0.3)', color: G.muted, fontSize: 10 }}>{sphere.traditions}</td>
                {sphere.overview.map((ov, i) => (
                  <td key={i} style={{ padding: '6px 8px', borderRight: '1px solid rgba(58,46,30,0.3)', color: G.muted, fontSize: 10, lineHeight: 1.4, verticalAlign: 'top' }}>{ov}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SphereReference() {
  const [view, setView] = useState('cards'); // 'cards' | 'overview'
  const [filter, setFilter] = useState('');

  const filtered = SPHERE_DATA.filter((s) =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: G.bg }}>
      {/* Header */}
      <div style={{ background: '#0a0806', borderBottom: '1px solid #3a2e1e', padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 28, filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.5))', display: 'block', marginBottom: 4 }}>⬡</span>
          <h1 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 18, color: G.gold, textShadow: '0 0 40px rgba(201,168,76,0.4)', letterSpacing: '.05em' }}>The Nine Spheres</h1>
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 2 }}>Mage: The Ascension — Reference</p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
          {['cards', 'overview'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{ fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', border: `1px solid ${view === v ? G.gold : '#3a2e1e'}`, borderRadius: 2, background: view === v ? 'rgba(201,168,76,0.1)' : 'transparent', color: view === v ? G.gold : G.muted, padding: '6px 14px', cursor: 'pointer' }}>
              {v === 'cards' ? 'Cards' : 'Overview'}
            </button>
          ))}
        </div>
        {view === 'cards' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingBottom: 10 }}>
            {['', ...SPHERE_DATA.map((s) => s.name)].map((name) => (
              <button key={name} onClick={() => setFilter(name)}
                style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.1em', border: `1px solid ${filter === name ? G.gold : '#3a2e1e'}`, borderRadius: 2, background: filter === name ? 'rgba(201,168,76,0.1)' : 'transparent', color: filter === name ? G.gold : G.muted, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {name || 'All'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 90px' }}>
        {view === 'overview' ? (
          <>
            <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 13, color: G.gold, textAlign: 'center', marginBottom: 16, position: 'relative' }}>
              <span style={{ color: G.goldDim, margin: '0 8px' }}>⸺</span>Sphere Overview<span style={{ color: G.goldDim, margin: '0 8px' }}>⸺</span>
            </h2>
            <OverviewTable />
          </>
        ) : (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {filtered.map((sphere) => (
              <SphereCard key={sphere.id} sphere={sphere} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
