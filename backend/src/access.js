const { pool } = require('./db');

// Who can see a note (docs/grupos.md): its author while it is personal, or
// any member of the group it belongs to. Every route that reads or writes a
// note goes through these helpers.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** 'admin' | 'member' | null */
async function groupRole(groupId, userId, db = pool) {
  if (!isUuid(groupId)) return null;
  const r = await db.query('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  return r.rows[0]?.role ?? null;
}

/**
 * SQL condition selecting the notes of a "space" visible to userId:
 * 'me' (personal notes), a group id (that group's notes, if a member) or
 * 'all' (both). Pushes its parameters onto `params`.
 */
function spaceCondition(space, userId, params, alias = 'scores') {
  params.push(userId);
  const u = `$${params.length}`;
  const personal = `(${alias}.owner_id = ${u} AND ${alias}.group_id IS NULL)`;
  const myGroups = `(SELECT group_id FROM group_members WHERE user_id = ${u})`;
  if (!space || space === 'all') return `(${personal} OR ${alias}.group_id IN ${myGroups})`;
  if (space === 'me') return personal;
  if (!isUuid(space)) throw new HttpError(400, 'Espacio inválido');
  params.push(space);
  return `(${alias}.group_id = $${params.length} AND ${alias}.group_id IN ${myGroups})`;
}

/**
 * The note row if userId can access it, plus their role in its group
 * (null for a personal note).
 */
async function accessibleScore(scoreId, userId, db = pool) {
  if (!isUuid(scoreId)) throw new HttpError(400, 'Identificador inválido');
  const r = await db.query(
    `SELECT s.*, gm.role AS my_role
     FROM scores s
     LEFT JOIN group_members gm ON gm.group_id = s.group_id AND gm.user_id = $2
     WHERE s.id = $1 AND ((s.group_id IS NULL AND s.owner_id = $2) OR gm.user_id IS NOT NULL)`,
    [scoreId, userId]
  );
  return r.rows[0] || null;
}

/** Author of the note, or an admin of its group. */
function canManage(score, userId) {
  return score.owner_id === userId || score.my_role === 'admin';
}

/**
 * Space a global category/tag delete applies to (?space=): your personal
 * notes by default, or a whole group (its admins only).
 */
async function deleteSpace(req) {
  const space = String(req.query.space || 'me');
  if (space !== 'me' && (await groupRole(space, req.userId)) !== 'admin') {
    throw new HttpError(403, 'Solo un admin del grupo puede borrarla para todo el grupo');
  }
  return space;
}

module.exports = { isUuid, HttpError, groupRole, spaceCondition, accessibleScore, canManage, deleteSpace };
