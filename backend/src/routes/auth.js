const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');
const config = require('../config');

const router = express.Router();

// Throttles brute-force/credential-stuffing attempts against login and
// registration. Limit is generous (won't affect normal use, including a few
// mistyped passwords) but caps automated guessing. Keyed per-IP, so it needs
// TRUST_PROXY behind a reverse proxy (see config.js).
const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax,
  message: 'Demasiados intentos, inténtalo de nuevo más tarde',
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name };
}

router.post('/register', rateLimitAuth, asyncHandler(async (req, res) => {
  if (!config.allowRegistration) {
    return res.status(403).json({ error: 'El registro está desactivado' });
  }
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password y name son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
    [normalizedEmail, passwordHash, name]
  );
  const user = result.rows[0];
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
}));

router.post('/login', rateLimitAuth, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: publicUser(user) });
}));

module.exports = router;
