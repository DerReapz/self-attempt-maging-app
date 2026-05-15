import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { PROVIDERS, getStoredProvider, getStoredKey, callAI } from '../utils/aiProvider.js';

const PARADIGM_EXAMPLES = [
  'Hermetic mage — Latin ritual and sacred geometry',
  'Akashic Brother — martial arts and meditation',
  'Virtual Adept — code and information theory',
  'Verbena witch — blood, herbs, and earth magic',
  'Dreamspeaker shaman — spirit bargaining and totem',
  'Son of Ether — steam-punk scientific gadgetry',
  'Cult of Ecstasy — sensation, music, and altered states',
  'Celestial Chorus — prayer and divine song',
];

const CASS_SYSTEM = `You are Cassandra — a paradigm architect and mystical advisor for Mage: The Ascension 2nd Edition (White Wolf).

Your role is to help a mage understand how to perform a specific magical Effect through the lens of their personal Paradigm. Magic works because the mage believes in it — the Paradigm is the story they tell themselves about why their magic works.

For the given Paradigm and desired Effect, provide:
1. PARADIGM ALIGNMENT — How does this Effect fit or strain within this worldview?
2. THE WORKING — A vivid, first-person narrative of how the mage actually performs this Effect within their paradigm.
3. FOCUS & INSTRUMENT — What physical focus or action would this mage use? Suggest 2-3 specific options.
4. COINCIDENTAL FRAMING — How could this Effect be made to look mundane or natural?
5. PARADIGM STRAIN — If the Effect is at the edge of what the Paradigm supports, name the tension.
6. ROLEPLAYING NOTE — A short note on mindset and body language.

Respond ONLY with a valid JSON object — no markdown fences, no preamble:
{
  "alignment": "2-3 sentences assessing how well this Effect fits the paradigm.",
  "working": "3-5 sentences of vivid first-person narrative. Rich sensory detail.",
  "focus_options": ["Option 1 — brief description", "Option 2 — brief description", "Option 3 — brief description"],
  "coincidental_framing": "2-3 sentences on how to make this look non-magical.",
  "paradigm_strain": "2-3 sentences on any tension, stretch, or Quiet risk.",
  "roleplaying_note": "1-2 sentences on player mindset and embodiment."
}`;

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

function CassProviderBadge() {
  const G = useTheme();
  const id    = getStoredProvider();
  const label = PROVIDERS.find(p => p.id === id)?.label || id;
  const hasKey = !!getStoredKey(id);
  return (
    <div style={{ textAlign: 'center', fontSize: 10, color: G.muted }}>
      <span style={{ color: hasKey ? '#6a9a6a' : '#c08080' }}>{hasKey ? '●' : '○'}</span>
      {' '}{label}{' · '}
      <span style={{ fontFamily: 'Cinzel,serif', color: '#8a5a8a' }}>⚙ Settings</span>
    </div>
  );
}

function CassandraResult({ data }) {
  const G = useTheme();
  if (!data) return null;
  const blocks = [
    { key: 'alignment',           label: 'Paradigm Alignment',          color: G.spir || '#8a5a8a' },
    { key: 'working',             label: 'The Working',                  color: '#4a9e8a' },
    { key: 'coincidental_framing',label: 'Coincidental Framing',         color: '#4a9e8a' },
    { key: 'paradigm_strain',     label: 'Paradigm Strain & Quiet Risk', color: G.red    },
    { key: 'roleplaying_note',    label: 'Roleplaying Note',             color: G.goldDim },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      {blocks.map(({ key, label, color }) =>
        data[key] ? (
          <div key={key} style={{ marginBottom: 10, padding: '8px 12px', border: `1px solid ${color}33`, borderRadius: 2, background: `${color}08` }}>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color, display: 'block', marginBottom: 4 }}>{label}</span>
            <p style={{ fontSize: 13, color: G.text, lineHeight: 1.7 }}>{data[key]}</p>
          </div>
        ) : null
      )}
      {Array.isArray(data.focus_options) && data.focus_options.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 12px', border: `1px solid ${G.gold}44`, borderRadius: 2, background: `${G.gold}08` }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: G.gold, display: 'block', marginBottom: 6 }}>Focus & Instrument</span>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.focus_options.map((f, i) => (
              <li key={i} style={{ fontSize: 13, color: G.muted, fontStyle: 'italic', padding: '2px 0' }}>◆ {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CassandraScreen() {
  const G = useTheme();
  const [paradigm, setParadigm] = useState('');
  const [effect,   setEffect]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const [history,  setHistory]  = useState([]);

  const ask = async () => {
    if (!paradigm.trim() || !effect.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    const provider = getStoredProvider();
    const apiKey   = getStoredKey(provider);
    if (!apiKey) { setError('No API key set — configure one in ⚙ Settings.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let raw = await callAI({
        provider, apiKey,
        system: CASS_SYSTEM,
        userMessage: `Paradigm: ${paradigm}\n\nEffect: ${effect}`,
        maxTokens: 2000,
      });
      raw = raw.replace(/```json|```/g, '').trim();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { parsed = JSON.parse(repairJSON(raw)); }
      setResult(parsed);
      setHistory((h) => [{ paradigm: paradigm.trim(), effect: effect.trim(), data: parsed }, ...h.slice(0, 5)]);
    } catch (e) {
      setError('Cassandra error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: G.bg }}>
      <div style={{ background: '#0a0806', borderBottom: '1px solid #3a2e1e', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: '#8a5a8a' }}>⚜ Cassandra</span>
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 2 }}>Paradigm architect & mystical advisor</p>
        </div>
        <CassProviderBadge />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 90px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.2em', color: G.muted, marginBottom: 6 }}>YOUR PARADIGM / TRADITION</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {PARADIGM_EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setParadigm(ex)}
                style={{ fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.06em', border: `1px solid #3a2e1e`, borderRadius: 2, background: 'transparent', color: G.muted, padding: '3px 7px', cursor: 'pointer' }}>
                {ex.split(' — ')[0]}
              </button>
            ))}
          </div>
          <textarea
            value={paradigm}
            onChange={(e) => setParadigm(e.target.value)}
            placeholder="Describe your mage's paradigm, tradition, or belief system…"
            rows={3}
            style={{ width: '100%', background: '#1a1510', border: `1px solid #3a2e1e`, borderRadius: 2, color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 14, padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.2em', color: G.muted, marginBottom: 6 }}>DESIRED EFFECT</div>
          <textarea
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            placeholder="Describe the magical effect you want to achieve…"
            rows={3}
            style={{ width: '100%', background: '#1a1510', border: `1px solid #3a2e1e`, borderRadius: 2, color: G.text, fontFamily: 'EB Garamond,serif', fontSize: 14, padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={ask} disabled={loading}
          style={{ width: '100%', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '.2em', border: `1px solid #8a5a8a`, borderRadius: 2, background: loading ? '#150a15' : 'transparent', color: '#8a5a8a', padding: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginBottom: 12 }}>
          {loading ? '⚜ Reading the threads…' : '⚜ Align Paradigm'}
        </button>

        {error && <p style={{ color: '#c08080', fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        {result && <CassandraResult data={result} />}

        {history.length > 0 && (
          <div style={{ marginTop: 20, borderTop: `1px solid #3a2e1e`, paddingTop: 12 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.2em', color: G.muted, marginBottom: 8 }}>RECENT CONSULTATIONS</div>
            {history.map((item, i) => (
              <div key={i} onClick={() => { setParadigm(item.paradigm); setEffect(item.effect); setResult(item.data); }}
                style={{ padding: '8px 10px', border: `1px solid #3a2e1e`, borderRadius: 2, marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: '#8a5a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.paradigm.slice(0, 50)}{item.paradigm.length > 50 ? '…' : ''}</div>
                <div style={{ fontSize: 12, color: G.textDim, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.effect}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
