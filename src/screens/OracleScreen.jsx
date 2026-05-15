import { useState, useRef } from 'react';
import { G, SPHERE_COLORS } from '../palette.js';
import { PROVIDERS, getStoredProvider, getStoredKey, storeProvider, storeKey, callAI } from '../utils/aiProvider.js';

function ProviderBar({ provider, apiKey, onProvider, onKey }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {PROVIDERS.map(p => {
          const active = p.id === provider;
          return (
            <button key={p.id} onClick={() => onProvider(p.id)} style={{
              flex: 1, fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.06em',
              padding: '5px 2px', border: `1px solid ${active ? G.gold : G.border}`,
              borderRadius: 2, background: active ? G.goldFaint : 'transparent',
              color: active ? G.gold : G.muted, cursor: 'pointer',
            }}>{p.label}</button>
          );
        })}
      </div>
      <input
        type="password"
        value={apiKey}
        onChange={e => onKey(e.target.value)}
        placeholder={PROVIDERS.find(p => p.id === provider)?.hint || 'API key'}
        style={{
          width: '100%', background: '#1a1510', border: `1px solid ${G.goldFaint}`,
          borderRadius: 2, color: G.textDim, fontFamily: 'monospace', fontSize: 11,
          padding: '6px 8px', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

const LEVEL_DOTS  = ['','●','●●','●●●','●●●●','●●●●●','●●●●●⁺','●●●●●⁺⁺','●●●●●⁺⁺⁺','●●●●●⁺⁺⁺⁺','●●●●●⁺⁺⁺⁺⁺'];
const LEVEL_NAMES = ['','Initiate','Apprentice','Disciple','Adept','Master','Ascendant','Exarch','Incarna','Primordial','Absolute'];

const EXAMPLES = [
  'Cast a lightning bolt at a target',
  'Teleport across the city',
  'Shapeshift into a wolf',
  'Read surface thoughts of a stranger',
  'Accelerate decay on a steel vault door',
  'Astral project across the country',
  'Create a permanent gravity-free zone',
  'Rewrite a person\'s fate threads',
];

const ORACLE_SYSTEM = `You are the Sphere Oracle — an expert rules authority for Mage: The Ascension 2nd Edition (White Wolf), extended with an Ascension Tier scaling system beyond the canonical 5-dot cap.

SPHERE LEVEL SCALE (1–10):
Standard mortal mages access levels 1–5. Levels 6–10 represent post-Ascension, near-mythic, or transcendent beings.

LEVEL DEFINITIONS:
● 1 — Initiate: Perception only. Cannot alter reality, only read it.
●● 2 — Apprentice: Minor, local, subtle effects. Coincidental possible.
●●● 3 — Disciple: Active power. Real damage or transformation. Often Vulgar.
●●●● 4 — Adept: Significant force. City-scale consequences. Almost always Vulgar.
●●●●● 5 — Master: Human pinnacle. Regional effects. Paradox is near-certain and severe.
●●●●●● 6 — Ascendant: Post-Ascension tier. Effects warp local reality.
●●●●●●● 7 — Exarch-tier: Continent-scale or conceptual effects.
●●●●●●●● 8 — Incarna-equivalent: Planetary-scale.
●●●●●●●●● 9 — Primordial: Reality itself bends to the mage.
●●●●●●●●●● 10 — Absolute: The mage approaches the Absolute. Effects are mythic, cosmological.

Respond ONLY with a valid JSON object — no markdown fences, no extra text:
{
  "spheres": [{ "name": "SphereName", "level": 1, "reason": "Brief reason" }],
  "ruling": "2-4 sentences, flavourful oracle tone.",
  "paradox": "Standard Coincidental/Vulgar assessment for tiers 1-5. For tiers 6-10: describe Consensus impact.",
  "combination_note": "Sphere interaction note, or empty string.",
  "higher_level": "What the next tier enables, or empty string.",
  "attack": null,
  "area_effects": null
}

If an attack, replace attack null with:
"attack": {
  "is_attack": true,
  "damage_dice": "dice pool or narrative for tier 6+",
  "damage_type": "Bashing | Lethal | Aggravated | Reality-Rending",
  "soak_allowed": true,
  "soak_note": "soak trait and exceptions",
  "roll": "casting roll",
  "range": "range description",
  "area": "target area",
  "special": "ongoing or secondary effects",
  "scaling": "how it scales with tier"
}

For any attack or high-power effect, replace area_effects null with:
"area_effects": {
  "blast_radius": "zone description",
  "immediate_environment": "sensory description",
  "collateral_damage": "who else gets hurt",
  "persistent_hazards": "what physically remains",
  "narrative_fallout": "who responds",
  "power_scale_note": "one vivid sentence anchoring total power"
}

Valid sphere names: Correspondence, Entropy, Forces, Life, Matter, Mind, Prime, Spirit, Time. Levels 1-10.`;

function repairJSON(str) {
  str = str.replace(/,\s*$/, '');
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (const ch of str) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"' && !esc) { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  if (inStr) str += '"';
  str = str.replace(/,\s*"[^"]*$/, '').replace(/,\s*$/, '');
  str += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces));
  return str;
}

function SphereBadge({ name, level }) {
  const c = SPHERE_COLORS[name] || G.gold;
  const isAscended = level >= 6;
  const dots = LEVEL_DOTS[level] || '●'.repeat(Math.min(level, 5)) + '⁺'.repeat(Math.max(0, level - 5));
  const tierName = LEVEL_NAMES[level] || `Tier ${level}`;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 12px', border: `1px solid ${c}`, borderRadius: 3, background: `${c}11`, boxShadow: isAscended ? `0 0 12px ${c}` : 'none', marginRight: 8, marginBottom: 8 }}>
      <span style={{ color: c, fontSize: 14, letterSpacing: '-0.05em', filter: `drop-shadow(0 0 4px ${c})` }}>{dots}</span>
      <span style={{ color: c, fontFamily: 'Cinzel,serif', fontSize: 11 }}>{name}</span>
      {isAscended && <span style={{ color: c, fontFamily: 'Cinzel,serif', fontSize: 8, opacity: 0.8, letterSpacing: '.1em' }}>{tierName.toUpperCase()}</span>}
    </div>
  );
}

function ResultBlock({ data }) {
  if (!data) return null;
  const { spheres, ruling, paradox, combination_note, higher_level, attack, area_effects } = data;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 12 }}>
        {(spheres || []).map((s, i) => <SphereBadge key={i} name={s.name} level={s.level} />)}
      </div>

      {ruling && (
        <div style={{ fontFamily: 'EB Garamond,serif', fontSize: 14, color: G.text, lineHeight: 1.75, marginBottom: 10, fontStyle: 'italic', borderLeft: `2px solid ${G.goldDim}`, paddingLeft: 10 }}
          dangerouslySetInnerHTML={{ __html: ruling }} />
      )}

      {paradox && (
        <div style={{ background: '#1a0a0a', border: `1px solid ${G.red}33`, borderRadius: 2, padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: G.red, display: 'block', marginBottom: 4 }}>PARADOX ASSESSMENT</span>
          <p style={{ fontSize: 13, color: G.textDim, lineHeight: 1.6 }}>{paradox}</p>
        </div>
      )}

      {combination_note && (
        <div style={{ background: '#0a1018', border: `1px solid ${G.blue}33`, borderRadius: 2, padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: G.blue, display: 'block', marginBottom: 4 }}>SPHERE SYNERGY</span>
          <p style={{ fontSize: 13, color: G.textDim }}>{combination_note}</p>
        </div>
      )}

      {higher_level && (
        <div style={{ background: '#0e0e0a', border: `1px solid ${G.goldDim}`, borderRadius: 2, padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', color: G.goldDim, display: 'block', marginBottom: 4 }}>ONE LEVEL HIGHER</span>
          <p style={{ fontSize: 13, color: G.textDim }}>{higher_level}</p>
        </div>
      )}

      {attack?.is_attack && (
        <div style={{ background: '#1a0808', border: `1px solid ${G.red}66`, borderRadius: 2, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>☠</span>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', color: G.red }}>COMBAT STATISTICS</span>
          </div>
          {[['Damage Dice', attack.damage_dice],['Damage Type', attack.damage_type],['Casting Roll', attack.roll],['Range', attack.range],['Area', attack.area],['Soak', attack.soak_allowed ? `Yes — ${attack.soak_note}` : 'No']].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim, minWidth: 80, flexShrink: 0 }}>{l.toUpperCase()}</span>
              <span style={{ fontSize: 13, color: G.text }}>{v}</span>
            </div>
          ))}
          {attack.special && <div style={{ marginTop: 6, padding: '6px', background: 'rgba(0,0,0,0.3)', borderLeft: `2px solid ${G.red}`, fontSize: 12, color: G.textDim }}><strong style={{ color: G.red, fontFamily: 'Cinzel,serif', fontSize: 9 }}>SPECIAL: </strong>{attack.special}</div>}
          {attack.scaling && <div style={{ marginTop: 4, padding: '6px', background: 'rgba(0,0,0,0.3)', borderLeft: '2px solid #7a5020', fontSize: 12, color: G.textDim }}><strong style={{ color: '#a07040', fontFamily: 'Cinzel,serif', fontSize: 9 }}>SCALING: </strong>{attack.scaling}</div>}
        </div>
      )}

      {area_effects && (
        <div style={{ background: '#080e18', border: `1px solid ${G.blue}44`, borderRadius: 2, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', color: G.blue }}>ENVIRONMENTAL IMPACT</span>
          </div>
          {[['Blast Radius', area_effects.blast_radius],['Environment', area_effects.immediate_environment],['Collateral', area_effects.collateral_damage],['Hazards', area_effects.persistent_hazards],['Response', area_effects.narrative_fallout]].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.blue, minWidth: 72, flexShrink: 0, paddingTop: 2 }}>{l.toUpperCase()}</span>
              <span style={{ fontSize: 13, color: G.textDim, lineHeight: 1.5 }}>{v}</span>
            </div>
          ))}
          {area_effects.power_scale_note && (
            <div style={{ marginTop: 6, padding: '6px', background: 'rgba(0,0,0,0.3)', borderLeft: `2px solid ${G.blue}`, fontSize: 12, color: G.text, fontStyle: 'italic' }}>
              <strong style={{ color: G.blue, fontFamily: 'Cinzel,serif', fontSize: 9 }}>POWER SCALE: </strong>{area_effects.power_scale_note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OracleScreen() {
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const [provider, setProvider] = useState(() => getStoredProvider());
  const [apiKey,   setApiKey]   = useState(() => getStoredKey(getStoredProvider()));
  const [history,  setHistory]  = useState([]);
  const inputRef = useRef(null);

  const handleProvider = (p) => {
    storeProvider(p);
    setProvider(p);
    setApiKey(getStoredKey(p));
  };

  const handleKey = (k) => {
    setApiKey(k);
    storeKey(provider, k);
  };

  const ask = async () => {
    const q = query.trim();
    if (!q) return;
    if (!apiKey) { setError('Enter your API key above first.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let raw = await callAI({ provider, apiKey, system: ORACLE_SYSTEM, userMessage: q, maxTokens: 4096 });
      raw = raw.replace(/```json|```/g, '').trim();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { parsed = JSON.parse(repairJSON(raw)); }
      setResult(parsed);
      setHistory((h) => [{ query: q, data: parsed }, ...h.slice(0, 7)]);
    } catch (e) {
      setError('Oracle error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: G.bg }}>
      <div style={{ background: '#0a0806', borderBottom: '1px solid #3a2e1e', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: G.gold }}>⚗ The Sphere Oracle</span>
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 2 }}>Ask what spheres your effect requires</p>
        </div>
        <ProviderBar provider={provider} apiKey={apiKey} onProvider={handleProvider} onKey={handleKey} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 90px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setQuery(ex)}
              style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.08em', border: `1px solid #3a2e1e`, borderRadius: 2, background: 'transparent', color: G.muted, padding: '4px 8px', cursor: 'pointer' }}>
              {ex}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ask(); }}
            placeholder="Describe a magical effect… (Ctrl+Enter to ask)"
            rows={3}
            style={{ flex: 1, background: '#1a1510', border: `1px solid #3a2e1e`, borderRadius: 2, color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 14, padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
          />
          <button onClick={ask} disabled={loading}
            style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.15em', border: `1px solid ${G.gold}`, borderRadius: 2, background: loading ? '#1a1208' : 'transparent', color: G.gold, padding: '0 16px', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: loading ? 0.6 : 1 }}>
            {loading ? '⬡' : 'ASK'}
          </button>
        </div>

        {error && <p style={{ color: '#c08080', fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        {loading && (
          <div style={{ textAlign: 'center', color: G.goldDim, fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '.2em', padding: 20 }}>
            Consulting the Tellurian…
          </div>
        )}
        {result && <ResultBlock data={result} />}

        {history.length > 0 && (
          <div style={{ marginTop: 20, borderTop: `1px solid #3a2e1e`, paddingTop: 12 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.2em', color: G.muted, marginBottom: 8 }}>RECENT QUERIES</div>
            {history.map((item, i) => (
              <div key={i} onClick={() => { setQuery(item.query); setResult(item.data); }}
                style={{ padding: '8px 10px', border: `1px solid #3a2e1e`, borderRadius: 2, marginBottom: 6, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flex: 1, fontSize: 13, color: G.textDim, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.query}</span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                  {(item.data.spheres || []).map((s, j) => {
                    const c = SPHERE_COLORS[s.name] || G.gold;
                    const dots = LEVEL_DOTS[s.level] || '';
                    return <span key={j} style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: c, border: `1px solid ${c}44`, borderRadius: 2, padding: '1px 4px', whiteSpace: 'nowrap' }}>{s.name} {dots}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
