import { useState } from 'react';
import { G, SPHERE_COLORS } from '../palette.js';

// ── Type colour helper ─────────────────────────────────────────────────────
const TYPE_CLR = { Coincidental: '#5cad8f', Vulgar: '#c03030', Ritual: '#c8a84b' };
function primaryType(t) {
  return t.startsWith('Coincidental') ? 'Coincidental' : t.startsWith('Vulgar') ? 'Vulgar' : 'Ritual';
}
function TypePill({ type }) {
  const c = TYPE_CLR[primaryType(type)] || G.gold;
  return (
    <span style={{
      fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.08em',
      padding: '2px 6px', borderRadius: 2,
      border: `1px solid ${c}44`, color: c, background: `${c}18`,
      whiteSpace: 'nowrap',
    }}>{type}</span>
  );
}

// ── Rote data ──────────────────────────────────────────────────────────────
const ROTES = [
  {
    id: 'correspondence', sphere: 'Correspondence', color: SPHERE_COLORS.Correspondence,
    rotes: [
      { name: 'Locate Object / Person',  req: 'Correspondence 1', type: 'Coincidental', dice: 'Arete',            effect: 'Sense the whereabouts of a known object or person within Perception range, or map nearby spaces without sight.' },
      { name: 'Perfect Aim',             req: 'Correspondence 2', type: 'Coincidental', dice: 'Arete',            effect: 'Ignore all range penalties for ranged attacks. Each success beyond the first extends effective range by one range band.' },
      { name: 'Spatial Ward',            req: 'Correspondence 2', type: 'Coincidental', dice: 'Arete',            effect: 'Erect an invisible boundary that alerts the mage to intrusions or prevents teleportation into the warded area.' },
      { name: 'Correspondence Sensing',  req: 'Correspondence 2', type: 'Coincidental', dice: 'Arete',            effect: 'Extend senses beyond their normal range; spy on a distant location or perceive multiple places simultaneously.' },
      { name: 'Teleport Self',           req: 'Correspondence 3', type: 'Vulgar',       dice: 'Arete',            effect: 'Instantly move to any location you can perceive or know intimately. Each success increases maximum distance.' },
      { name: 'Teleport Object',         req: 'Correspondence 3', type: 'Vulgar',       dice: 'Arete',            effect: 'Send an object (or willing person, add Life) to a known location. Must be able to perceive origin or destination.' },
      { name: 'Co-location',             req: 'Correspondence 4', type: 'Vulgar',       dice: 'Arete (split)',    effect: 'Exist in two locations at once. Actions in each location are possible but dice pools are split between them.' },
    ],
  },
  {
    id: 'entropy', sphere: 'Entropy', color: SPHERE_COLORS.Entropy,
    rotes: [
      { name: 'Sense Fate & Fortune',  req: 'Entropy 1', type: 'Coincidental',                           dice: 'Arete', effect: 'Perceive the flow of fate. Spot structural weaknesses, notice fortunate moments, or sense approaching doom.' },
      { name: 'Lucky Break',           req: 'Entropy 2', type: 'Coincidental',                           dice: 'Arete', effect: 'Bend probability in your favour. Reduce difficulty by 1 per success on the next roll, or grant the bonus to another.' },
      { name: 'Jinx',                  req: 'Entropy 2', type: 'Coincidental',                           dice: 'Arete vs. target', effect: 'Subtly curse a target — they suffer +1 difficulty on their next N rolls (N = extra successes).' },
      { name: 'Accelerate Decay',      req: 'Entropy 3', type: 'Coincidental (objects), Vulgar (beings)', dice: 'Arete', effect: 'Age or corrode a target rapidly. Objects crumble to dust; living tissue suffers aggravated damage.' },
      { name: 'Destroy the Threads',  req: 'Entropy 4', type: 'Vulgar',                                  dice: 'Arete', effect: 'Unravel a Pattern entirely. Destroys inanimate objects; inflicts catastrophic damage to living beings.' },
    ],
  },
  {
    id: 'forces', sphere: 'Forces', color: SPHERE_COLORS.Forces,
    rotes: [
      { name: 'Control Light',       req: 'Forces 2', type: 'Coincidental', dice: 'Arete',            effect: 'Bend, block, or redirect light. Create darkness zones, redirect laser beams, or project simple light images.' },
      { name: 'Electrical Control',  req: 'Forces 2', type: 'Coincidental', dice: 'Arete',            effect: 'Direct or suppress electrical current. Power devices, fry electronics, or deliver controlled shocks.' },
      { name: 'Control Fire',        req: 'Forces 2', type: 'Coincidental', dice: 'Arete',            effect: 'Shape, move, intensify, or extinguish existing flames within Perception range. Cannot create fire from nothing.' },
      { name: 'Lightning Bolt',      req: 'Forces 3', type: 'Vulgar',       dice: 'Arete',            effect: 'Conjure and hurl electricity at a target. Base damage = successes + 3, lethal. Aggravated against spirits.' },
      { name: 'Fireball',            req: 'Forces 3', type: 'Vulgar',       dice: 'Arete',            effect: 'Create and launch a ball of fire. Can set flammables alight; area effect possible with extra successes.' },
      { name: 'Gravitic Shift',      req: 'Forces 4', type: 'Vulgar',       dice: 'Arete',            effect: 'Alter gravitational pull locally. Crush targets, create zero-g zones, or redirect the force of falls and impacts.' },
      { name: 'Stasis Field',        req: 'Forces 4', type: 'Vulgar',       dice: 'Arete',            effect: 'Bring all kinetic forces to a halt in a zone. Nothing can move in or through the field for the duration.' },
    ],
  },
  {
    id: 'life', sphere: 'Life', color: SPHERE_COLORS.Life,
    rotes: [
      { name: 'Sense Life',        req: 'Life 1', type: 'Coincidental', dice: 'Arete',         effect: 'Detect living beings through walls, diagnose illness or poison, or read a creature\'s current health levels.' },
      { name: 'Heal Self',         req: 'Life 2', type: 'Coincidental', dice: 'Arete',         effect: 'Mend your own wounds. Each success heals one level of bashing or lethal damage (aggravated requires Life 3+).' },
      { name: 'Heal Others',       req: 'Life 3', type: 'Coincidental', dice: 'Arete',         effect: 'Extend healing to other living beings — same as Heal Self but requires physical contact with the target.' },
      { name: 'Body Crafting',     req: 'Life 4', type: 'Vulgar',       dice: 'Arete',         effect: 'Reshape a living body: alter appearance, grow natural weapons, enhance attributes, or alter physiology permanently.' },
      { name: 'Transform Life',    req: 'Life 4', type: 'Vulgar',       dice: 'Arete',         effect: 'Shift a living being into another animal form. More extreme transformations or unwilling targets require more successes.' },
      { name: 'Create Life',       req: 'Life 5', type: 'Vulgar',       dice: 'Arete',         effect: 'Spontaneously generate living organisms. Requires Prime 2 to create true life from inert matter.' },
    ],
  },
  {
    id: 'matter', sphere: 'Matter', color: SPHERE_COLORS.Matter,
    rotes: [
      { name: 'Analyze Matter',      req: 'Matter 1', type: 'Coincidental',                         dice: 'Arete', effect: 'Read composition, properties, and history of any inert material with a touch or careful examination.' },
      { name: 'Repair / Damage',     req: 'Matter 2', type: 'Coincidental',                         dice: 'Arete', effect: 'Mend broken objects or introduce structural flaws. Successes determine the extent of the repair or damage.' },
      { name: 'Shaping',             req: 'Matter 2', type: 'Coincidental',                         dice: 'Arete', effect: 'Sculpt or reshape solid matter like clay, maintaining composition while altering form freely.' },
      { name: 'Transmutation',       req: 'Matter 3', type: 'Coincidental (simple), Vulgar (complex)', dice: 'Arete', effect: 'Transform one material into another. Simple changes (iron → steel) coincidental; gold creation requires more successes.' },
      { name: 'Alter Weight',        req: 'Matter 3', type: 'Coincidental',                         dice: 'Arete', effect: 'Make objects lighter or heavier at will. Combined with Correspondence, allows walking on air.' },
      { name: 'Construct',           req: 'Matter 4', type: 'Vulgar',                               dice: 'Arete', effect: 'Assemble complex objects — working machinery, circuitry, weapons — without tools or raw material manipulation.' },
    ],
  },
  {
    id: 'mind', sphere: 'Mind', color: SPHERE_COLORS.Mind,
    rotes: [
      { name: 'Mental Wall',    req: 'Mind 1', type: 'Coincidental',    dice: 'Arete',              effect: 'Protect your mind from casual intrusion. Raises difficulty for others trying to read or influence your thoughts.' },
      { name: 'Mindspeak',      req: 'Mind 2', type: 'Coincidental',    dice: 'Arete',              effect: 'Send and receive surface thoughts. Line of sight or touch range; no language barrier between parties.' },
      { name: 'Read Thoughts',  req: 'Mind 2', type: 'Coincidental',    dice: 'Arete',              effect: 'Skim surface thoughts or press deeper for specific memories. Each additional success reaches deeper layers.' },
      { name: 'Illusion',       req: 'Mind 3', type: 'Coincidental',    dice: 'Arete',              effect: 'Project false sensory impressions into a target\'s mind. Affects only the target — no witnesses perceive it.' },
      { name: 'Deep Probe',     req: 'Mind 3', type: 'Coincidental',    dice: 'Arete vs. Willpower', effect: 'Excavate specific memories or access guarded information. Leaves a mental "fingerprint" the target may detect later.' },
      { name: 'Mind Control',   req: 'Mind 4', type: 'Vulgar',          dice: 'Arete vs. Willpower', effect: 'Override a target\'s will. Each success equals one significant command or an extended period of directed control.' },
      { name: 'Mass Illusion',  req: 'Mind 3', type: 'Vulgar',          dice: 'Arete',              effect: 'Project a shared illusion perceived by all in an area. More vivid and consensual than a single-target illusion.' },
    ],
  },
  {
    id: 'prime', sphere: 'Prime', color: SPHERE_COLORS.Prime,
    rotes: [
      { name: 'Sense Quintessence',  req: 'Prime 1',                 type: 'Coincidental', dice: 'Arete',            effect: 'Detect Quintessence, Nodes, Tass, and active magical effects. Essential for locating power sources.' },
      { name: 'Fuel Spells',         req: 'Prime 2',                 type: 'Coincidental', dice: 'Arete',            effect: 'Channel free Quintessence to reduce paradox risk or add extra dice to another sphere\'s effect roll.' },
      { name: 'Imbue Item',          req: 'Prime 2 + target sphere', type: 'Coincidental', dice: 'Arete',            effect: 'Store magical energy in an object, creating a Charm with limited uses. Successes determine potency.' },
      { name: 'Dispel Magic',        req: 'Prime 3 + opposing sphere', type: 'Coincidental', dice: 'Arete vs. caster Arete', effect: 'Unravel an existing magical effect. Must match or exceed the original spell\'s successes to cancel it.' },
      { name: 'Create Talisman',     req: 'Prime 4–5',               type: 'Ritual',       dice: 'Extended Arete',   effect: 'Permanently bind magical power into an object with multiple uses. Requires days of ritual and significant Quintessence.' },
    ],
  },
  {
    id: 'spirit', sphere: 'Spirit', color: SPHERE_COLORS.Spirit,
    rotes: [
      { name: 'Spirit Sight',     req: 'Spirit 1', type: 'Coincidental',                            dice: 'Arete',               effect: 'Perceive the Penumbra and spirit entities without crossing over. Sense resonance and Gauntlet strength.' },
      { name: 'Beckon Spirit',    req: 'Spirit 2', type: 'Coincidental',                            dice: 'Arete vs. Spirit Will', effect: 'Call a spirit to your location. Compels weak spirits; stronger ones may refuse or negotiate payment.' },
      { name: 'Step Sideways',    req: 'Spirit 2', type: 'Vulgar (witnessed), Coincidental (alone)', dice: 'Arete',               effect: 'Cross into the Penumbra or return from it. Requires a reflective surface or deep meditation.' },
      { name: 'Bind Spirit',      req: 'Spirit 3', type: 'Vulgar',                                  dice: 'Arete vs. Spirit Will', effect: 'Trap a spirit in a location, object, or service. Successes determine duration and binding strength.' },
      { name: 'Open Portal',      req: 'Spirit 3', type: 'Vulgar',                                  dice: 'Arete',               effect: 'Tear a Gauntlet passage that others can use. Remains open for one scene per success.' },
      { name: 'Empower Spirit',   req: 'Spirit 4', type: 'Vulgar',                                  dice: 'Arete',               effect: 'Grant a spirit additional Charms, Rage, or Gnosis. Creates powerful allies — and powerful debts.' },
    ],
  },
  {
    id: 'time', sphere: 'Time', color: SPHERE_COLORS.Time,
    rotes: [
      { name: 'Sense Time',        req: 'Time 1', type: 'Coincidental', dice: 'Arete',         effect: 'Perceive precise time, sense the remaining duration of enchantments, or detect temporal manipulation.' },
      { name: 'Past Sight',        req: 'Time 2', type: 'Coincidental', dice: 'Arete',         effect: 'Witness past events at your current location. Successes determine how clearly and how far back you can see.' },
      { name: 'Acceleration',      req: 'Time 3', type: 'Vulgar',       dice: 'Arete',         effect: 'Move at blinding speed. Gain extra actions each round equal to successes; split your dice pool among all actions.' },
      { name: 'Future Sight',      req: 'Time 4', type: 'Vulgar',       dice: 'Arete',         effect: 'Glimpse probable futures. Successes determine clarity and detail. The future shown is likely, never certain.' },
      { name: 'Temporal Stasis',   req: 'Time 4', type: 'Vulgar',       dice: 'Arete vs. target', effect: 'Freeze a target outside the flow of time. Perfect preservation; the target experiences no time passing.' },
      { name: 'Time Travel',       req: 'Time 5', type: 'Vulgar',       dice: 'Arete',         effect: 'Physically move through time. Paradox from temporal paradoxes is severe and often catastrophic.' },
    ],
  },
];

const COMBINED = [
  { name: 'Psychometry',        req: 'Mind 2 + Matter 1',                      type: 'Coincidental',          desc: 'Touch an object to read its emotional and event history. Each success reveals a clearer memory imprinted on the item.' },
  { name: 'Distant Strike',     req: 'Correspondence 2 + Forces 3',            type: 'Vulgar',                desc: 'Launch a magical attack at any location you can sense via Correspondence — range penalties do not apply.' },
  { name: 'Spirit Weapon',      req: 'Prime 2 + Forces 2',                     type: 'Coincidental',          desc: 'Sheath a weapon in Quintessence so it strikes spirits and supernatural beings, dealing aggravated damage.' },
  { name: 'Mindlink',           req: 'Mind 2 + Life 2',                        type: 'Coincidental',          desc: 'Share physical sensations and emotions between two willing subjects. Used for healing coordination or bonding.' },
  { name: 'Warding Circle',     req: 'Prime 2 + Spirit 1 + Correspondence 2',  type: 'Coincidental (ritual)', desc: 'Lay a perimeter that alerts to magical and spiritual intrusion, and blocks entry from unwelcome spirits.' },
  { name: 'Ghost-Touched',      req: 'Life 1 + Spirit 2',                      type: 'Vulgar',                desc: 'Shift a living being partially into the Penumbra — they interact with spirits but appear ghostly to the physical world.' },
  { name: 'Entropy Ward',       req: 'Prime 2 + Entropy 2',                    type: 'Coincidental',          desc: 'Protect an object or area from decay and bad luck. Preserves food, armour, and interpersonal bonds equally well.' },
  { name: 'Phantom Road',       req: 'Correspondence 3 + Matter 2',            type: 'Vulgar',                desc: 'Walk through solid matter by briefly shifting its spatial coordinates. Pass through walls, floors, or sealed containers.' },
  { name: 'Healing Sleep',      req: 'Life 3 + Mind 2',                        type: 'Coincidental',          desc: 'Induce a restorative trance in a target, accelerating healing while suppressing pain. Repairs one extra health level per scene.' },
  { name: 'Ectoplasmic Form',   req: 'Life 3 + Spirit 3',                      type: 'Vulgar',                desc: 'Transmute the body into semi-solid spirit matter. Partly immune to physical damage; can partially interact with the Penumbra.' },
];

// ── Ritual data ────────────────────────────────────────────────────────────
const RITUALS = [
  {
    name: 'How Rituals Work',
    isRule: true,
    content: [
      'A ritual is an extended magical working — the same sphere effects, performed slowly and deliberately to accumulate more successes than a single instantaneous roll allows.',
      'Each roll represents one time interval (set by the Storyteller or agreed in advance): typically 10 minutes, 1 hour, or one day, depending on scope.',
      'Successes accumulate across rolls. A botch subtracts that roll\'s successes from the running total. If total successes drop below zero, the ritual catastrophically fails.',
      'Rituals allow coincidental magic to achieve vulgar-level results without the full paradox cost, because the slow pace better fits the Consensus.',
      'Most rituals require unbroken concentration, specific materials (Tass, symbolic components), and an appropriate, undisturbed setting.',
    ],
  },
  {
    name: 'Required Successes Guide',
    isRule: true,
    content: [
      '3 successes — Minor: short-term ward, basic healing, simple divination.',
      '5 successes — Moderate: lasting protection, significant healing, clear past or near-future vision.',
      '7 successes — Significant: permanent low-level enchantment, major healing, broad transformation.',
      '10 successes — Major: powerful Talisman creation, resurrection-level healing, area-wide enchantment.',
      '15+ successes — Legendary: Node shaping, city-wide effects, altering fate on a grand scale.',
    ],
  },
  {
    name: 'Paradox in Rituals',
    isRule: true,
    content: [
      'Slow, ritual magic generates less paradox than instantaneous casting for the same effect.',
      'Coincidental rituals in a suitable setting (a sanctum, a Node) typically generate 0 Paradox.',
      'Vulgar rituals without witnesses accumulate Paradox at half the normal rate.',
      'Vulgar rituals with mundane witnesses accrue full Paradox — never perform blatantly supernatural rituals in public.',
      'Accumulated Paradox discharges as Backlash at Storyteller\'s discretion — usually at the worst possible moment.',
    ],
  },
  {
    name: 'Cleansing Ward',
    spheres: 'Prime 2 + Spirit 1',
    time: '10 minutes / roll',
    successes: '5',
    type: 'Coincidental',
    content: [
      'Purifies a location of hostile resonance and erects a barrier against spirit intrusion for one lunar month.',
      'Materials: An unbroken salt circle, incense matching the desired resonance (cedar for protection, frankincense for sanctity), and at least one point of Tass.',
      'Steps: Draw the circle without lifting the salt; consecrate each cardinal direction with incense; channel Quintessence through the Prime component while intoning the warding intent.',
      'Each roll covers one section of the ward. The final roll seals the boundary.',
      'Result: Spirits with Rage below the success total cannot enter. The location\'s resonance gradually shifts toward the intended quality.',
    ],
  },
  {
    name: 'Seeking Knowledge',
    spheres: 'Mind 3 + Time 2',
    time: '1 hour / roll',
    successes: '7',
    type: 'Coincidental',
    content: [
      'A meditative working to extract detailed information from the Akashic Record — the collective memory of all events.',
      'Materials: A focus object tied to the subject (a belonging, a written name, a photograph), and complete silence.',
      'Steps: Enter deep trance (Willpower roll, diff 6); project consciousness backward through Time while holding the focus; use Mind to interpret impressions received.',
      'Each success reveals one clear, verifiable fact about the subject\'s past. Failures produce confused or allegorical imagery.',
      'Interruptions reset the trance entirely. Three botches in a row indicates active spiritual interference or a warded mind.',
    ],
  },
  {
    name: 'Binding an Entity',
    spheres: 'Spirit 3 + Prime 2',
    time: '30 minutes / roll',
    successes: '10',
    type: 'Vulgar',
    content: [
      'Traps a spirit or supernatural being within a prepared vessel or location, placing it under the mage\'s command for a set period.',
      'Materials: A prepared vessel (iron box, mirror, or mandala), Tass equal to the spirit\'s Gnosis, and the entity\'s true name if known.',
      'Steps: Constrain the spirit physically within the ward circle; begin chanting to open a resonant channel; pour Quintessence into the binding structure; finalise the seal with the command clause.',
      'Contest: Accumulated successes vs. the spirit\'s Willpower + Gnosis. Tied successes produce an unstable binding that may shatter.',
      'Failure: The spirit breaks free with full knowledge of the mage\'s identity and intent — and will remember.',
    ],
  },
  {
    name: 'Consecration of a Talisman',
    spheres: 'Prime 4 + [target sphere] 3',
    time: '1 day / roll',
    successes: '12',
    type: 'Ritual',
    content: [
      'Permanently binds magical power into a physical object, creating a Talisman that any Awakened being can activate.',
      'Materials: A masterwork object (crafted by the mage or a trusted artisan); 5+ points of Tass; the object must resonate with the intended sphere.',
      'Steps: Purify the object (Prime 2 sub-ritual, 3 successes); inscribe the binding clauses; channel the sphere effect into the object over multiple sessions; seal with a sacrificed point of permanent Quintessence from the mage.',
      'Bonus: Each success beyond 12 adds one additional use to the Talisman.',
      'Botch during final sealing: The Talisman becomes a Paradox Focus — it inflicts backlash damage on the wielder each use.',
    ],
  },
  {
    name: 'Calling Down the Storm',
    spheres: 'Forces 4 + Prime 2 + Correspondence 2',
    time: '20 minutes / roll',
    successes: '8',
    type: 'Vulgar',
    content: [
      'Calls a supernatural storm into being and concentrates its destructive power on a target area up to one kilometre across.',
      'Materials: Open sky, a conducting focus (iron rod or copper bowl of water), and at least 3 points of Tass.',
      'Steps: Establish Correspondence awareness of the target area; Prime channels Quintessence to ignite Forces; each roll builds storm intensity.',
      'Bonus successes: Each beyond 8 extends duration by one hour or increases area by 200 metres.',
      'Note: Mundane witnesses will recognise this as supernatural. Paradox cost is 2 per success above 3.',
    ],
  },
  {
    name: 'Great Healing',
    spheres: 'Life 4 + Prime 2',
    time: '1 hour / roll',
    successes: '9',
    type: 'Coincidental',
    content: [
      'A thorough ritual healing that repairs aggravated wounds, neutralises toxins, and reverses ongoing supernatural afflictions.',
      'Materials: Tass in a form symbolising life (fresh water, living plants, blood willingly given), administered directly to the patient.',
      'Steps: Diagnose the full extent of injury with Life 1 sensing; begin Pattern repair from the deepest wounds outward; weave Quintessence through each damaged area with Prime.',
      'Each success heals one level of aggravated damage, neutralises one toxin, or reduces one supernatural affliction by one severity step.',
      'Cannot reverse death, but can stabilise a patient at Incapacitated so long as working begins within minutes of "death".',
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function SpellsRituals() {
  const [subTab,       setSubTab]       = useState('rotes');
  const [openSpheres,  setOpenSpheres]  = useState(new Set());
  const [openRotes,    setOpenRotes]    = useState(new Set());
  const [openRituals,  setOpenRituals]  = useState(new Set());
  const [openCombined, setOpenCombined] = useState(false);

  const toggleSphere = (id) => setOpenSpheres(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRote   = (k)  => setOpenRotes(p  => { const n = new Set(p); n.has(k)  ? n.delete(k)  : n.add(k);  return n; });
  const toggleRitual = (k)  => setOpenRituals(p => { const n = new Set(p); n.has(k)  ? n.delete(k)  : n.add(k);  return n; });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: G.bg, backgroundImage: 'radial-gradient(ellipse at 80% 10%,#1a0a18 0%,transparent 55%)' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${G.goldFaint}` }}>
        <div style={{ textAlign: 'center', padding: '16px 20px 0' }}>
          <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 20, color: G.gold, textShadow: `0 0 30px ${G.gold}44` }}>
            SPELLS & RITUALS
          </div>
          <div style={{ fontFamily: 'EB Garamond,serif', fontStyle: 'italic', fontSize: 12, color: G.muted, marginTop: 4 }}>
            Rotes, Combined Effects & Ritual Workings
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 12 }}>
          {['rotes', 'rituals'].map(t => (
            <button key={t} onClick={() => setSubTab(t)} style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: `2px solid ${subTab === t ? G.gold : 'transparent'}`,
              padding: '8px 4px', fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.2em',
              color: subTab === t ? G.gold : G.muted, cursor: 'pointer', textTransform: 'uppercase',
            }}>
              {t === 'rotes' ? 'Rotes' : 'Rituals'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 110px', minHeight: 0 }}>

        {subTab === 'rotes' ? (
          <>
            {/* Quick rules banner */}
            <div style={{ background: G.goldFaint, border: `1px solid ${G.border}`, borderRadius: 3, padding: '9px 12px', marginBottom: 12, fontSize: 12, color: G.textDim, lineHeight: 1.65 }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.gold, letterSpacing: '.12em' }}>CASTING  </span>
              Roll Arete. Coincidental: diff 5–6 · Vulgar (no witnesses): diff 7 · Vulgar (witnessed): diff 8–9.
              Extra successes extend duration or potency.
            </div>

            {/* Per-sphere sections */}
            {ROTES.map(({ id, sphere, color, rotes }) => (
              <div key={id} style={{ marginBottom: 8, border: `1px solid ${color}44`, borderRadius: 3, overflow: 'hidden' }}>
                <div onClick={() => toggleSphere(id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', cursor: 'pointer',
                  background: openSpheres.has(id) ? `${color}20` : `${color}0c`,
                }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color, letterSpacing: '.1em' }}>{sphere}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: `${color}88` }}>{rotes.length} rotes</span>
                    <span style={{ color: `${color}88`, fontSize: 13 }}>{openSpheres.has(id) ? '▲' : '▼'}</span>
                  </div>
                </div>
                {openSpheres.has(id) && rotes.map((rote, i) => {
                  const key = `${id}-${i}`;
                  const open = openRotes.has(key);
                  return (
                    <div key={i} style={{ borderTop: `1px solid ${color}22` }}>
                      <div onClick={() => toggleRote(key)} style={{
                        padding: '8px 14px', cursor: 'pointer',
                        background: open ? `${color}14` : 'transparent',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: G.text }}>{rote.name}</span>
                          <span style={{ color: G.muted, fontSize: 12, flexShrink: 0 }}>{open ? '−' : '+'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: `${color}bb`, letterSpacing: '.07em' }}>{rote.req}</span>
                          <TypePill type={rote.type} />
                        </div>
                      </div>
                      {open && (
                        <div style={{ padding: '2px 14px 10px' }}>
                          <div style={{ fontSize: 10, color: G.muted, marginBottom: 5, fontFamily: 'Cinzel,serif', letterSpacing: '.08em' }}>
                            DICE: {rote.dice}
                          </div>
                          <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.65 }}>{rote.effect}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Combined Effects */}
            <div style={{ marginBottom: 8, border: `1px solid ${G.gold}44`, borderRadius: 3, overflow: 'hidden' }}>
              <div onClick={() => setOpenCombined(v => !v)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', cursor: 'pointer',
                background: openCombined ? `${G.gold}20` : `${G.gold}0c`,
              }}>
                <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: G.gold, letterSpacing: '.1em' }}>Combined Effects</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim }}>{COMBINED.length} rotes</span>
                  <span style={{ color: G.goldDim, fontSize: 13 }}>{openCombined ? '▲' : '▼'}</span>
                </div>
              </div>
              {openCombined && COMBINED.map((rote, i) => {
                const key = `combined-${i}`;
                const open = openRotes.has(key);
                return (
                  <div key={i} style={{ borderTop: `1px solid ${G.gold}22` }}>
                    <div onClick={() => toggleRote(key)} style={{ padding: '8px 14px', cursor: 'pointer', background: open ? `${G.gold}14` : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: G.text }}>{rote.name}</span>
                        <span style={{ color: G.muted, fontSize: 12, flexShrink: 0 }}>{open ? '−' : '+'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim, letterSpacing: '.07em' }}>{rote.req}</span>
                        <TypePill type={rote.type} />
                      </div>
                    </div>
                    {open && (
                      <div style={{ padding: '2px 14px 10px', fontSize: 13, color: G.textDim, lineHeight: 1.65 }}>{rote.desc}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ── Rituals tab ── */
          RITUALS.map((ritual, i) => {
            const key = `ritual-${i}`;
            const open = ritual.isRule || openRituals.has(key);
            return (
              <div key={i} style={{ marginBottom: 8, border: `1px solid ${G.gold}${ritual.isRule ? '33' : '55'}`, borderRadius: 3, overflow: 'hidden' }}>
                <div
                  onClick={() => !ritual.isRule && toggleRitual(key)}
                  style={{
                    padding: '10px 14px',
                    background: ritual.isRule ? G.goldFaint : (open ? `${G.gold}18` : `${G.gold}0a`),
                    cursor: ritual.isRule ? 'default' : 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Cinzel,serif', fontSize: ritual.isRule ? 10 : 13, color: G.gold, letterSpacing: '.12em', marginBottom: ritual.spheres ? 5 : 0 }}>
                      {ritual.name}
                    </div>
                    {ritual.spheres && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim }}>{ritual.spheres}</span>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted }}>· {ritual.time}</span>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.muted }}>· {ritual.successes} succ.</span>
                        <TypePill type={ritual.type} />
                      </div>
                    )}
                  </div>
                  {!ritual.isRule && (
                    <span style={{ color: G.muted, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{open ? '−' : '+'}</span>
                  )}
                </div>
                {open && (
                  <div style={{ padding: '8px 14px 12px' }}>
                    {ritual.content.map((line, j) => (
                      <div key={j} style={{
                        fontSize: 13, color: G.textDim, lineHeight: 1.65, marginBottom: 6,
                        paddingLeft: ritual.isRule ? 0 : 8,
                        borderLeft: ritual.isRule ? 'none' : `2px solid ${G.gold}30`,
                      }}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
