import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Dots } from '../components/SharedUI.jsx';
import { mergeSheet } from '../data/defaultSheet.js';
import { loadAll, saveAll, newId } from '../utils/storage.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRADITIONS = [
  { name: 'Akashic Brotherhood',  essence: 'Pattern' },
  { name: 'Celestial Chorus',     essence: 'Questing' },
  { name: 'Cult of Ecstasy',      essence: 'Dynamic' },
  { name: 'Dreamspeakers',        essence: 'Primordial' },
  { name: 'Euthanatos',           essence: 'Primordial' },
  { name: 'Order of Hermes',      essence: 'Pattern' },
  { name: 'Sons of Ether',        essence: 'Pattern' },
  { name: 'Verbena',              essence: 'Dynamic' },
  { name: 'Virtual Adepts',       essence: 'Dynamic' },
  { name: 'Hollow Ones',          essence: 'Questing' },
  { name: 'Independent / Orphan', essence: null },
];

const TRADITION_AFFINITY = {
  'Akashic Brotherhood':  'Mind',
  'Celestial Chorus':     'Prime',
  'Cult of Ecstasy':      'Time',
  'Dreamspeakers':        'Spirit',
  'Euthanatos':           'Entropy',
  'Order of Hermes':      'Forces',
  'Sons of Ether':        'Matter',
  'Verbena':              'Life',
  'Virtual Adepts':       'Correspondence',
  'Hollow Ones':          'Entropy',
};

const ARCHETYPES = [
  'Architect','Autocrat','Bon Vivant','Bravo','Caregiver','Celebrant','Child',
  'Competitor','Conformist','Conniver','Curmudgeon','Defender','Director','Deviant',
  'Eye of the Storm','Fanatic','Gallant','Judge','Loner','Martyr','Masochist',
  'Monster','Pedagogue','Penitent','Perfectionist','Rebel','Rogue','Scientist',
  'Survivor','Thrill-Seeker','Traditionalist','Trickster','Visionary',
];

const ESSENCES = ['Dynamic','Primordial','Pattern','Questing'];

const PHYS_ATTRS = ['Strength','Dexterity','Stamina'];
const SOC_ATTRS  = ['Charisma','Manipulation','Composure'];
const MENT_ATTRS = ['Intelligence','Wits','Resolve'];

const ATTR_TOOLTIPS = {
  Strength:      'Raw physical power. Affects melee damage and feats of strength.',
  Dexterity:     'Speed, agility, and hand-eye coordination.',
  Stamina:       'Endurance, resistance to damage and fatigue.',
  Charisma:      'Natural charm and force of personality.',
  Manipulation:  'Ability to direct others through guile and social pressure.',
  Composure:     'Emotional steadiness under stress (replaces Appearance).',
  Intelligence:  'Raw reasoning and memory.',
  Wits:          'Quickness of mind, reaction speed.',
  Resolve:       'Mental fortitude and focus.',
};

const PHYS_SKILLS  = ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'];
const SOC_SKILLS   = ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'];
const MENT_SKILLS  = ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'];

const ALL_SPHERES = ['Correspondence','Entropy','Forces','Life','Matter','Mind','Prime','Spirit','Time'];

const SPHERE_TOOLTIPS = {
  Correspondence: 'Space and distance — teleportation, scrying, warding.',
  Entropy:        'Decay, chaos, fate — probability and order.',
  Forces:         'Energy — fire, electricity, gravity, light.',
  Life:           'Living matter — healing, shapeshifting, enhancement.',
  Matter:         'Inert matter — transmutation, sculpting, analysis.',
  Mind:           'Consciousness — telepathy, illusion, mental enhancement.',
  Prime:          'Quintessence and the Tellurian — the raw stuff of magic.',
  Spirit:         'The Umbra and spirit beings — perception and interaction.',
  Time:           'Temporal perception and manipulation.',
};

const BG_OPTIONS = [
  'Allies','Arcane','Avatar','Contacts','Destiny','Dream','Fame','Familiar',
  'Finance','Influence','Library','Mentor','Node','Requisitions','Resources',
  'Sanctum','Spies','Talisman','Wonder','Other',
];

const ATTR_POOLS = [7, 5, 3];
const SKILL_POOLS = [13, 9, 5];

// ─── Helper: build initial wizard state ──────────────────────────────────────

function initWiz() {
  return {
    // Step 1
    name: '', tradition: '', nature: '', demeanor: '', essence: '', concept: '', chronicle: '',
    // Step 2 – attribute priority & values
    attrPriority: [null, null, null], // indices into [Physical, Social, Mental] for [1st, 2nd, 3rd]
    physical: { Strength: 1, Dexterity: 1, Stamina: 1 },
    social:   { Charisma: 1, Manipulation: 1, Composure: 1 },
    mental:   { Intelligence: 1, Wits: 1, Resolve: 1 },
    // Step 3 – skill priority & values
    skillPriority: [null, null, null],
    physSkills:  PHYS_SKILLS.map(l => ({ label: l, spec: '', value: 0 })),
    socSkills:   SOC_SKILLS.map(l  => ({ label: l, spec: '', value: 0 })),
    mentSkills:  MENT_SKILLS.map(l => ({ label: l, spec: '', value: 0 })),
    // Step 4
    spheres:     ALL_SPHERES.map(n => ({ name: n, value: 0 })),
    backgrounds: Array(9).fill(null).map(() => ({ name: '', value: 0 })),
    arete: 1,
    // Step 5 – freebies
    fbAttrExtra:  {}, // attr name -> extra dots bought
    fbSkillExtra: {}, // skill label -> extra dots bought
    fbBgExtra:    {}, // bg index -> extra dots
    fbArete:      0,  // extra arete from freebies
    fbWillpower:  0,  // extra willpower from freebies
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function attrGroupPool(wiz, groupIdx) {
  const rank = wiz.attrPriority.indexOf(groupIdx);
  return rank === -1 ? 0 : ATTR_POOLS[rank];
}

function attrGroupSpent(wiz, group) {
  const attrs = group === 0 ? wiz.physical : group === 1 ? wiz.social : wiz.mental;
  return Object.values(attrs).reduce((s, v) => s + (v - 1), 0);
}

function skillGroupPool(wiz, groupIdx) {
  const rank = wiz.skillPriority.indexOf(groupIdx);
  return rank === -1 ? 0 : SKILL_POOLS[rank];
}

function skillGroupSpent(wiz, group) {
  const skills = group === 0 ? wiz.physSkills : group === 1 ? wiz.socSkills : wiz.mentSkills;
  return skills.reduce((s, sk) => s + sk.value, 0);
}

function spheresSpent(wiz) {
  return wiz.spheres.reduce((s, sp) => s + sp.value, 0);
}

function bgsSpent(wiz) {
  return wiz.backgrounds.reduce((s, b) => s + b.value, 0);
}

function freebiesSpent(wiz) {
  const attrCost = Object.values(wiz.fbAttrExtra).reduce((s, v) => s + v * 5, 0);
  const skillCost = Object.values(wiz.fbSkillExtra).reduce((s, v) => s + v * 2, 0);
  const bgCost = Object.values(wiz.fbBgExtra).reduce((s, v) => s + v * 1, 0);
  const areteCost = wiz.fbArete * 4;
  const wpCost = wiz.fbWillpower * 1;
  return attrCost + skillCost + bgCost + areteCost + wpCost;
}

function wizardToSheet(wiz) {
  const sheet = mergeSheet(null);

  sheet.identity.name      = wiz.name;
  sheet.identity.tradition = wiz.tradition;
  sheet.identity.concept   = wiz.concept;
  sheet.identity.chronicle = wiz.chronicle;
  sheet.identity.avatar    = wiz.essence;
  sheet.identity.paradigm  = `${wiz.nature} / ${wiz.demeanor}`;

  // Attributes (include freebie extras)
  const applyAttrExtras = (base, group) => {
    const result = { ...base };
    Object.keys(result).forEach(k => {
      result[k] = Math.min(5, result[k] + (wiz.fbAttrExtra[k] || 0));
    });
    return result;
  };
  sheet.physical = applyAttrExtras(wiz.physical, 0);
  sheet.social   = applyAttrExtras(wiz.social,   1);
  sheet.mental   = applyAttrExtras(wiz.mental,   2);

  // Skills (apply freebie extras)
  const applySkillExtras = (skills) =>
    skills.map(sk => ({ ...sk, value: Math.min(4, sk.value + (wiz.fbSkillExtra[sk.label] || 0)) }));
  sheet.physSkills = applySkillExtras(wiz.physSkills);
  sheet.socSkills  = applySkillExtras(wiz.socSkills);
  sheet.mentSkills = applySkillExtras(wiz.mentSkills);

  // Spheres: fill up to 6 slots
  const filledSpheres = wiz.spheres.filter(s => s.value > 0);
  sheet.spheres = [
    ...filledSpheres.map(s => ({ name: s.name, value: s.value, descs: Array(5).fill('') })),
    ...Array(Math.max(0, 6 - filledSpheres.length)).fill(null).map(() => ({ name: '', value: 0, descs: Array(5).fill('') })),
  ].slice(0, 6);

  // Backgrounds: apply freebie extras
  const bgsWithExtras = wiz.backgrounds.map((b, i) => ({
    ...b,
    value: b.value + (wiz.fbBgExtra[i] || 0),
  }));
  const filledBgs = bgsWithExtras.filter(b => b.name && b.value > 0);
  sheet.backgrounds = [
    ...filledBgs,
    ...Array(Math.max(0, 9 - filledBgs.length)).fill(null).map(() => ({ name: '', value: 0 })),
  ].slice(0, 9);

  // Arete
  const areRating = Math.min(wiz.arete + wiz.fbArete, 10);
  sheet.arete = Array(10).fill(false).map((_, i) => i < areRating);

  // Willpower base 5 + freebies
  const wpRating = Math.min(5 + wiz.fbWillpower, 15);
  sheet.willpower = Array(15).fill(0).map((_, i) => i < wpRating ? 1 : 0);

  // Quintessence = Avatar background rating
  const allBgsWithExtras = wiz.backgrounds.map((b, i) => ({
    ...b,
    value: b.value + (wiz.fbBgExtra[i] || 0),
  }));
  const avatarBg = allBgsWithExtras.find(b => b.name === 'Avatar');
  const quintRating = avatarBg?.value || 0;
  sheet.quint = Array(10).fill(false).map((_, i) => i < quintRating);

  return sheet;
}

// ─── Tip component ───────────────────────────────────────────────────────────

function Tip({ text }) {
  const [show, setShow] = useState(false);
  const G = useTheme();
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
      <span
        onClick={() => setShow(s => !s)}
        style={{
          width: 14, height: 14, borderRadius: '50%', border: `1px solid ${G.goldDim}`,
          color: G.goldDim, fontSize: 9, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0, userSelect: 'none',
        }}
      >?</span>
      {show && (
        <div style={{
          fontSize: 11, color: G.muted, fontStyle: 'italic', lineHeight: 1.5,
          marginTop: 3, padding: '4px 8px', background: G.card,
          border: `1px solid ${G.border}`, borderRadius: 3,
        }}>{text}</div>
      )}
    </span>
  );
}

// ─── Pill button ─────────────────────────────────────────────────────────────

function Pill({ label, active, onClick, small }) {
  const G = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? '3px 8px' : '5px 12px',
        fontSize: small ? 11 : 12,
        fontFamily: 'Cinzel,serif',
        border: `1px solid ${active ? G.gold : G.border}`,
        borderRadius: 20,
        background: active ? G.goldFaint : 'transparent',
        color: active ? G.gold : G.textDim,
        cursor: 'pointer',
        transition: 'all .12s',
        letterSpacing: '.05em',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );
}

// ─── Priority Picker ─────────────────────────────────────────────────────────

function PriorityPicker({ groups, priority, onChange }) {
  const G = useTheme();
  const labels = ['Primary (1st)', 'Secondary (2nd)', 'Tertiary (3rd)'];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      {groups.map((g, gi) => {
        const rank = priority.indexOf(gi);
        return (
          <div key={g} style={{
            flex: '1 1 100px', padding: '10px 8px', border: `1px solid ${rank >= 0 ? G.gold : G.border}`,
            borderRadius: 4, background: rank >= 0 ? G.goldFaint : 'transparent', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: rank >= 0 ? G.gold : G.textDim, marginBottom: 6 }}>{g}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {[0, 1, 2].map(rankIdx => {
                const isThisRank = rank === rankIdx;
                const takenByOther = priority[rankIdx] !== null && priority[rankIdx] !== gi;
                return (
                  <button
                    key={rankIdx}
                    onClick={() => {
                      if (isThisRank) {
                        // deselect
                        const next = [...priority];
                        next[rankIdx] = null;
                        onChange(next);
                      } else if (!takenByOther) {
                        const next = priority.map(p => p === gi ? null : p);
                        next[rankIdx] = gi;
                        onChange(next);
                      }
                    }}
                    style={{
                      padding: '2px 6px', fontSize: 10, fontFamily: 'Cinzel,serif',
                      border: `1px solid ${isThisRank ? G.gold : takenByOther ? G.border : G.goldDim}`,
                      borderRadius: 10, background: isThisRank ? G.gold : 'transparent',
                      color: isThisRank ? G.bg : takenByOther ? G.muted : G.goldDim,
                      cursor: takenByOther ? 'not-allowed' : 'pointer',
                      opacity: takenByOther ? 0.4 : 1,
                    }}
                  >{rankIdx + 1}</button>
                );
              })}
            </div>
            {rank >= 0 && (
              <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>{labels[rank]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Concept & Identity ──────────────────────────────────────────────

function Step1({ wiz, setWiz }) {
  const G = useTheme();
  const set = (k, v) => setWiz(w => ({ ...w, [k]: v }));

  const handleTradition = (name) => {
    const trad = TRADITIONS.find(t => t.name === name);
    setWiz(w => ({
      ...w,
      tradition: name,
      essence: trad?.essence || w.essence,
    }));
  };

  return (
    <div>
      <SectionHead>Concept &amp; Identity</SectionHead>

      <Label>Name *</Label>
      <input
        value={wiz.name}
        onChange={e => set('name', e.target.value)}
        placeholder="Character name"
        style={inputStyle(G)}
      />

      <Label>Concept</Label>
      <input
        value={wiz.concept}
        onChange={e => set('concept', e.target.value)}
        placeholder="e.g. Wandering scholar seeking lost truths"
        style={inputStyle(G)}
      />

      <Label>Chronicle</Label>
      <input
        value={wiz.chronicle}
        onChange={e => set('chronicle', e.target.value)}
        placeholder="Chronicle name (optional)"
        style={inputStyle(G)}
      />

      <Label>Tradition *</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {TRADITIONS.map(t => (
          <Pill
            key={t.name}
            label={t.name}
            active={wiz.tradition === t.name}
            onClick={() => handleTradition(t.name)}
          />
        ))}
      </div>

      <Label>Essence</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {ESSENCES.map(e => (
          <Pill key={e} label={e} active={wiz.essence === e} onClick={() => set('essence', e)} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 140px' }}>
          <Label>Nature</Label>
          <select
            value={wiz.nature}
            onChange={e => set('nature', e.target.value)}
            style={selectStyle(G)}
          >
            <option value="">— Select —</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <Label>Demeanor</Label>
          <select
            value={wiz.demeanor}
            onChange={e => set('demeanor', e.target.value)}
            style={selectStyle(G)}
          >
            <option value="">— Select —</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Attributes ───────────────────────────────────────────────────────

function Step2({ wiz, setWiz }) {
  const G = useTheme();
  const groupNames = ['Physical','Social','Mental'];
  const attrGroups = [PHYS_ATTRS, SOC_ATTRS, MENT_ATTRS];
  const attrObjs   = [wiz.physical, wiz.social, wiz.mental];
  const setKeys    = ['physical','social','mental'];

  const setAttr = (groupKey, attr, val) => {
    setWiz(w => ({ ...w, [groupKey]: { ...w[groupKey], [attr]: val } }));
  };

  return (
    <div>
      <SectionHead>Attributes</SectionHead>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 10, fontStyle: 'italic' }}>
        Assign priorities, then distribute bonus dots. All attributes start at 1.
      </div>
      <div style={{ fontSize: 12, color: G.textDim, marginBottom: 12 }}>
        Pools: <strong style={{ color: G.gold }}>7 / 5 / 3</strong> bonus dots for Primary / Secondary / Tertiary
      </div>

      <PriorityPicker
        groups={groupNames}
        priority={wiz.attrPriority}
        onChange={p => setWiz(w => ({ ...w, attrPriority: p }))}
      />

      {attrGroups.map((attrs, gi) => {
        const pool = attrGroupPool(wiz, gi);
        const spent = attrGroupSpent(wiz, gi);
        const remaining = pool - spent;
        const rank = wiz.attrPriority.indexOf(gi);

        return (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: rank >= 0 ? G.gold : G.textDim, fontWeight: 700 }}>
                {groupNames[gi]}
              </span>
              {rank >= 0 && (
                <span style={{ fontSize: 11, color: remaining === 0 ? G.teal : G.muted }}>
                  {remaining} / {pool} remaining
                </span>
              )}
              {rank === -1 && (
                <span style={{ fontSize: 11, color: G.muted, fontStyle: 'italic' }}>assign priority above</span>
              )}
            </div>
            {attrs.map(attr => {
              const current = attrObjs[gi][attr];
              const canInc = remaining > 0 && current < 5;
              return (
                <div key={attr} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: G.text, minWidth: 110, flexShrink: 0 }}>{attr}</span>
                  <Dots
                    max={5}
                    value={current}
                    onChange={v => {
                      if (v > current && remaining <= 0) return;
                      if (v < 1) return;
                      setAttr(setKeys[gi], attr, v);
                    }}
                  />
                  <Tip text={ATTR_TOOLTIPS[attr]} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Abilities ────────────────────────────────────────────────────────

function Step3({ wiz, setWiz }) {
  const G = useTheme();
  const groupNames = ['Physical','Social','Mental'];
  const skillKeys  = ['physSkills','socSkills','mentSkills'];
  const allSkills  = [wiz.physSkills, wiz.socSkills, wiz.mentSkills];

  const setSkill = (groupKey, idx, field, val) => {
    setWiz(w => ({
      ...w,
      [groupKey]: w[groupKey].map((sk, i) => i === idx ? { ...sk, [field]: val } : sk),
    }));
  };

  return (
    <div>
      <SectionHead>Abilities</SectionHead>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 10, fontStyle: 'italic' }}>
        Assign priorities, then distribute skill dots. Max 3 per skill during character creation.
      </div>
      <div style={{ fontSize: 12, color: G.textDim, marginBottom: 12 }}>
        Pools: <strong style={{ color: G.gold }}>13 / 9 / 5</strong> dots for Primary / Secondary / Tertiary
      </div>

      <PriorityPicker
        groups={groupNames}
        priority={wiz.skillPriority}
        onChange={p => setWiz(w => ({ ...w, skillPriority: p }))}
      />

      {allSkills.map((skills, gi) => {
        const pool = skillGroupPool(wiz, gi);
        const spent = skillGroupSpent(wiz, gi);
        const remaining = pool - spent;
        const rank = wiz.skillPriority.indexOf(gi);

        return (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: rank >= 0 ? G.gold : G.textDim, fontWeight: 700 }}>
                {groupNames[gi]}
              </span>
              {rank >= 0 && (
                <span style={{ fontSize: 11, color: remaining === 0 ? G.teal : G.muted }}>
                  {remaining} / {pool} remaining
                </span>
              )}
              {rank === -1 && (
                <span style={{ fontSize: 11, color: G.muted, fontStyle: 'italic' }}>assign priority above</span>
              )}
            </div>
            {skills.map((sk, si) => {
              const canInc = remaining > 0 && sk.value < 3;
              return (
                <div key={sk.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: G.text, minWidth: 110, flexShrink: 0 }}>{sk.label}</span>
                  <input
                    value={sk.spec}
                    onChange={e => setSkill(skillKeys[gi], si, 'spec', e.target.value)}
                    placeholder="specialty"
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${G.goldFaint}`, color: G.goldDim,
                      fontSize: 11, fontStyle: 'italic', outline: 'none',
                      padding: '0 1px', minWidth: 0,
                    }}
                  />
                  <Dots
                    max={3}
                    value={sk.value}
                    onChange={v => {
                      if (v > sk.value && remaining <= 0) return;
                      setSkill(skillKeys[gi], si, 'value', v);
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 4: Advantages ───────────────────────────────────────────────────────

function Step4({ wiz, setWiz }) {
  const G = useTheme();
  const affinity = TRADITION_AFFINITY[wiz.tradition] || null;
  const sphereTotal = spheresSpent(wiz);
  const bgTotal = bgsSpent(wiz);

  const setSphere = (idx, val) => {
    const cost = val - wiz.spheres[idx].value;
    if (cost > 0 && sphereTotal >= 6) return;
    if (val < 0 || val > 3) return;
    setWiz(w => ({
      ...w,
      spheres: w.spheres.map((s, i) => i === idx ? { ...s, value: val } : s),
    }));
  };

  const setBg = (idx, field, val) => {
    setWiz(w => ({
      ...w,
      backgrounds: w.backgrounds.map((b, i) => i === idx ? { ...b, [field]: val } : b),
    }));
  };

  return (
    <div>
      {/* Spheres */}
      <SectionHead>Spheres</SectionHead>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 8, fontStyle: 'italic' }}>
        6 points to spend. Max 3 per sphere at character creation.
      </div>
      <div style={{ fontSize: 12, color: sphereTotal === 6 ? G.teal : G.textDim, marginBottom: 12 }}>
        Spent: <strong style={{ color: G.gold }}>{sphereTotal}</strong> / 6
      </div>

      {wiz.spheres.map((sp, si) => {
        const isAffinity = sp.name === affinity;
        const remaining = 6 - sphereTotal;
        return (
          <div key={sp.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{
              fontSize: 13, minWidth: 120, flexShrink: 0,
              color: isAffinity ? G.gold : G.text,
              fontWeight: isAffinity ? 700 : 'normal',
            }}>
              {sp.name}
              {isAffinity && <span style={{ fontSize: 10, color: G.goldDim, marginLeft: 4 }}>(affinity)</span>}
            </span>
            <Dots
              max={3}
              value={sp.value}
              onChange={v => setSphere(si, v)}
            />
            <Tip text={SPHERE_TOOLTIPS[sp.name]} />
          </div>
        );
      })}

      {/* Backgrounds */}
      <div style={{ marginTop: 20 }}>
        <SectionHead>Backgrounds</SectionHead>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 8, fontStyle: 'italic' }}>
          7 points to spend. Tip: Avatar background sets your starting Quintessence.
        </div>
        <div style={{ fontSize: 12, color: bgTotal === 7 ? G.teal : G.textDim, marginBottom: 12 }}>
          Spent: <strong style={{ color: G.gold }}>{bgTotal}</strong> / 7
        </div>

        {wiz.backgrounds.map((bg, bi) => {
          const remaining = 7 - bgTotal;
          return (
            <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <select
                value={BG_OPTIONS.includes(bg.name) ? bg.name : (bg.name ? 'Other' : '')}
                onChange={e => {
                  const val = e.target.value;
                  setBg(bi, 'name', val === 'Other' ? '' : val);
                }}
                style={{ ...selectStyle(G), flex: '0 0 130px', fontSize: 12 }}
              >
                <option value="">— None —</option>
                {BG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {(!BG_OPTIONS.includes(bg.name) && bg.name !== '') || (BG_OPTIONS.includes(bg.name) && bg.name === 'Other') ? (
                <input
                  value={bg.name}
                  onChange={e => setBg(bi, 'name', e.target.value)}
                  placeholder="Custom background"
                  style={{ flex: 1, ...inputStyle(G), marginBottom: 0 }}
                />
              ) : <div style={{ flex: 1 }} />}
              <Dots
                max={5}
                value={bg.value}
                onChange={v => {
                  const cost = v - bg.value;
                  if (cost > 0 && bgTotal >= 7) return;
                  setBg(bi, 'value', v);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Arete */}
      <div style={{ marginTop: 20 }}>
        <SectionHead>Arete</SectionHead>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dots max={3} value={wiz.arete} onChange={() => {}} color={G.purple} />
          <span style={{ fontSize: 12, color: G.muted, fontStyle: 'italic' }}>
            Starts at 1. Can be raised further with Freebie points in Step 5.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Freebies ─────────────────────────────────────────────────────────

function Step5({ wiz, setWiz }) {
  const G = useTheme();
  const [openSection, setOpenSection] = useState(null);

  const spent = freebiesSpent(wiz);
  const remaining = 15 - spent;

  const toggleSection = (s) => setOpenSection(o => o === s ? null : s);

  // Helpers
  const getAttrVal = (attr) => {
    const all = { ...wiz.physical, ...wiz.social, ...wiz.mental };
    return (all[attr] || 1) + (wiz.fbAttrExtra[attr] || 0);
  };
  const addAttrDot = (attr) => {
    if (remaining < 5) return;
    const cur = getAttrVal(attr);
    if (cur >= 5) return;
    setWiz(w => ({ ...w, fbAttrExtra: { ...w.fbAttrExtra, [attr]: (w.fbAttrExtra[attr] || 0) + 1 } }));
  };
  const removeAttrDot = (attr) => {
    const extra = wiz.fbAttrExtra[attr] || 0;
    if (extra <= 0) return;
    setWiz(w => ({ ...w, fbAttrExtra: { ...w.fbAttrExtra, [attr]: extra - 1 } }));
  };

  const getSkillVal = (label, group) => {
    const sk = group.find(s => s.label === label);
    return (sk?.value || 0) + (wiz.fbSkillExtra[label] || 0);
  };
  const addSkillDot = (label, baseGroup) => {
    if (remaining < 2) return;
    const cur = getSkillVal(label, baseGroup);
    if (cur >= 4) return;
    setWiz(w => ({ ...w, fbSkillExtra: { ...w.fbSkillExtra, [label]: (w.fbSkillExtra[label] || 0) + 1 } }));
  };
  const removeSkillDot = (label) => {
    const extra = wiz.fbSkillExtra[label] || 0;
    if (extra <= 0) return;
    setWiz(w => ({ ...w, fbSkillExtra: { ...w.fbSkillExtra, [label]: extra - 1 } }));
  };

  const totalArete = wiz.arete + wiz.fbArete;
  const totalWp = 5 + wiz.fbWillpower;

  const allAttrs = [
    ...PHYS_ATTRS.map(a => ({ attr: a, group: 0 })),
    ...SOC_ATTRS.map(a  => ({ attr: a, group: 1 })),
    ...MENT_ATTRS.map(a => ({ attr: a, group: 2 })),
  ];
  const groupKeys = ['physical','social','mental'];
  const allSkillGroups = [
    { key: 'physSkills', label: 'Physical', skills: wiz.physSkills },
    { key: 'socSkills',  label: 'Social',   skills: wiz.socSkills },
    { key: 'mentSkills', label: 'Mental',   skills: wiz.mentSkills },
  ];

  return (
    <div>
      <SectionHead>Freebies</SectionHead>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 10, fontStyle: 'italic' }}>
        15 freebie points to spend as you wish.
      </div>

      {/* Pool indicator */}
      <div style={{
        padding: '8px 14px', marginBottom: 16,
        border: `1px solid ${remaining > 0 ? G.gold : G.teal}`,
        borderRadius: 4, background: G.goldFaint,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: G.gold }}>{remaining}</span>
        <span style={{ fontSize: 12, color: G.textDim }}>freebie points remaining (of 15)</span>
      </div>

      {/* Cost table */}
      <div style={{ fontSize: 11, color: G.muted, marginBottom: 14, fontStyle: 'italic', lineHeight: 1.8 }}>
        <div>Attribute dot: <strong style={{ color: G.textDim }}>5 pts</strong></div>
        <div>Ability dot: <strong style={{ color: G.textDim }}>2 pts</strong></div>
        <div>Background dot: <strong style={{ color: G.textDim }}>1 pt</strong></div>
        <div>Sphere dot: <strong style={{ color: G.textDim }}>7 pts</strong> (via sheet after creation)</div>
        <div>Arete +1: <strong style={{ color: G.textDim }}>4 pts</strong> (max 3 at creation)</div>
        <div>Willpower +1: <strong style={{ color: G.textDim }}>1 pt</strong> (base 5, max 8)</div>
      </div>

      {/* Arete */}
      <FreebieSection label="Arete" open={openSection === 'arete'} onToggle={() => toggleSection('arete')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dots max={3} value={totalArete} onChange={() => {}} color={G.purple} />
          <span style={{ fontSize: 12, color: G.muted }}>{totalArete}</span>
          <button
            onClick={() => {
              if (remaining < 4 || totalArete >= 3) return;
              setWiz(w => ({ ...w, fbArete: w.fbArete + 1 }));
            }}
            disabled={remaining < 4 || totalArete >= 3}
            style={plusBtn(G, remaining >= 4 && totalArete < 3)}
          >+</button>
          <button
            onClick={() => {
              if (wiz.fbArete <= 0) return;
              setWiz(w => ({ ...w, fbArete: w.fbArete - 1 }));
            }}
            disabled={wiz.fbArete <= 0}
            style={plusBtn(G, wiz.fbArete > 0)}
          >−</button>
          <span style={{ fontSize: 11, color: G.muted }}>4 pts each · max 3</span>
        </div>
      </FreebieSection>

      {/* Willpower */}
      <FreebieSection label="Willpower" open={openSection === 'wp'} onToggle={() => toggleSection('wp')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: G.text }}>{totalWp}</span>
          <button
            onClick={() => {
              if (remaining < 1 || totalWp >= 8) return;
              setWiz(w => ({ ...w, fbWillpower: w.fbWillpower + 1 }));
            }}
            disabled={remaining < 1 || totalWp >= 8}
            style={plusBtn(G, remaining >= 1 && totalWp < 8)}
          >+</button>
          <button
            onClick={() => {
              if (wiz.fbWillpower <= 0) return;
              setWiz(w => ({ ...w, fbWillpower: w.fbWillpower - 1 }));
            }}
            disabled={wiz.fbWillpower <= 0}
            style={plusBtn(G, wiz.fbWillpower > 0)}
          >−</button>
          <span style={{ fontSize: 11, color: G.muted }}>1 pt each · base 5 · max 8</span>
        </div>
      </FreebieSection>

      {/* Attributes */}
      <FreebieSection label="Attributes (5 pts each)" open={openSection === 'attrs'} onToggle={() => toggleSection('attrs')}>
        {allAttrs.map(({ attr, group }) => {
          const base = wiz[groupKeys[group]][attr] || 1;
          const extra = wiz.fbAttrExtra[attr] || 0;
          const total = base + extra;
          return (
            <div key={attr} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: G.text, minWidth: 110, flexShrink: 0 }}>{attr}</span>
              <Dots max={5} value={total} onChange={() => {}} />
              <span style={{ fontSize: 11, color: G.muted, minWidth: 20 }}>{total}</span>
              <button onClick={() => addAttrDot(attr)} disabled={remaining < 5 || total >= 5} style={plusBtn(G, remaining >= 5 && total < 5)}>+</button>
              <button onClick={() => removeAttrDot(attr)} disabled={extra <= 0} style={plusBtn(G, extra > 0)}>−</button>
            </div>
          );
        })}
      </FreebieSection>

      {/* Abilities */}
      <FreebieSection label="Abilities (2 pts each)" open={openSection === 'skills'} onToggle={() => toggleSection('skills')}>
        {allSkillGroups.map(({ label, skills }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, color: G.goldDim, marginBottom: 5 }}>{label}</div>
            {skills.map(sk => {
              const extra = wiz.fbSkillExtra[sk.label] || 0;
              const total = sk.value + extra;
              return (
                <div key={sk.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: G.text, minWidth: 110, flexShrink: 0 }}>{sk.label}</span>
                  <Dots max={4} value={total} onChange={() => {}} />
                  <span style={{ fontSize: 11, color: G.muted, minWidth: 20 }}>{total}</span>
                  <button onClick={() => addSkillDot(sk.label, skills)} disabled={remaining < 2 || total >= 4} style={plusBtn(G, remaining >= 2 && total < 4)}>+</button>
                  <button onClick={() => removeSkillDot(sk.label)} disabled={extra <= 0} style={plusBtn(G, extra > 0)}>−</button>
                </div>
              );
            })}
          </div>
        ))}
      </FreebieSection>

      {/* Backgrounds */}
      <FreebieSection label="Backgrounds (1 pt each)" open={openSection === 'bgs'} onToggle={() => toggleSection('bgs')}>
        {wiz.backgrounds.map((bg, bi) => {
          if (!bg.name) return null;
          const extra = wiz.fbBgExtra[bi] || 0;
          const total = bg.value + extra;
          return (
            <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: G.text, minWidth: 110, flexShrink: 0 }}>{bg.name || '—'}</span>
              <Dots max={5} value={total} onChange={() => {}} />
              <span style={{ fontSize: 11, color: G.muted, minWidth: 20 }}>{total}</span>
              <button
                onClick={() => {
                  if (remaining < 1 || total >= 5) return;
                  setWiz(w => ({ ...w, fbBgExtra: { ...w.fbBgExtra, [bi]: extra + 1 } }));
                }}
                disabled={remaining < 1 || total >= 5}
                style={plusBtn(G, remaining >= 1 && total < 5)}
              >+</button>
              <button
                onClick={() => {
                  if (extra <= 0) return;
                  setWiz(w => ({ ...w, fbBgExtra: { ...w.fbBgExtra, [bi]: extra - 1 } }));
                }}
                disabled={extra <= 0}
                style={plusBtn(G, extra > 0)}
              >−</button>
            </div>
          );
        })}
        {wiz.backgrounds.every(b => !b.name) && (
          <div style={{ fontSize: 12, color: G.muted, fontStyle: 'italic' }}>
            No backgrounds allocated in Step 4.
          </div>
        )}
      </FreebieSection>
    </div>
  );
}

function FreebieSection({ label, open, onToggle, children }) {
  const G = useTheme();
  return (
    <div style={{ marginBottom: 10, border: `1px solid ${G.border}`, borderRadius: 4 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '9px 12px', background: open ? G.goldFaint : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'Cinzel,serif', fontSize: 12, color: open ? G.gold : G.textDim,
          letterSpacing: '.08em',
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 14, color: G.goldDim }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '10px 14px' }}>{children}</div>
      )}
    </div>
  );
}

// ─── Step 6: Review & Create ─────────────────────────────────────────────────

function Step6({ wiz, onDone, onCancel }) {
  const G = useTheme();

  const allAttrs = {
    ...wiz.physical, ...wiz.social, ...wiz.mental,
  };
  const applyFbAttr = (attr) => Math.min(5, (allAttrs[attr] || 1) + (wiz.fbAttrExtra[attr] || 0));
  const applyFbSkill = (sk) => Math.min(4, sk.value + (wiz.fbSkillExtra[sk.label] || 0));

  const allSkills = [
    ...wiz.physSkills, ...wiz.socSkills, ...wiz.mentSkills,
  ].map(sk => ({ ...sk, value: applyFbSkill(sk) })).filter(sk => sk.value > 0);

  const filledSpheres = wiz.spheres.filter(s => s.value > 0);
  const filledBgs = wiz.backgrounds.map((b, i) => ({
    ...b,
    value: b.value + (wiz.fbBgExtra[i] || 0),
  })).filter(b => b.name && b.value > 0);

  const totalArete = wiz.arete + wiz.fbArete;
  const totalWp = 5 + wiz.fbWillpower;

  const avatarBg = filledBgs.find(b => b.name === 'Avatar');
  const quintRating = avatarBg?.value || 0;

  const warnings = [];
  if (!wiz.name) warnings.push('Character has no name.');
  if (!wiz.tradition) warnings.push('No tradition selected.');
  if (filledSpheres.length === 0) warnings.push('No spheres allocated.');
  if (wiz.attrPriority.some(p => p === null)) warnings.push('Attribute priorities not fully assigned.');
  if (wiz.skillPriority.some(p => p === null)) warnings.push('Ability priorities not fully assigned.');
  const attrRemaining = [0, 1, 2].reduce((t, gi) => t + (attrGroupPool(wiz, gi) - attrGroupSpent(wiz, gi)), 0);
  if (attrRemaining > 0) warnings.push(`${attrRemaining} attribute points unspent.`);
  const skillRemaining = [0, 1, 2].reduce((t, gi) => t + (skillGroupPool(wiz, gi) - skillGroupSpent(wiz, gi)), 0);
  if (skillRemaining > 0) warnings.push(`${skillRemaining} ability points unspent.`);

  const handleCreate = () => {
    const sheet = wizardToSheet(wiz);
    const all = loadAll();
    const id = newId();
    all[id] = sheet;
    saveAll(all);
    onDone(id);
  };

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
      <span style={{ color: G.goldDim, minWidth: 120, flexShrink: 0, fontFamily: 'Cinzel,serif', fontSize: 11 }}>{label}</span>
      <span style={{ color: G.text }}>{value}</span>
    </div>
  );

  return (
    <div>
      <SectionHead>Review &amp; Create</SectionHead>

      {warnings.length > 0 && (
        <div style={{
          marginBottom: 14, padding: '10px 14px',
          border: `1px solid ${G.red}44`, borderRadius: 4,
          background: `${G.red}11`,
        }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, color: G.red, marginBottom: 6, letterSpacing: '.1em' }}>WARNINGS</div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: G.red, marginBottom: 3 }}>• {w}</div>
          ))}
        </div>
      )}

      {/* Identity */}
      <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${G.border}`, borderRadius: 4 }}>
        <GroupHead>Identity</GroupHead>
        <Row label="Name" value={wiz.name || '—'} />
        <Row label="Tradition" value={wiz.tradition || '—'} />
        <Row label="Concept" value={wiz.concept || '—'} />
        <Row label="Chronicle" value={wiz.chronicle || '—'} />
        <Row label="Nature / Demeanor" value={wiz.nature && wiz.demeanor ? `${wiz.nature} / ${wiz.demeanor}` : '—'} />
        <Row label="Essence" value={wiz.essence || '—'} />
        <Row label="Arete" value={totalArete} />
        <Row label="Willpower" value={totalWp} />
        <Row label="Quintessence" value={quintRating} />
      </div>

      {/* Attributes */}
      <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${G.border}`, borderRadius: 4 }}>
        <GroupHead>Attributes</GroupHead>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Physical', attrs: PHYS_ATTRS },
            { label: 'Social',   attrs: SOC_ATTRS },
            { label: 'Mental',   attrs: MENT_ATTRS },
          ].map(({ label, attrs }) => (
            <div key={label} style={{ flex: '1 1 80px' }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: G.goldDim, marginBottom: 4, letterSpacing: '.15em' }}>{label.toUpperCase()}</div>
              {attrs.map(a => (
                <div key={a} style={{ fontSize: 12, color: G.text, marginBottom: 2 }}>
                  {a}: <strong style={{ color: G.gold }}>{applyFbAttr(a)}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      {allSkills.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${G.border}`, borderRadius: 4 }}>
          <GroupHead>Skills</GroupHead>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
            {allSkills.map(sk => (
              <div key={sk.label} style={{ fontSize: 12, color: G.text, minWidth: '45%' }}>
                {sk.label}: <strong style={{ color: G.gold }}>{sk.value}</strong>
                {sk.spec && <span style={{ fontSize: 11, color: G.goldDim }}> ({sk.spec})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spheres */}
      {filledSpheres.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${G.border}`, borderRadius: 4 }}>
          <GroupHead>Spheres</GroupHead>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
            {filledSpheres.map(sp => (
              <div key={sp.name} style={{ fontSize: 12, color: G.text, minWidth: '45%' }}>
                {sp.name}: <strong style={{ color: G.purple }}>{sp.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backgrounds */}
      {filledBgs.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${G.border}`, borderRadius: 4 }}>
          <GroupHead>Backgrounds</GroupHead>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
            {filledBgs.map((bg, i) => (
              <div key={i} style={{ fontSize: 12, color: G.text, minWidth: '45%' }}>
                {bg.name}: <strong style={{ color: G.gold }}>{bg.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleCreate}
        style={{
          width: '100%', padding: '13px', marginTop: 8,
          fontFamily: 'Cinzel,serif', fontSize: 14, letterSpacing: '.2em',
          border: `1px solid ${G.gold}`, borderRadius: 4,
          background: G.goldFaint, color: G.gold, cursor: 'pointer',
          transition: 'background .15s',
        }}
      >
        ◈ CREATE CHARACTER ◈
      </button>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHead({ children }) {
  const G = useTheme();
  return (
    <div style={{
      fontFamily: 'Cinzel,serif', fontSize: 15, letterSpacing: '.2em',
      color: G.gold, marginBottom: 14, paddingBottom: 6,
      borderBottom: `1px solid ${G.goldFaint}`,
    }}>{children}</div>
  );
}

function GroupHead({ children }) {
  const G = useTheme();
  return (
    <div style={{
      fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.18em',
      color: G.goldDim, marginBottom: 8,
    }}>{children.toUpperCase()}</div>
  );
}

function Label({ children }) {
  const G = useTheme();
  return (
    <div style={{
      fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.18em',
      color: G.goldDim, marginBottom: 4, marginTop: 2,
    }}>{children.toUpperCase ? children.toUpperCase() : children}</div>
  );
}

function inputStyle(G) {
  return {
    display: 'block', width: '100%', boxSizing: 'border-box',
    background: 'transparent', border: 'none',
    borderBottom: `1px solid ${G.goldFaint}`,
    color: G.text, fontSize: 13, outline: 'none',
    padding: '4px 2px', marginBottom: 14,
  };
}

function selectStyle(G) {
  return {
    display: 'block', width: '100%', boxSizing: 'border-box',
    background: G.card, border: `1px solid ${G.border}`,
    color: G.text, fontSize: 13, outline: 'none',
    padding: '5px 8px', marginBottom: 14, borderRadius: 3,
  };
}

function plusBtn(G, enabled) {
  return {
    width: 24, height: 24, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: 4,
    border: `1px solid ${enabled ? G.goldDim : G.border}`,
    background: 'transparent', color: enabled ? G.gold : G.muted,
    cursor: enabled ? 'pointer' : 'not-allowed', fontSize: 14,
    padding: 0, flexShrink: 0,
  };
}

// ─── Step validation ──────────────────────────────────────────────────────────

function canProceed(step, wiz) {
  if (step === 1) {
    return !!wiz.name.trim() && !!wiz.tradition;
  }
  if (step === 2) {
    if (wiz.attrPriority.some(p => p === null)) return false;
    return [0, 1, 2].every(gi => attrGroupPool(wiz, gi) - attrGroupSpent(wiz, gi) === 0);
  }
  if (step === 3) {
    if (wiz.skillPriority.some(p => p === null)) return false;
    return [0, 1, 2].every(gi => skillGroupPool(wiz, gi) - skillGroupSpent(wiz, gi) === 0);
  }
  return true; // steps 4, 5, 6
}

// ─── Main component ───────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Concept',
  'Attributes',
  'Abilities',
  'Advantages',
  'Freebies',
  'Review',
];

export default function CharacterCreator({ onDone, onCancel }) {
  const G = useTheme();
  const [step, setStep] = useState(1);
  const [wiz, setWiz] = useState(initWiz);

  const ok = canProceed(step, wiz);

  const handleDone = (id) => onDone(id);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: G.bg, color: G.text, fontFamily: 'EB Garamond,serif',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        borderBottom: `1px solid ${G.border}`,
        background: G.card,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 15, color: G.gold, letterSpacing: '.15em' }}>
            Character Creation
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: `1px solid ${G.border}`,
              color: G.muted, borderRadius: 3, padding: '3px 10px',
              fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel,serif',
            }}
          >✕ Cancel</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div
                key={n}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontFamily: 'Cinzel,serif',
                  border: `1.5px solid ${active ? G.gold : done ? G.teal : G.border}`,
                  background: active ? G.goldFaint : done ? `${G.teal}22` : 'transparent',
                  color: active ? G.gold : done ? G.teal : G.muted,
                  cursor: done ? 'pointer' : 'default',
                }}
                  onClick={() => { if (done) setStep(n); }}
                >{done ? '✓' : n}</div>
                <div style={{ fontSize: 8, color: active ? G.gold : G.muted, letterSpacing: '.1em' }}>
                  {label.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {step === 1 && <Step1 wiz={wiz} setWiz={setWiz} />}
        {step === 2 && <Step2 wiz={wiz} setWiz={setWiz} />}
        {step === 3 && <Step3 wiz={wiz} setWiz={setWiz} />}
        {step === 4 && <Step4 wiz={wiz} setWiz={setWiz} />}
        {step === 5 && <Step5 wiz={wiz} setWiz={setWiz} />}
        {step === 6 && <Step6 wiz={wiz} onDone={handleDone} onCancel={onCancel} />}
      </div>

      {/* Footer nav */}
      <div style={{
        flexShrink: 0, padding: '10px 16px',
        borderTop: `1px solid ${G.border}`,
        background: G.card,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{
            flex: 1, padding: '10px', fontFamily: 'Cinzel,serif', fontSize: 12,
            letterSpacing: '.1em', border: `1px solid ${step > 1 ? G.border : G.border}`,
            borderRadius: 4, background: 'transparent',
            color: step > 1 ? G.textDim : G.muted,
            cursor: step > 1 ? 'pointer' : 'not-allowed', opacity: step > 1 ? 1 : 0.4,
          }}
        >← Prev</button>

        <div style={{ fontSize: 11, color: G.muted, textAlign: 'center', minWidth: 50 }}>
          {step} / {STEP_LABELS.length}
        </div>

        {step < STEP_LABELS.length ? (
          <button
            onClick={() => { if (ok) setStep(s => s + 1); }}
            disabled={!ok}
            style={{
              flex: 1, padding: '10px', fontFamily: 'Cinzel,serif', fontSize: 12,
              letterSpacing: '.1em', border: `1px solid ${ok ? G.gold : G.border}`,
              borderRadius: 4, background: ok ? G.goldFaint : 'transparent',
              color: ok ? G.gold : G.muted, cursor: ok ? 'pointer' : 'not-allowed',
              opacity: ok ? 1 : 0.5,
            }}
          >Next →</button>
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </div>
    </div>
  );
}
