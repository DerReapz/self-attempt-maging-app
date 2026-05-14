const SPHERE_LABELS = ['●','●●','●●●','●●●●','●●●●●'];

function boolTrack(arr) {
  return arr.map((v) => (v ? '●' : '○')).join(' ');
}

function damageTrack(arr) {
  return arr.map((v) => (v === 2 ? '✕' : v === 1 ? '/' : v === -1 ? '▪' : '○')).join(' ');
}

function buildCharacterHTML(ch) {
  const s = ch.sheet || {};
  const id = s.identity || {};
  const phys = s.physical || {};
  const soc = s.social || {};
  const ment = s.mental || {};

  const dotRow = (label, val) =>
    `<tr><td>${label}</td><td>${'●'.repeat(val) + '○'.repeat(Math.max(0, 5 - val))}</td></tr>`;

  const physRows = Object.entries(phys).map(([k, v]) => dotRow(k, v)).join('');
  const socRows  = Object.entries(soc).map(([k, v]) => dotRow(k, v)).join('');
  const mentRows = Object.entries(ment).map(([k, v]) => dotRow(k, v)).join('');

  const skills = (arr) =>
    (arr || []).map((sk) =>
      `<tr><td>${sk.label}${sk.spec ? ` <em>(${sk.spec})</em>` : ''}</td><td>${'●'.repeat(sk.value) + '○'.repeat(5 - sk.value)}</td></tr>`
    ).join('');

  const sphereRows = (s.spheres || [])
    .filter((sp) => sp.name)
    .map((sp) =>
      `<tr><td><strong>${sp.name}</strong></td><td>${'●'.repeat(sp.value) + '○'.repeat(5 - sp.value)}</td><td>${sp.descs.filter(Boolean).join('; ')}</td></tr>`
    ).join('');

  const freeRows = (arr, label) =>
    (arr || []).filter((r) => r.name).map((r) =>
      `<tr><td>${r.name}</td><td>${'●'.repeat(r.value) + '○'.repeat(5 - r.value)}</td></tr>`
    ).join('');

  const arete   = (s.arete   || []).filter(Boolean).length;
  const quint   = (s.quint   || []).filter(Boolean).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Mage Sheet — ${id.name || 'Character'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #1a1208; background: white; }
  h1 { font-family: serif; font-size: 22pt; text-align: center; border-bottom: 2px solid #8b6914; padding-bottom: 6px; margin-bottom: 12px; color: #5a3e00; }
  h2 { font-family: serif; font-size: 13pt; color: #5a3e00; border-bottom: 1px solid #c9a84c; margin: 14px 0 6px; }
  h3 { font-size: 11pt; color: #7a5010; margin: 8px 0 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-bottom: 10px; font-size: 10pt; }
  .meta-row span { min-width: 160px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  td { padding: 2px 4px; }
  td:last-child { text-align: right; font-family: monospace; letter-spacing: 2px; white-space: nowrap; }
  .section { margin-bottom: 14px; }
  .track { font-family: monospace; font-size: 10pt; letter-spacing: 3px; }
  .note { font-style: italic; color: #666; font-size: 9.5pt; margin-top: 4px; white-space: pre-wrap; }
  @media print {
    body { font-size: 10pt; }
    h1 { font-size: 18pt; }
  }
</style>
</head>
<body>
<h1>Mage: The Ascension — Character Sheet</h1>

<div class="meta-row">
  <span><strong>Name:</strong> ${id.name || '—'}</span>
  <span><strong>Concept:</strong> ${id.concept || '—'}</span>
  <span><strong>Chronicle:</strong> ${id.chronicle || '—'}</span>
  <span><strong>Tradition:</strong> ${id.tradition || '—'}</span>
  <span><strong>Avatar:</strong> ${id.avatar || '—'}</span>
  <span><strong>Tutor:</strong> ${id.tutor || '—'}</span>
  <span><strong>Ambition:</strong> ${id.ambition || '—'}</span>
  <span><strong>Desire:</strong> ${id.desire || '—'}</span>
  <span><strong>Paradigm:</strong> ${id.paradigm || '—'}</span>
</div>

<div class="grid">
  <div class="section">
    <h2>Physical</h2>
    <table>${physRows}</table>
  </div>
  <div class="section">
    <h2>Social</h2>
    <table>${socRows}</table>
  </div>
  <div class="section">
    <h2>Mental</h2>
    <table>${mentRows}</table>
  </div>
</div>

<div class="grid">
  <div class="section">
    <h2>Physical Skills</h2>
    <table>${skills(s.physSkills)}</table>
  </div>
  <div class="section">
    <h2>Social Skills</h2>
    <table>${skills(s.socSkills)}</table>
  </div>
  <div class="section">
    <h2>Mental Skills</h2>
    <table>${skills(s.mentSkills)}</table>
  </div>
</div>

<div class="section">
  <h2>Spheres</h2>
  <table>
    <thead><tr><th style="text-align:left">Sphere</th><th style="text-align:right">Rating</th><th style="text-align:left;padding-left:8px">Notes</th></tr></thead>
    <tbody>${sphereRows}</tbody>
  </table>
</div>

<div class="grid2">
  <div class="section">
    <h2>Tracks</h2>
    <h3>Health</h3>
    <p class="track">${damageTrack(s.health || [])}</p>
    <h3>Willpower</h3>
    <p class="track">${damageTrack(s.willpower || [])}</p>
    <h3>Arete (${arete}/10)</h3>
    <p class="track">${boolTrack(s.arete || [])}</p>
    <h3>Quintessence (${quint}/10)</h3>
    <p class="track">${boolTrack(s.quint || [])}</p>
    <h3>Paradox</h3>
    <p class="track">${damageTrack(s.paradox || [])}</p>
    ${s.powerBonus   ? `<p style="margin-top:6px;font-size:10pt"><strong>Power Bonus:</strong> ${s.powerBonus}</p>` : ''}
    ${s.areteReroll  ? `<p style="font-size:10pt"><strong>Arete Re-Roll:</strong> ${s.areteReroll}</p>` : ''}
  </div>
  <div class="section">
    <h2>Advantages</h2>
    <h3>Backgrounds</h3>
    <table>${freeRows(s.backgrounds)}</table>
    <h3 style="margin-top:8px">Merits</h3>
    <table>${freeRows(s.merits)}</table>
    <h3 style="margin-top:8px">Flaws</h3>
    <table>${freeRows(s.flaws)}</table>
    <h3 style="margin-top:8px">Experience</h3>
    <p style="font-size:10pt">Total: ${s.xpTotal || 0} &nbsp; Spent: ${s.xpSpent || 0} &nbsp; Remaining: ${Math.max(0, Number(s.xpTotal || 0) - Number(s.xpSpent || 0))}</p>
  </div>
</div>

${(s.weapons || []).some((w) => w.name) ? `
<div class="section">
  <h2>Weapons</h2>
  <table>
    <thead><tr><th style="text-align:left">Weapon</th><th style="text-align:right">Damage</th></tr></thead>
    <tbody>${(s.weapons || []).filter((w) => w.name).map((w) => `<tr><td>${w.name}</td><td>${w.dmg}</td></tr>`).join('')}</tbody>
  </table>
</div>` : ''}

<div class="section">
  <h2>Biography</h2>
  <div class="meta-row">
    ${s.trueAge     ? `<span><strong>True Age:</strong> ${s.trueAge}</span>` : ''}
    ${s.apparentAge ? `<span><strong>Apparent Age:</strong> ${s.apparentAge}</span>` : ''}
    ${s.dob         ? `<span><strong>Date of Birth:</strong> ${s.dob}</span>` : ''}
    ${s.awakening   ? `<span><strong>Awakening:</strong> ${s.awakening}</span>` : ''}
  </div>
  ${s.appearance   ? `<h3>Appearance</h3><p class="note">${s.appearance}</p>` : ''}
  ${s.distFeatures ? `<h3>Distinguishing Features</h3><p class="note">${s.distFeatures}</p>` : ''}
  ${s.history      ? `<h3>History</h3><p class="note">${s.history}</p>` : ''}
  ${s.possessions  ? `<h3>Possessions</h3><p class="note">${s.possessions}</p>` : ''}
  ${s.notes        ? `<h3>Notes</h3><p class="note">${s.notes}</p>` : ''}
</div>

</body>
</html>`;
}

export async function exportToPDF(ch) {
  const html = buildCharacterHTML(ch);
  const name = (ch.sheet?.identity?.name || 'mage_character').replace(/[^a-z0-9_\- ]/gi, '_');

  // Try Capacitor Filesystem → share the HTML file (Android can open & print to PDF)
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const fileName = `${name}.html`;
    await Filesystem.writeFile({
      path: fileName,
      data: html,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({
      title: `${ch.sheet?.identity?.name || 'Mage'} — Character Sheet`,
      text: 'Mage: The Ascension character sheet',
      url: uri,
      dialogTitle: 'Share or print character sheet',
    });
    return;
  } catch {
    // Fall through to browser download
  }

  // Fallback: browser blob download (HTML — user opens and prints to PDF)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${name}.html`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
