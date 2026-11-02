const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const config = require('../config');
const { requireAuth, requireSiteAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { HttpError, isUuid } = require('../access');
const { registration, setSetting, isSiteAdmin, isProtected } = require('../settings');
const { thumbsDir, removePhoto, dirUsage } = require('../utils/uploadFiles');
const { ensureAdmin } = require('./groups');

// Site administration (docs/admin.md): figures about the install and the
// accounts on it. Only site admins; nobody can act on their own account or
// on the ADMIN_EMAIL one from here, so there is always an admin left.

const router = express.Router();
router.use(requireAuth, requireSiteAdmin);

const startedAt = new Date();

router.get('/stats', asyncHandler(async (req, res) => {
  const [counts, reg, photos, cache] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '30 days') AS new_users,
      (SELECT COUNT(*)::int FROM users WHERE last_seen_at > now() - interval '30 days') AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE disabled_at IS NOT NULL) AS disabled_users,
      (SELECT COUNT(*)::int FROM scores) AS notes,
      (SELECT COUNT(*)::int FROM scores WHERE group_id IS NOT NULL) AS group_notes,
      (SELECT COUNT(*)::int FROM groups) AS groups,
      (SELECT COALESCE(SUM(cardinality(photo_urls)), 0)::int FROM scores) AS photos,
      pg_database_size(current_database())::text AS db_bytes`),
    registration(),
    dirUsage(config.uploadsDir),
    dirUsage(thumbsDir),
  ]);
  const c = counts.rows[0];
  res.json({
    users: { total: c.users, new30d: c.new_users, active30d: c.active_users, disabled: c.disabled_users },
    content: { notes: c.notes, groupNotes: c.group_notes, groups: c.groups, photos: c.photos },
    storage: { photoFiles: photos.files, photoBytes: photos.bytes, thumbBytes: cache.bytes, dbBytes: Number(c.db_bytes) },
    system: {
      version: config.appVersion,
      startedAt: startedAt.toISOString(),
      nodeVersion: process.version,
      registrationOpen: reg.open,
      registrationOverridden: reg.overridden,
      registrationDefault: config.allowRegistration,
      publicUrl: config.publicUrl,
      adminEmail: config.adminEmail,
      tmdb: !!process.env.TMDB_API_KEY,
      rawg: !!process.env.RAWG_API_KEY,
    },
  });
}));

const USER_SQL = `
  SELECT u.id, u.email, u.name, u.created_at, u.last_seen_at, u.is_admin, u.disabled_at,
    (SELECT COUNT(*)::int FROM scores s WHERE s.owner_id = u.id) AS notes,
    (SELECT COUNT(*)::int FROM group_members gm WHERE gm.user_id = u.id) AS groups
  FROM users u`;

function mapUser(u, me) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.created_at,
    lastSeenAt: u.last_seen_at,
    isAdmin: isSiteAdmin(u),
    isProtected: isProtected(u),
    disabled: !!u.disabled_at,
    notes: u.notes,
    groups: u.groups,
    isMe: u.id === me,
  };
}

router.get('/users', asyncHandler(async (req, res) => {
  const r = await pool.query(`${USER_SQL} ORDER BY u.created_at ASC`);
  res.json({ users: r.rows.map((u) => mapUser(u, req.userId)) });
}));

/** The account another admin may act on, or an HttpError. */
async function targetUser(req) {
  if (!isUuid(req.params.id)) throw new HttpError(400, 'Identificador inválido');
  const r = await pool.query(`${USER_SQL} WHERE u.id = $1`, [req.params.id]);
  const u = r.rows[0];
  if (!u) throw new HttpError(404, 'Usuario no encontrado');
  if (u.id === req.userId) throw new HttpError(403, 'No puedes hacerlo con tu propia cuenta');
  if (isProtected(u)) throw new HttpError(403, 'Es la cuenta de ADMIN_EMAIL: no se puede cambiar desde el panel');
  return u;
}

async function reloadUser(id, me) {
  const r = await pool.query(`${USER_SQL} WHERE u.id = $1`, [id]);
  return mapUser(r.rows[0], me);
}

// { isAdmin?: boolean, disabled?: boolean }
router.patch('/users/:id', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  const { isAdmin, disabled } = req.body || {};
  if (isAdmin !== undefined && typeof isAdmin !== 'boolean') throw new HttpError(400, 'isAdmin debe ser true o false');
  if (disabled !== undefined && typeof disabled !== 'boolean') throw new HttpError(400, 'disabled debe ser true o false');
  if (isAdmin !== undefined) await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, u.id]);
  if (disabled !== undefined) {
    await pool.query('UPDATE users SET disabled_at = CASE WHEN $1 THEN COALESCE(disabled_at, now()) END WHERE id = $2', [
      disabled,
      u.id,
    ]);
  }
  res.json({ user: await reloadUser(u.id, req.userId) });
}));

// No email sending: the admin is shown a temporary password once and hands
// it over. Every session of the account is closed.
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function temporaryPassword() {
  let out = '';
  for (let i = 0; i < 12; i++) out += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`;
}

router.post('/users/:id/password', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  const password = temporaryPassword();
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [hash, u.id]);
  res.json({ password });
}));

router.post('/users/:id/logout', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [u.id]);
  res.status(204).end();
}));

// Their personal notes and photos go; their group notes and scores stay in
// the groups as a former member's, like when someone leaves a group.
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  const client = await pool.connect();
  let photoUrls = [];
  try {
    await client.query('BEGIN');
    // Leave every group first: a group left empty gives its notes back to
    // their authors, so this account's ones then go with the personal ones.
    const memberships = await client.query('DELETE FROM group_members WHERE user_id = $1 RETURNING group_id', [u.id]);
    for (const m of memberships.rows) await ensureAdmin(client, m.group_id);
    const personal = await client.query('DELETE FROM scores WHERE owner_id = $1 AND group_id IS NULL RETURNING photo_urls', [u.id]);
    photoUrls = personal.rows.flatMap((r) => r.photo_urls || []);
    await client.query(
      "UPDATE score_ratings SET former_user = true, person_name = COALESCE(NULLIF(person_name, ''), $2) WHERE user_id = $1",
      [u.id, u.name]
    );
    await client.query('DELETE FROM users WHERE id = $1', [u.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  // Files last, once the rows are gone, and only those no other note uses.
  for (const url of new Set(photoUrls)) {
    const still = await pool.query('SELECT 1 FROM scores WHERE $1 = ANY(photo_urls) LIMIT 1', [url]);
    if (still.rowCount === 0) await removePhoto(url).catch((err) => console.warn(`[admin] no se pudo borrar ${url}: ${err.message}`));
  }
  res.status(204).end();
}));

// { allowRegistration: boolean | null } — null goes back to ALLOW_REGISTRATION.
router.put('/settings', asyncHandler(async (req, res) => {
  const v = req.body?.allowRegistration;
  if (v !== null && typeof v !== 'boolean') throw new HttpError(400, 'allowRegistration debe ser true, false o null');
  await setSetting('allowRegistration', v);
  const reg = await registration();
  res.json({ registrationOpen: reg.open, registrationOverridden: reg.overridden });
}));

module.exports = router;
