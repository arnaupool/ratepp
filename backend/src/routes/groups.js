const crypto = require('crypto');
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');
const { HttpError, groupRole, isUuid } = require('../access');
const config = require('../config');

// Groups, their members and invitations (docs/grupos.md). Every member
// creates, edits and scores the group's notes; admins also invite, remove
// members, change roles, rename and delete the group.
const groups = express.Router();
const invites = express.Router();
groups.use(requireAuth);
invites.use(requireAuth);

const INVITE_DAYS = 7;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function cleanName(raw) {
  const name = String(raw ?? '').trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'El grupo necesita un nombre');
  return name;
}

async function requireRole(req, needed) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Grupo no encontrado');
  const role = await groupRole(req.params.id, req.userId);
  if (!role) throw new HttpError(404, 'Grupo no encontrado');
  if (needed === 'admin' && role !== 'admin') throw new HttpError(403, 'Solo un admin del grupo puede hacerlo');
  return role;
}

async function inTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// A group always keeps an admin: when the last one leaves or is demoted,
// the longest-standing member takes over. An empty group is deleted, its
// notes going back to their authors.
async function ensureAdmin(client, groupId) {
  const admins = await client.query("SELECT 1 FROM group_members WHERE group_id = $1 AND role = 'admin'", [groupId]);
  if (admins.rowCount > 0) return;
  const next = await client.query('SELECT user_id FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC LIMIT 1', [groupId]);
  if (next.rowCount > 0) {
    await client.query("UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2", [groupId, next.rows[0].user_id]);
  } else {
    await client.query('UPDATE scores SET group_id = NULL WHERE group_id = $1', [groupId]);
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
  }
}

groups.get('/', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT g.id, g.name, gm.role,
       (SELECT COUNT(*)::int FROM group_members m WHERE m.group_id = g.id) AS member_count
     FROM groups g JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     ORDER BY lower(g.name)`,
    [req.userId]
  );
  res.json({ groups: r.rows.map((g) => ({ id: g.id, name: g.name, role: g.role, memberCount: g.member_count })) });
}));

groups.post('/', asyncHandler(async (req, res) => {
  const name = cleanName(req.body?.name);
  const group = await inTransaction(async (client) => {
    const g = await client.query('INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name', [name, req.userId]);
    await client.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')", [g.rows[0].id, req.userId]);
    return g.rows[0];
  });
  res.status(201).json({ group: { ...group, role: 'admin', memberCount: 1 } });
}));

groups.get('/:id', asyncHandler(async (req, res) => {
  const role = await requireRole(req);
  const g = await pool.query('SELECT id, name FROM groups WHERE id = $1', [req.params.id]);
  const members = await pool.query(
    `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
     FROM group_members gm JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`,
    [req.params.id]
  );
  res.json({
    group: { ...g.rows[0], role },
    // Emails only for admins (they manage membership).
    members: members.rows.map((m) => ({
      userId: m.id,
      name: m.name,
      email: role === 'admin' ? m.email : undefined,
      role: m.role,
      isMe: m.id === req.userId,
    })),
  });
}));

groups.patch('/:id', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const name = cleanName(req.body?.name);
  await pool.query('UPDATE groups SET name = $1 WHERE id = $2', [name, req.params.id]);
  res.json({ group: { id: req.params.id, name } });
}));

// ?notas=devolver gives every note back to its author as personal;
// ?notas=borrar deletes them with the group.
groups.delete('/:id', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const mode = req.query.notas;
  if (mode !== 'devolver' && mode !== 'borrar') throw new HttpError(400, 'Indica qué hacer con las notas del grupo');
  await inTransaction(async (client) => {
    if (mode === 'borrar') await client.query('DELETE FROM scores WHERE group_id = $1', [req.params.id]);
    else await client.query('UPDATE scores SET group_id = NULL WHERE group_id = $1', [req.params.id]);
    await client.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
  });
  res.status(204).end();
}));

// Leaving keeps your notes in the group (and your scores, shown as a
// former member); you just lose access.
groups.post('/:id/leave', asyncHandler(async (req, res) => {
  await requireRole(req);
  await inTransaction(async (client) => {
    await client.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, req.userId]);
    await ensureAdmin(client, req.params.id);
  });
  res.status(204).end();
}));

groups.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  if (req.params.userId === req.userId) throw new HttpError(400, 'Para irte del grupo usa "Salir del grupo"');
  await inTransaction(async (client) => {
    const r = await client.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    if (r.rowCount === 0) throw new HttpError(404, 'Esa persona no está en el grupo');
    await ensureAdmin(client, req.params.id);
  });
  res.status(204).end();
}));

groups.patch('/:id/members/:userId', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const role = req.body?.role;
  if (role !== 'admin' && role !== 'member') throw new HttpError(400, 'Rol inválido');
  await inTransaction(async (client) => {
    const r = await client.query('UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3', [role, req.params.id, req.params.userId]);
    if (r.rowCount === 0) throw new HttpError(404, 'Esa persona no está en el grupo');
    await ensureAdmin(client, req.params.id);
  });
  res.status(204).end();
}));

// Adding someone who already has an account. The answer is the same
// whether or not the email exists, so it can't be used to probe accounts.
groups.post('/:id/members', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyBy: 'user' }), asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email) throw new HttpError(400, 'Indica un email');
  const u = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (u.rowCount > 0) {
    await pool.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
      [req.params.id, u.rows[0].id]
    );
  }
  res.json({ message: 'Si existe una cuenta con ese email, ya está en el grupo.' });
}));

// ---- invitation links ----

groups.get('/:id/invites', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const r = await pool.query(
    'SELECT id, expires_at, created_at FROM group_invites WHERE group_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json({ invites: r.rows.map((i) => ({ id: i.id, expiresAt: i.expires_at, createdAt: i.created_at })) });
}));

// The token is only shown once, here; the database keeps its hash.
groups.post('/:id/invites', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  const token = crypto.randomBytes(24).toString('base64url');
  const r = await pool.query(
    `INSERT INTO group_invites (group_id, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4)) RETURNING id, expires_at`,
    [req.params.id, hashToken(token), req.userId, INVITE_DAYS]
  );
  const path = `/unirse/${token}`;
  // Full link with the external address when PUBLIC_URL is set; otherwise
  // the app builds it from the address it was opened with.
  const url = config.publicUrl ? `${config.publicUrl}${path}` : null;
  res.status(201).json({ invite: { id: r.rows[0].id, token, path, url, expiresAt: r.rows[0].expires_at } });
}));

groups.delete('/:id/invites/:inviteId', asyncHandler(async (req, res) => {
  await requireRole(req, 'admin');
  if (!isUuid(req.params.inviteId)) throw new HttpError(404, 'Invitación no encontrada');
  await pool.query('UPDATE group_invites SET revoked_at = now() WHERE id = $1 AND group_id = $2', [req.params.inviteId, req.params.id]);
  res.status(204).end();
}));

async function findInvite(token) {
  const r = await pool.query(
    `SELECT i.group_id, g.name FROM group_invites i JOIN groups g ON g.id = i.group_id
     WHERE i.token_hash = $1 AND i.revoked_at IS NULL AND i.expires_at > now()`,
    [hashToken(String(token))]
  );
  if (r.rowCount === 0) throw new HttpError(404, 'La invitación no existe o ha caducado');
  return r.rows[0];
}

invites.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

invites.get('/:token', asyncHandler(async (req, res) => {
  const inv = await findInvite(req.params.token);
  const role = await groupRole(inv.group_id, req.userId);
  res.json({ group: { id: inv.group_id, name: inv.name }, alreadyMember: !!role });
}));

invites.post('/:token/accept', asyncHandler(async (req, res) => {
  const inv = await findInvite(req.params.token);
  await pool.query(
    "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
    [inv.group_id, req.userId]
  );
  res.json({ group: { id: inv.group_id, name: inv.name } });
}));

module.exports = { groups, invites };
