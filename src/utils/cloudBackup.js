// ── Provider definitions ───────────────────────────────────────────────────

export const CLOUD_PROVIDERS = [
  {
    id:        'gdrive',
    label:     'Google Drive',
    authType:  'token',
    tokenHint: 'OAuth access token',
    tokenHelp: 'Get one at developers.google.com/oauthplayground — select "Drive API v3 · drive.file", authorise, exchange, copy access_token. Note: expires in 1 h.',
  },
  {
    id:        'dropbox',
    label:     'Dropbox',
    authType:  'token',
    tokenHint: 'Access token',
    tokenHelp: 'At dropbox.com/developers/apps create an app → Permissions → files.content.write → Settings → Generate access token (no expiry for personal apps).',
  },
  {
    id:        'onedrive',
    label:     'OneDrive',
    authType:  'token',
    tokenHint: 'Bearer token',
    tokenHelp: 'Sign in at developer.microsoft.com/graph/graph-explorer, then copy the access token from the Request headers panel. Note: expires in 1 h.',
  },
  {
    id:        'mega',
    label:     'MEGA',
    authType:  'webdav',
    urlHint:   'http://127.0.0.1:4443',
    urlHelp:   'Enable WebDAV in MEGAsync desktop app (Preferences → Advanced → Enable WebDAV server). Leave username/password blank unless you set them.',
  },
  {
    id:        'webdav',
    label:     'Custom WebDAV',
    authType:  'webdav',
    urlHint:   'https://nas.example.com/webdav',
    urlHelp:   'Any WebDAV server: Synology NAS (enable Web Station + WebDAV), Nextcloud, ownCloud, etc.',
  },
];

// ── Upload implementations ─────────────────────────────────────────────────

async function uploadDropbox(bytes, filename, token) {
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization':    `Bearer ${token}`,
      'Dropbox-API-Arg':  JSON.stringify({ path: `/MageBackups/${filename}`, mode: 'overwrite', autorename: false }),
      'Content-Type':     'application/octet-stream',
    },
    body: bytes,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status);
    throw new Error(`Dropbox ${res.status}: ${msg}`);
  }
}

async function uploadOneDrive(bytes, filename, token) {
  // PUT directly creates or replaces the file (works for files < 4 MB)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/MageBackups/${encodeURIComponent(filename)}:/content`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status);
    throw new Error(`OneDrive ${res.status}: ${msg}`);
  }
}

async function uploadGoogleDrive(bytes, filename, token) {
  const auth = { 'Authorization': `Bearer ${token}` };

  // Ensure MageBackups folder exists
  let folderId = 'root';
  try {
    const sr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'MageBackups'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id)`,
      { headers: auth }
    );
    const sd = await sr.json();
    if (sd.files?.[0]?.id) {
      folderId = sd.files[0].id;
    } else {
      const cr = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'MageBackups', mimeType: 'application/vnd.google-apps.folder' }),
      });
      const cd = await cr.json();
      if (cd.id) folderId = cd.id;
    }
  } catch { /* use root if folder ops fail */ }

  // Search for existing file with this name in the folder
  const qr = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D'${encodeURIComponent(filename)}'+and+'${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
    { headers: auth }
  );
  const qd = await qr.json();
  const existingId = qd.files?.[0]?.id;

  if (existingId) {
    // Update existing file content
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/zip' },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Google Drive ${res.status}`);
  } else {
    // Create new file via multipart upload
    const boundary = 'mage_gdrive_bound';
    const meta     = JSON.stringify({ name: filename, parents: [folderId] });
    const enc      = new TextEncoder();
    const head     = enc.encode(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`);
    const tail     = enc.encode(`\r\n--${boundary}--`);
    const body     = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength);
    body.set(head, 0); body.set(bytes, head.byteLength); body.set(tail, head.byteLength + bytes.byteLength);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Google Drive ${res.status}`);
  }
}

async function uploadWebDAV(bytes, filename, { url, username, password }) {
  const base    = url.replace(/\/$/, '');
  const authHdr = username ? { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) } : {};

  // Attempt to create the MageBackups sub-directory (silently ignore errors)
  try {
    await fetch(`${base}/MageBackups/`, { method: 'MKCOL', headers: authHdr });
  } catch { /* directory may already exist */ }

  const res = await fetch(`${base}/MageBackups/${filename}`, {
    method:  'PUT',
    headers: { ...authHdr, 'Content-Type': 'application/zip' },
    body:    bytes,
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV ${res.status}: ${res.statusText}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function uploadToCloud(provider, config, bytes, filename) {
  switch (provider) {
    case 'gdrive':   return uploadGoogleDrive(bytes, filename, config.token);
    case 'dropbox':  return uploadDropbox(bytes, filename, config.token);
    case 'onedrive': return uploadOneDrive(bytes, filename, config.token);
    case 'mega':
    case 'webdav':   return uploadWebDAV(bytes, filename, { url: config.url, username: config.username, password: config.password });
    default: throw new Error('Unknown cloud provider: ' + provider);
  }
}
