import { jsPDF } from 'jspdf';

// ── HTML renderer (used for browser window.print path) ──────────────────────
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

  const freeRows = (arr) =>
    (arr || []).filter((r) => r.name).map((r) =>
      `<tr><td>${r.name}</td><td>${'●'.repeat(r.value) + '○'.repeat(5 - r.value)}</td></tr>`
    ).join('');

  const arete = (s.arete || []).filter(Boolean).length;
  const quint = (s.quint || []).filter(Boolean).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Mage Sheet — ${id.name || 'Character'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #1a1208; background: white; padding: 20px; }
  h1 { font-size: 22pt; text-align: center; border-bottom: 2px solid #8b6914; padding-bottom: 6px; margin-bottom: 12px; color: #5a3e00; }
  h2 { font-size: 13pt; color: #5a3e00; border-bottom: 1px solid #c9a84c; margin: 14px 0 6px; }
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
  @page { size: A4; margin: 14mm; }
  @media print { body { padding: 0; } }
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
  <div class="section"><h2>Physical</h2><table>${physRows}</table></div>
  <div class="section"><h2>Social</h2><table>${socRows}</table></div>
  <div class="section"><h2>Mental</h2><table>${mentRows}</table></div>
</div>
<div class="grid">
  <div class="section"><h2>Physical Skills</h2><table>${skills(s.physSkills)}</table></div>
  <div class="section"><h2>Social Skills</h2><table>${skills(s.socSkills)}</table></div>
  <div class="section"><h2>Mental Skills</h2><table>${skills(s.mentSkills)}</table></div>
</div>
<div class="section">
  <h2>Spheres</h2>
  <table><tbody>${sphereRows}</tbody></table>
</div>
<div class="grid2">
  <div class="section">
    <h2>Tracks</h2>
    <h3>Health</h3><p class="track">${damageTrack(s.health || [])}</p>
    <h3>Willpower</h3><p class="track">${damageTrack(s.willpower || [])}</p>
    <h3>Arete (${arete}/10)</h3><p class="track">${boolTrack(s.arete || [])}</p>
    <h3>Quintessence (${quint}/10)</h3><p class="track">${boolTrack(s.quint || [])}</p>
    <h3>Paradox</h3><p class="track">${damageTrack(s.paradox || [])}</p>
  </div>
  <div class="section">
    <h2>Advantages</h2>
    <h3>Backgrounds</h3><table>${freeRows(s.backgrounds)}</table>
    <h3 style="margin-top:8px">Merits</h3><table>${freeRows(s.merits)}</table>
    <h3 style="margin-top:8px">Flaws</h3><table>${freeRows(s.flaws)}</table>
  </div>
</div>
<div class="section">
  <h2>Biography</h2>
  ${s.appearance   ? `<h3>Appearance</h3><p class="note">${s.appearance}</p>` : ''}
  ${s.distFeatures ? `<h3>Distinguishing Features</h3><p class="note">${s.distFeatures}</p>` : ''}
  ${s.history      ? `<h3>History</h3><p class="note">${s.history}</p>` : ''}
  ${s.possessions  ? `<h3>Possessions</h3><p class="note">${s.possessions}</p>` : ''}
  ${s.notes        ? `<h3>Notes</h3><p class="note">${s.notes}</p>` : ''}
</div>
</body>
</html>`;
}

// ── jsPDF renderer (used on native Android) ─────────────────────────────────
const PAGE_W = 595, PAGE_H = 842, M = 36;

function chToBase64(ch) {
  const json  = JSON.stringify(ch);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function buildPDFDoc(ch) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const s = ch.sheet || {};
  const id = s.identity || {};

  // Embed character data so this PDF can be re-imported into the app.
  try {
    doc.setProperties({
      title:    `Mage: The Ascension — ${id.name || 'Character Sheet'}`,
      subject:  'Mage: The Ascension 2nd Edition Character Sheet',
      author:   'Mage Companion App',
      keywords: 'MAGE_DATA:' + chToBase64(ch),
      creator:  'Mage Companion',
    });
  } catch { /* non-critical */ }

  const colW = (PAGE_W - 2*M - 16) / 3;
  let y = M;

  const ensure = (need) => {
    if (y + need > PAGE_H - M) { doc.addPage(); y = M; }
  };

  const dots = (x, cy, max, value) => {
    const r = 2.2, gap = 5.4;
    for (let i = 0; i < max; i++) {
      const cx = x + i * gap;
      if (i < value) { doc.setFillColor(139, 105, 20); doc.circle(cx, cy, r, 'F'); }
      else           { doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.4); doc.circle(cx, cy, r, 'S'); }
    }
  };

  const title = (text) => {
    ensure(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(90, 62, 0);
    doc.text(text.toUpperCase(), M, y + 8);
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.5);
    doc.line(M, y + 11, PAGE_W - M, y + 11);
    y += 18;
  };

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(90, 62, 0);
  doc.text('MAGE: THE ASCENSION', PAGE_W/2, y + 14, { align: 'center' });
  y += 22;
  doc.setFontSize(13); doc.setTextColor(40, 32, 16);
  doc.text(id.name || 'Unnamed Mage', PAGE_W/2, y + 12, { align: 'center' });
  y += 18;
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.8);
  doc.line(M, y, PAGE_W - M, y);
  y += 10;

  // Identity meta (2 columns)
  doc.setFontSize(8.5);
  const meta = [
    ['Tradition', id.tradition], ['Concept', id.concept],
    ['Chronicle', id.chronicle], ['Avatar', id.avatar],
    ['Paradigm', id.paradigm],   ['Tutor', id.tutor],
    ['Ambition', id.ambition],   ['Desire', id.desire],
  ];
  const halfW = (PAGE_W - 2*M) / 2;
  for (let i = 0; i < meta.length; i += 2) {
    [meta[i], meta[i+1]].forEach((item, j) => {
      if (!item) return;
      const [l, v] = item;
      const x = M + j * halfW;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(90, 62, 0);
      doc.text(`${l}:`, x, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 32, 16);
      const labelW = doc.getTextWidth(`${l}:`) + 4;
      const txt = doc.splitTextToSize(String(v || '—'), halfW - labelW - 8)[0];
      doc.text(txt, x + labelW, y);
    });
    y += 11;
  }
  y += 4;

  // 3-column attribute / skill block helper
  const drawCol = (col, header, rows, valKey = 'value', labelKey = 'label') => {
    const x = M + col * (colW + 8);
    let cy = y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90, 62, 0);
    doc.text(header.toUpperCase(), x, cy + 8);
    cy += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 32, 16);
    rows.forEach((row) => {
      const label = typeof row === 'string' ? row : (row[labelKey] + (row.spec ? ` (${row.spec})` : ''));
      const value = typeof row === 'string' ? 0 : row[valKey];
      const truncated = doc.splitTextToSize(label, colW - 36)[0];
      doc.text(truncated, x, cy + 6);
      dots(x + colW - 32, cy + 4, 5, value);
      cy += 10;
    });
    return cy;
  };

  // Attributes
  title('Attributes');
  const attrEntries = (obj) => Object.entries(obj || {}).map(([k, v]) => ({ label: k, value: v }));
  const startY = y;
  const e1 = drawCol(0, 'Physical', attrEntries(s.physical));
  y = startY;
  const e2 = drawCol(1, 'Social',   attrEntries(s.social));
  y = startY;
  const e3 = drawCol(2, 'Mental',   attrEntries(s.mental));
  y = Math.max(e1, e2, e3) + 6;

  // Skills
  title('Skills');
  const sStartY = y;
  const sEnd1 = drawCol(0, 'Physical Skills', s.physSkills || []);
  y = sStartY;
  const sEnd2 = drawCol(1, 'Social Skills',   s.socSkills || []);
  y = sStartY;
  const sEnd3 = drawCol(2, 'Mental Skills',   s.mentSkills || []);
  y = Math.max(sEnd1, sEnd2, sEnd3) + 6;

  // Spheres
  const activeSpheres = (s.spheres || []).filter(sp => sp.name);
  if (activeSpheres.length > 0) {
    title('Spheres');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 32, 16);
    activeSpheres.forEach(sp => {
      ensure(11);
      doc.setFont('helvetica', 'bold');
      doc.text(sp.name, M, y + 6);
      dots(M + 90, y + 4, 5, sp.value);
      const note = (sp.descs || []).filter(Boolean).join('; ');
      if (note) {
        doc.setFont('helvetica', 'italic'); doc.setTextColor(100);
        const txt = doc.splitTextToSize(note, PAGE_W - 2*M - 130)[0];
        doc.text(txt, M + 130, y + 6);
        doc.setTextColor(40, 32, 16);
      }
      y += 11;
    });
    y += 4;
  }

  // Tracks
  title('Power & Vitality');
  const arete = (s.arete || []).filter(Boolean).length;
  const quint = (s.quint || []).filter(Boolean).length;
  const will  = (s.willpower || []).filter(v => v >= 1).length;
  const hurt  = (s.health || []).filter(v => v >= 1).length;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 32, 16);
  const trackRow = (label, cur, mx) => {
    ensure(11);
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.text(`${cur}/${mx}`, M + 100, y + 6);
    dots(M + 140, y + 4, mx, cur);
    y += 11;
  };
  trackRow('Arete',        arete, 10);
  trackRow('Quintessence', quint, 10);
  trackRow('Willpower',    will,  10);
  trackRow('Health Damage', hurt, 7);
  y += 4;

  // Free-form lists
  const freeList = (header, items) => {
    const list = (items || []).filter(r => r.name);
    if (!list.length) return;
    title(header);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 32, 16);
    list.forEach(r => {
      ensure(11);
      doc.text(r.name, M, y + 6);
      dots(M + 160, y + 4, 5, r.value);
      y += 11;
    });
    y += 4;
  };
  freeList('Backgrounds', s.backgrounds);
  freeList('Merits',      s.merits);
  freeList('Flaws',       s.flaws);

  // Bio
  const noteBlock = (header, text) => {
    if (!text) return;
    title(header);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 32, 16);
    const lines = doc.splitTextToSize(String(text), PAGE_W - 2*M);
    lines.forEach(line => { ensure(11); doc.text(line, M, y + 6); y += 11; });
    y += 4;
  };
  noteBlock('Appearance',              s.appearance);
  noteBlock('Distinguishing Features', s.distFeatures);
  noteBlock('History',                 s.history);
  noteBlock('Possessions',             s.possessions);
  noteBlock('Notes',                   s.notes);

  return doc;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function detectNative() {
  try {
    const mod = await import('@capacitor/core');
    return mod?.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

// Returns raw PDF bytes (Uint8Array) without any side effects.
export function buildPDFBytes(ch) {
  return buildPDFDoc(ch).output('uint8array');
}

// Download a single character as a PDF file in the browser.
export async function exportCharAsPDF(ch) {
  const safeName = (ch.sheet?.identity?.name || 'mage_character').replace(/[^a-z0-9_\- ]/gi, '_');
  const isNative = await detectNative();

  if (isNative) {
    // Reuse the existing native path
    return exportToPDF(ch);
  }

  const blob = new Blob([buildPDFDoc(ch).output('arraybuffer')], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${safeName}.pdf` });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { method: 'pdf-download' };
}

// ── Public entry point ─────────────────────────────────────────────────────
export async function exportToPDF(ch) {
  const safeName = (ch.sheet?.identity?.name || 'mage_character').replace(/[^a-z0-9_\- ]/gi, '_');
  const isNative = await detectNative();

  if (isNative) {
    // Native (Android): generate real PDF, save to Documents, share
    const doc = buildPDFDoc(ch);
    const base64 = arrayBufferToBase64(doc.output('arraybuffer'));
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const fileName = `${safeName}.pdf`;
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents,
    });
    const uri = writeResult?.uri
      || (await Filesystem.getUri({ path: fileName, directory: Directory.Documents })).uri;
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: `${ch.sheet?.identity?.name || 'Mage'} — Character Sheet`,
        url: uri,
        dialogTitle: 'Open or share PDF',
      });
    } catch {
      // User dismissed share dialog; file is already saved
    }
    return { method: 'native-pdf', uri };
  }

  // Web/PWA: render rich HTML in a hidden iframe and trigger print dialog
  // (every browser's print dialog includes "Save as PDF")
  const html = buildCharacterHTML(ch);
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

    let settled = false;
    const cleanup = () => { try { document.body.removeChild(iframe); } catch {} };
    const fail = (err) => { if (settled) return; settled = true; cleanup(); reject(err); };
    const succeed = () => { if (settled) return; settled = true; setTimeout(cleanup, 1500); resolve({ method: 'print-dialog' }); };

    iframe.onload = () => {
      try {
        const w = iframe.contentWindow;
        // Give the iframe a moment to apply styles before triggering print
        setTimeout(() => {
          try { w.focus(); w.print(); succeed(); }
          catch (e) { fail(e); }
        }, 80);
      } catch (e) { fail(e); }
    };
    iframe.onerror = (e) => fail(e);

    try {
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    } catch (e) {
      // Older browsers without srcdoc: fall back to document.write
      try {
        document.body.appendChild(iframe);
        const d = iframe.contentDocument;
        d.open(); d.write(html); d.close();
        setTimeout(() => {
          try { iframe.contentWindow.focus(); iframe.contentWindow.print(); succeed(); }
          catch (err) { fail(err); }
        }, 120);
      } catch (err) { fail(err); }
    }

    // Hard timeout safety net (in case onload never fires)
    setTimeout(() => {
      if (!settled) fail(new Error('Print dialog timed out'));
    }, 8000);
  });
}
