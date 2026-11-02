const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Public, like /uploads itself: an <img> can't send a Bearer token, and the
// originals are already reachable by their unguessable UUID names (see
// docs/webapp-rewrite/05-decisiones.md). Only files directly inside
// UPLOADS_DIR are ever read.
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 3000 }));

const WIDTHS = [200, 400, 800];
const thumbsDir = path.join(config.uploadsDir, '.thumbs');
// A few concurrent resizes at most: a grid of fresh uploads shouldn't pin
// every CPU core of a small home server.
let active = 0;
const queue = [];
function withSlot(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn().then(resolve, reject).finally(() => {
        active--;
        if (queue.length) queue.shift()();
      });
    };
    if (active < 2) run();
    else queue.push(run);
  });
}

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

// GET /api/thumb?path=/uploads/<file>&w=400 -> resized JPEG, cached on disk.
// Original files never change (random names, never overwritten), so the
// cached thumbnail never goes stale either.
router.get('/', async (req, res, next) => {
  const src = sourceFile(req.query.path);
  if (!src) return res.status(400).json({ error: 'Ruta de imagen inválida' });
  const requested = Number(req.query.w) || 400;
  const width = WIDTHS.find((w) => w >= requested) || WIDTHS[WIDTHS.length - 1];
  const cached = path.join(thumbsDir, `${src.name}.w${width}.jpg`);

  const send = (file) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('image/jpeg');
    res.sendFile(file, (err) => err && next(err));
  };

  try {
    await fs.access(cached);
    return send(cached);
  } catch {
    // not cached yet
  }

  try {
    await fs.access(src.filePath);
  } catch {
    return res.status(404).json({ error: 'No encontrado' });
  }

  try {
    await withSlot(async () => {
      await fs.mkdir(thumbsDir, { recursive: true });
      const tmp = `${cached}.${process.pid}.${Date.now()}.tmp`;
      await sharp(src.filePath, { failOn: 'none' })
        .rotate() // honor EXIF orientation from phone photos
        .resize({ width, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(tmp);
      await fs.rename(tmp, cached);
    });
    return send(cached);
  } catch {
    // Formats sharp can't decode here (e.g. HEIC): fall back to the original.
    return res.redirect(302, `/uploads/${encodeURIComponent(src.name)}`);
  }
});

module.exports = router;
