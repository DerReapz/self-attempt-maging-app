import { zip } from 'fflate';
import { buildPDFBytes } from './pdfExport.js';

function safeName(ch) {
  return (ch.sheet?.identity?.name || 'mage_character').replace(/[^a-z0-9_\- ]/gi, '_');
}

// Builds a ZIP containing one PDF per character and triggers a browser download.
export async function exportAllAsPDFZip(chars) {
  const entries = Object.values(chars);
  if (!entries.length) throw new Error('No characters to export.');

  // Build PDF bytes for every character (synchronous, jsPDF)
  const files = {};
  const usedNames = {};
  for (const ch of entries) {
    const base = safeName(ch);
    const count = usedNames[base] = (usedNames[base] || 0) + 1;
    const key   = count > 1 ? `${base}_${count}.pdf` : `${base}.pdf`;
    files[key]  = buildPDFBytes(ch);
  }

  // Compress into a ZIP (async via fflate callback → Promise)
  const zipBytes = await new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url  = URL.createObjectURL(blob);
  const ts   = new Date().toISOString().slice(0, 10);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `mage_backup_${ts}.zip`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
