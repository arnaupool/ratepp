const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Extension comes from the validated mimetype, never from the client's
// filename — otherwise a "photo.exe" with an image/* mimetype would be
// stored and served with that extension.
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};
const ALLOWED_MIME = new Set(Object.keys(EXT_BY_MIME));

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype] || '.jpg'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('Tipo de archivo no soportado'));
    cb(null, true);
  },
});

// Generous per-user cap on disk writes; normal use never gets near it.
const uploadLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 300, keyBy: 'user' });

// And on bytes: with registration open, a fresh account mustn't be able to
// fill the disk. Kept in memory (a restart resets it), like rateLimit.
const DAILY_BYTES = 1024 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const usage = new Map();

function usedToday(userId) {
  const u = usage.get(userId);
  if (!u || Date.now() - u.since > DAY_MS) return 0;
  return u.bytes;
}

function addUsage(userId, bytes) {
  const u = usage.get(userId);
  if (!u || Date.now() - u.since > DAY_MS) usage.set(userId, { since: Date.now(), bytes });
  else u.bytes += bytes;
}

// The mimetype is whatever the client claims; the file's first bytes say
// what it really is. Anything that isn't one of these images is refused.
function sniffImage(head) {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return '.jpg';
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (head.length >= 12 && head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') return '.webp';
  // HEIC/HEIF: an ISO box "ftyp" with an HEIF brand.
  if (head.length >= 12 && head.toString('latin1', 4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(head.toString('latin1', 8, 12))) {
    return '.heic';
  }
  return null;
}

async function readHead(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const { buffer, bytesRead } = await fh.read(Buffer.alloc(16), 0, 16, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

router.post('/', requireAuth, uploadLimit, (req, res) => {
  if (usedToday(req.userId) >= DAILY_BYTES) {
    return res.status(429).json({ error: 'Has llegado al límite de fotos de hoy' });
  }
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'No se pudo subir el archivo' });
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo "photo"' });
    const file = req.file.path;
    try {
      const ext = sniffImage(await readHead(file));
      if (!ext) {
        await fs.promises.rm(file, { force: true });
        return res.status(400).json({ error: 'El archivo no es una imagen' });
      }
      addUsage(req.userId, req.file.size);
      // Named after what it really is, whatever the client said.
      let name = req.file.filename;
      if (path.extname(name) !== ext) {
        name = `${path.basename(name, path.extname(name))}${ext}`;
        await fs.promises.rename(file, path.join(uploadsDir, name));
      }
      // Relative: the app and the photos share one origin, whatever host or
      // proxy it is reached through.
      res.status(201).json({ url: `/uploads/${name}` });
    } catch {
      await fs.promises.rm(file, { force: true });
      res.status(500).json({ error: 'No se pudo subir el archivo' });
    }
  });
});

module.exports = router;
