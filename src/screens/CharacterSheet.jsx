import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Track, DamageTrack, Dots, Divider, Field, SkillRow, FreeRow, Lines, TArea, SphereBlock, Toast } from '../components/SharedUI.jsx';
import { loadAll, saveAll } from '../utils/storage.js';
import { mergeSheet } from '../data/defaultSheet.js';
import { exportToPDF } from '../utils/pdfExport.js';

export default function CharacterSheet({ charId, onBack }) {
  const G       = useTheme();
  const card    = { background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, padding: '12px 14px', marginBottom: 12, boxSizing: 'border-box', minWidth: 0, overflow: 'hidden' };
  const statLbl = { fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.22em', color: G.goldDim, display: 'block', marginBottom: 5 };
  const btnS    = (extra = {}) => ({ fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em', border: `1px solid ${G.gold}44`, borderRadius: 3, background: 'transparent', color: G.goldDim, padding: '6px 12px', cursor: 'pointer', ...extra });
  const [sheet,       setSheet]       = useState(null);
  const [tab,         setTab]         = useState(0);
  const [saveSt,      setSaveSt]      = useState('');
  const [toast,       setToast]       = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const charRef      = useRef(null);
  const saveTimer    = useRef(null);
  const isDirty      = useRef(false);
  const isFirstLoad  = useRef(true);

  useEffect(() => {
    const ch = loadAll()[charId] || null;
    charRef.current = ch;
    setSheet(mergeSheet(ch?.sheet ?? null));
  }, [charId]);

  useEffect(() => {
    if (!sheet || !charRef.current) return;
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    isDirty.current = true;
    setSaveSt('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const all     = loadAll();
      const updated = { ...charRef.current, sheet, updatedAt: Date.now() };
      all[charId]   = updated;
      charRef.current = updated;
      saveAll(all);
      setSaveSt('saved');
      setTimeout(() => setSaveSt(''), 1800);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [sheet]);

  const toast2 = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const flushToStorage = useCallback(() => {
    if (!sheet || !charRef.current) return;
    clearTimeout(saveTimer.current);
    const all     = loadAll();
    const updated = { ...charRef.current, sheet, updatedAt: Date.now() };
    all[charId]   = updated;
    charRef.current = updated;
    saveAll(all);
  }, [sheet, charId]);

  const handleBack = useCallback(() => {
    flushToStorage();
    onBack();
  }, [flushToStorage, onBack]);

  const handleExportPDF = useCallback(async () => {
    flushToStorage();
    const ch = loadAll()[charId];
    if (!ch) return;
    try {
      toast2('Generating PDF…');
      const res = await exportToPDF(ch);
      if (res?.method === 'native-pdf')        toast2('Saved to Documents ✓');
      else if (res?.method === 'print-dialog') toast2('Use “Save as PDF” in print dialog');
      else                                     toast2('PDF exported ✓');
    } catch (e) {
      console.error('PDF export failed:', e);
      toast2('PDF export failed: ' + (e?.message || 'unknown error'));
    }
  }, [charId, flushToStorage]);

  const upd      = useCallback((f, v)    => setSheet((p) => ({ ...p, [f]: v })), []);
  const updN     = useCallback((s, k, v) => setSheet((p) => ({ ...p, [s]: { ...p[s], [k]: v } })), []);
  const updSkill = useCallback((f, i, k, v) => setSheet((p) => ({ ...p, [f]: p[f].map((x, j) => j === i ? { ...x, [k]: v } : x) })), []);
  const updFree  = useCallback((f, i, k, v) => setSheet((p) => ({ ...p, [f]: p[f].map((x, j) => j === i ? { ...x, [k]: v } : x) })), []);
  const updSph   = useCallback((i, ns) => setSheet((p) => ({ ...p, spheres: p.spheres.map((s, j) => j === i ? ns : s) })), []);
  const updWep   = useCallback((i, k, v) => setSheet((p) => ({ ...p, weapons: p.weapons.map((w, j) => j === i ? { ...w, [k]: v } : w) })), []);

  if (!sheet) {
    return (
      <div style={{ minHeight: '100%', background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.goldDim, fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '.2em' }}>
        LOADING…
      </div>
    );
  }

  const { identity: id, physical: phys, social: soc, mental: ment } = sheet;

  const TopBar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: G.bg + 'ee', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${G.goldFaint}` }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, minHeight: 44 }}>
        <button onClick={handleBack} style={btnS({ borderColor: G.goldFaint, flexShrink: 0 })}>← Back</button>
        <div style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 13, color: G.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {id.name || 'New Character'}
        </div>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.1em', color: saveSt === 'saved' ? G.teal : G.goldDim, flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
          {saveSt === 'saving' ? 'SAVING…' : saveSt === 'saved' ? 'AUTO ✓' : ''}
        </span>
        <button onClick={handleExportPDF} style={btnS({ color: G.gold, borderColor: `${G.gold}66`, flexShrink: 0 })}>↓ PDF</button>
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${G.goldFaint}` }}>
        {['SHEET I', 'SHEET II', 'SHEET III'].map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.12em', border: 'none', borderBottom: tab === i ? `2px solid ${G.gold}` : '2px solid transparent', background: 'transparent', color: tab === i ? G.gold : G.goldDim, padding: '10px 16px', cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Sheet I ──
  const Page1 = (
    <>
      <div style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 28px' }}>
          {[['Name','name'],['Ambition','ambition'],['Paradigm','paradigm'],['Concept','concept'],['Desire','desire'],['Tradition','tradition'],['Chronicle','chronicle'],['Avatar','avatar'],['Tutor','tutor']].map(([lbl, k]) => (
            <Field key={k} label={lbl} value={id[k]} onChange={(v) => updN('identity', k, v)} flex="1 1 170px" />
          ))}
        </div>
      </div>

      <div style={card}>
        <Divider>Attributes</Divider>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', minWidth: 0 }}>
          {[['Physical','physical',phys],['Social','social',soc],['Mental','mental',ment]].map(([lbl, sec, st]) => (
            <div key={sec} style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.2em', color: G.gold, textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>{lbl}</div>
              {Object.entries(st).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: G.text }}>{k}</span>
                  <Dots max={5} value={v} onChange={(val) => updN(sec, k, val)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <Divider>Skills</Divider>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', minWidth: 0 }}>
          {[['physSkills', sheet.physSkills],['socSkills', sheet.socSkills],['mentSkills', sheet.mentSkills]].map(([field, skills]) => (
            <div key={field} style={{ flex: '1 1 200px', minWidth: 0 }}>
              {skills.map((s, i) => (
                <SkillRow key={s.label} label={s.label} spec={s.spec} value={s.value}
                  onSpec={(v) => updSkill(field, i, 'spec', v)}
                  onChange={(v) => updSkill(field, i, 'value', v)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, minWidth: 0 }}>
        {[['Chronicle Tenets','chronicleTenets'],['Touchstones & Convictions','touchstones'],['Tradition Tenets','tradTenets']].map(([title, field]) => (
          <div key={field} style={{ ...card, flex: '1 1 220px', marginBottom: 0, minWidth: 0 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.18em', color: G.gold, fontWeight: 700, marginBottom: 7 }}>{title.toUpperCase()}</div>
            <Lines values={sheet[field]} onChange={(v) => upd(field, v)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...card, flex: '2 1 400px' }}>
          <Divider>Spheres</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {sheet.spheres.map((s, i) => (
              <SphereBlock key={i} sphere={s} onUpdate={(ns) => updSph(i, ns)} />
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Health','health',G.gold,'square'],['Willpower','willpower',G.blue,'square']].map(([lbl, field, col, shape]) => (
            <div key={field} style={card}>
              <span style={statLbl}>{lbl}</span>
              <DamageTrack values={sheet[field]} onChange={(v) => upd(field, v)} shape={shape} color={col} />
            </div>
          ))}
          {[['Arete','arete',G.purple,'square'],['Quintessence','quint',G.teal,'square']].map(([lbl, field, col]) => (
            <div key={field} style={card}>
              <span style={statLbl}>{lbl}</span>
              <Track values={sheet[field]} onChange={(v) => upd(field, v)} color={col} />
            </div>
          ))}
          <div style={card}>
            <span style={statLbl}>Paradox</span>
            <DamageTrack values={sheet.paradox} onChange={(v) => upd('paradox', v)} shape="circle" color={G.red} />
          </div>
          <div style={card}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="Power Bonus"   value={sheet.powerBonus}  onChange={(v) => upd('powerBonus', v)}  flex="1 1 80px" fs={12} />
              <Field label="Arete Re-Roll" value={sheet.areteReroll} onChange={(v) => upd('areteReroll', v)} flex="1 1 80px" fs={12} />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Sheet II ──
  const xpRem = Math.max(0, Number(sheet.xpTotal || 0) - Number(sheet.xpSpent || 0));

  const Page2 = (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={card}>
          <Divider>Advantages</Divider>
          {[['BACKGROUNDS','backgrounds','Background…'],['MERITS','merits','Merit…'],['FLAWS','flaws','Flaw…']].map(([lbl, field, ph]) => (
            <div key={lbl}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.18em', color: G.goldDim, margin: '8px 0 6px' }}>{lbl}</div>
              {sheet[field].map((r, i) => (
                <FreeRow key={i} name={r.name} value={r.value} placeholder={ph}
                  onName={(v) => updFree(field, i, 'name', v)}
                  onChange={(v) => updFree(field, i, 'value', v)} />
              ))}
            </div>
          ))}
        </div>

        <div style={card}>
          <Divider>Haven</Divider>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: G.textDim }}>
              <input type="checkbox" checked={sheet.noHaven} onChange={(e) => upd('noHaven', e.target.checked)} style={{ accentColor: G.gold }} />
              No Haven?
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim }}>RATING</span>
              <Dots max={5} value={sheet.havenRating} onChange={(v) => upd('havenRating', v)} />
            </div>
          </div>
          {sheet.havenRows.map((h, i) => (
            <FreeRow key={i} name={h.name} value={h.value} placeholder="Haven trait…"
              onName={(v) => updFree('havenRows', i, 'name', v)}
              onChange={(v) => updFree('havenRows', i, 'value', v)} />
          ))}
        </div>

        <div style={card}>
          <Divider>Experience</Divider>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['Total','xpTotal'],['Spent','xpSpent']].map(([lbl, field]) => (
              <div key={field} style={{ flex: 1 }}>
                <span style={statLbl}>{lbl}</span>
                <input type="number" value={sheet[field]} min={0}
                  onChange={(e) => upd(field, e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.gold, fontFamily: 'Cinzel,serif', fontSize: 20, outline: 'none', textAlign: 'center', padding: '1px 0', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <span style={statLbl}>Remaining</span>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 20, color: G.teal, textAlign: 'center', borderBottom: `1px solid ${G.teal}44`, padding: '2px 0' }}>{xpRem}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <Divider>Weapons</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px', gap: '0 8px', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim, letterSpacing: '.15em' }}>WEAPON</span>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, color: G.goldDim }}>DMG</span>
          </div>
          {sheet.weapons.map((w, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px', gap: '0 8px', marginBottom: 4 }}>
              <input value={w.name} onChange={(e) => updWep(i, 'name', e.target.value)}
                style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: 13, outline: 'none', padding: '1px 2px' }} />
              <input value={w.dmg} onChange={(e) => updWep(i, 'dmg', e.target.value)}
                style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${G.goldFaint}`, color: G.text, fontSize: 13, outline: 'none', padding: '1px 2px', textAlign: 'center' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '1 1 400px' }}>
        <div style={card}>
          <Divider>Biography</Divider>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 20px', marginBottom: 10 }}>
            {[['True Age','trueAge','0 0 90px'],['Apparent Age','apparentAge','0 0 110px'],['Date of Birth','dob','0 0 130px'],['Date of Awakening','awakening','0 0 145px']].map(([lbl, f, flex]) => (
              <Field key={f} label={lbl} value={sheet[f]} onChange={(v) => upd(f, v)} flex={flex} fs={12} />
            ))}
          </div>
          <TArea label="Appearance"              value={sheet.appearance}   onChange={(v) => upd('appearance', v)}   rows={3} />
          <TArea label="Distinguishing Features" value={sheet.distFeatures} onChange={(v) => upd('distFeatures', v)} rows={3} />
          <TArea label="History"                 value={sheet.history}      onChange={(v) => upd('history', v)}      rows={9} />
        </div>
        <div style={card}><Divider>Possessions</Divider><TArea value={sheet.possessions} onChange={(v) => upd('possessions', v)} rows={6} /></div>
        <div style={card}><Divider>Notes</Divider><TArea value={sheet.notes} onChange={(v) => upd('notes', v)} rows={6} /></div>
      </div>
    </div>
  );

  // ── Sheet III ──
  const Page3 = (
    <>
      {/* ── Possessions ── */}
      <div style={card}>
        <Divider>Possessions</Divider>

        {/* Gear & Equipment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.18em', color: G.goldDim, marginBottom: 6 }}>GEAR (CARRIED)</div>
            <Lines values={sheet.gearCarried} onChange={(v) => upd('gearCarried', v)} />
          </div>
          <div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.18em', color: G.goldDim, marginBottom: 6 }}>EQUIPMENT (OWNED)</div>
            <Lines values={sheet.equipmentOwned} onChange={(v) => upd('equipmentOwned', v)} />
          </div>
        </div>

        {/* Vehicles */}
        <div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.18em', color: G.goldDim, marginBottom: 6 }}>VEHICLES</div>
          <Lines values={sheet.vehicles} onChange={(v) => upd('vehicles', v)} />
        </div>
      </div>

    </>
  );

  return (
    <div style={{ minHeight: '100%', background: G.bg, backgroundImage: 'radial-gradient(ellipse at 15% 10%,#1a1208 0%,transparent 55%)', overflowY: 'auto' }}>
      {TopBar}
      <div style={{ padding: '16px 16px 100px', maxWidth: 980, margin: '0 auto' }}>
        {tab === 0 ? Page1 : tab === 1 ? Page2 : Page3}
      </div>
      <Toast msg={toast} />
    </div>
  );
}
