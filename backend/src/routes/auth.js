const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');
const config = require('../config');
const { registration, isSiteAdmin, isProtected } = require('../settings');
const { deleteAccount } = require('../accounts');
const { HttpError } = require('../access');

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
  return { id: row.id, email: row.email, name: row.name, isAdmin: isSiteAdmin(row), isProtected: isProtected(row) };
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

// Your own account, from Ajustes (docs/cuenta.md). Wrong passwords answer
// 403, not 401: the app signs out on any 401.

async function me(req) {
  const r = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
  return r.rows[0];
}

async function checkPassword(user, password) {
  if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(403, 'La contraseña no es correcta');
  }
}

function cleanUserName(raw) {
  const name = String(raw ?? '').trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'El nombre no puede estar vacío');
  return name;
}

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const name = cleanUserName(req.body?.name);
  const r = await pool.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, is_admin', [name, req.userId]);
  res.json({ user: publicUser(r.rows[0]) });
}));

// Closes every other session: the new token keeps this one open.
router.put('/me/password', requireAuth, rateLimitAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = await me(req);
  await checkPassword(user, currentPassword);
  if (typeof newPassword !== 'string' || newPassword.length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
  const hash = await bcrypt.hash(newPassword, 10);
  const r = await pool.query(
    'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *',
    [hash, user.id]
  );
  res.json({ token: signToken(r.rows[0]) });
}));

router.put('/me/email', requireAuth, rateLimitAuth, asyncHandler(async (req, res) => {
  const user = await me(req);
  if (isProtected(user)) throw new HttpError(403, 'Es la cuenta de ADMIN_EMAIL: su email se cambia en el servidor');
  await checkPassword(user, req.body?.password);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new HttpError(400, 'Escribe un email válido');
  if (email !== user.email) {
    const taken = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (taken.rowCount > 0) throw new HttpError(409, 'Ya existe una cuenta con ese email');
  }
  const r = await pool.query('UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, name, is_admin', [email, user.id]);
  res.json({ user: publicUser(r.rows[0]) });
}));

router.post('/me/logout-others', requireAuth, asyncHandler(async (req, res) => {
  const r = await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING *', [req.userId]);
  res.json({ token: signToken(r.rows[0]) });
}));

router.delete('/me', requireAuth, rateLimitAuth, asyncHandler(async (req, res) => {
  const user = await me(req);
  if (isProtected(user)) throw new HttpError(403, 'Es la cuenta de ADMIN_EMAIL: no se puede borrar desde Ajustes');
  await checkPassword(user, req.body?.password);
  await deleteAccount(user);
  res.status(204).end();
}));

module.exports = router;
