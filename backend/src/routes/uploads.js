const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
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

router.post('/', requireAuth, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'No se pudo subir el archivo' });
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo "photo"' });
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
  });
});

module.exports = router;
