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

router.post('/', requireAuth, uploadLimit, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'No se pudo subir el archivo' });
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo "photo"' });
    // Relative: the app and the photos share one origin, whatever host or
    // proxy it is reached through.
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
