const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

// Thumbnail cache (routes/thumbs.js), inside UPLOADS_DIR so it is backed up
// and moved with the photos.
const thumbsDir = path.join(config.uploadsDir, '.thumbs');

/**
 * The file behind a photo URL ("/uploads/<file>", relative or absolute), or
 * null when it isn't one of ours. Only files directly inside UPLOADS_DIR.
 */
function sourceFile(raw) {
  if (typeof raw !== 'string') return null;
  let u;
  try {
    u = new URL(raw, 'http://relative.invalid');
  } catch {
    return null;
  }
  const m = u.pathname.match(/^\/uploads\/([^/]+)$/);
  if (!m) return null;
  const name = decodeURIComponent(m[1]);
  if (name.startsWith('.')) return null;
  const filePath = path.resolve(config.uploadsDir, name);
  if (path.dirname(filePath) !== config.uploadsDir) return null; // path traversal guard
  return { name, filePath };
}

/** Deletes a photo and its cached thumbnails; missing files are fine. */
async function removePhoto(url) {
  const src = sourceFile(url);
  if (!src) return;
  await fs.rm(src.filePath, { force: true });
  const cached = await fs.readdir(thumbsDir).catch(() => []);
  await Promise.all(
    cached.filter((f) => f.startsWith(`${src.name}.w`)).map((f) => fs.rm(path.join(thumbsDir, f), { force: true }))
  );
}

/** { files, bytes } of the regular files directly inside dir. */
async function dirUsage(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  let files = 0;
  let bytes = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    const st = await fs.stat(path.join(dir, e.name)).catch(() => null);
    if (!st) continue;
    files += 1;
    bytes += st.size;
  }
  return { files, bytes };
}

module.exports = { thumbsDir, sourceFile, removePhoto, dirUsage };
