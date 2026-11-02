const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');
const config = require('../config');
const { registration, isSiteAdmin } = require('../settings');

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

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name, isAdmin: isSiteAdmin(row) };
}

router.post('/register', rateLimitAuth, asyncHandler(async (req, res) => {
  const { email, password, name } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  // ADMIN_EMAIL can always sign up, so a closed registration can't lock the
  // owner out of a fresh install.
  if (!(await registration()).open && normalizedEmail !== config.adminEmail) {
    return res.status(403).json({ error: 'El registro está desactivado' });
  }
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password y name son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin, token_version',
    [normalizedEmail, passwordHash, name]
  );
  const user = result.rows[0];
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
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
  if (user.disabled_at) return res.status(403).json({ error: 'Esta cuenta está desactivada' });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, email, name, is_admin FROM users WHERE id = $1', [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: publicUser(user) });
}));

module.exports = router;
