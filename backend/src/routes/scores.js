const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { HttpError, accessibleScore, canManage, groupRole, isUuid, spaceCondition } = require('../access');
const { FIELD_TYPES } = require('../fieldTypes');

const router = express.Router();
router.use(requireAuth);


const NOT_FOUND = 'Puntuación no encontrada';

// Ratings made with an account show that account's name; the free-named
// "Nota adicional" ones keep the typed name. formerMember: the rater has
// since left (or been removed from) the note's group.
const RATINGS_SQL = `
  SELECT sr.*, u.name AS user_name,
    (s.group_id IS NOT NULL AND ((sr.user_id IS NOT NULL AND gm.user_id IS NULL) OR sr.former_user)) AS former_member
  FROM score_ratings sr
  JOIN scores s ON s.id = sr.score_id
  LEFT JOIN users u ON u.id = sr.user_id
  LEFT JOIN group_members gm ON gm.group_id = s.group_id AND gm.user_id = sr.user_id`;

function mapRating(r, userId) {
  return {
    id: r.id,
    personName: r.user_id && r.user_name ? r.user_name : r.person_name,
    isOwner: r.is_owner,
    value: r.value,
    sortOrder: r.sort_order,
    userId: r.user_id || null,
    isMe: !!r.user_id && r.user_id === userId,
    formerMember: !!r.former_member,
  };
}

function mapField(f) {
  return { id: f.id, type: f.type, label: f.label, value: f.value, sortOrder: f.sort_order };
}

function mapScore(s, ratings, userId) {
  return {
    id: s.id,
    title: s.title,
    categories: s.categories || [],
    photoUrls: s.photo_urls || [],
    cardColor: s.card_color || null,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    groupId: s.group_id || null,
    groupName: s.group_name || null,
    authorId: s.owner_id,
    authorName: s.author_name || null,
    // Delete it, or move it to another space: its author or a group admin.
    canManage: s.owner_id === userId || s.my_role === 'admin',
    ratings,
  };
}

async function loadScore(scoreId, userId) {
  const access = await accessibleScore(scoreId, userId);
  if (!access) return null;
  const s = (
    await pool.query(
      `SELECT s.*, g.name AS group_name, u.name AS author_name, $2::text AS my_role
       FROM scores s LEFT JOIN groups g ON g.id = s.group_id LEFT JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [scoreId, access.my_role]
    )
  ).rows[0];
  const ratings = await pool.query(`${RATINGS_SQL} WHERE sr.score_id = $1 ORDER BY sr.sort_order ASC, sr.created_at ASC`, [scoreId]);
  const fields = await pool.query('SELECT * FROM score_fields WHERE score_id = $1 ORDER BY sort_order ASC, created_at ASC', [scoreId]);
  return {
    ...mapScore(s, ratings.rows.map((r) => mapRating(r, userId)), userId),
    fields: fields.rows.map(mapField),
  };
}

/** The note row if the user can access it; otherwise answers 404. */
async function requireScore(req, res) {
  const score = await accessibleScore(req.params.id, req.userId);
  if (!score) res.status(404).json({ error: NOT_FOUND });
  return score;
}

async function touch(scoreId, db = pool) {
  await db.query('UPDATE scores SET updated_at = now() WHERE id = $1', [scoreId]);
}

// ---------- scores ----------

router.get('/', asyncHandler(async (req, res) => {
  const { search = '', category = '', tag = '', dateFrom = '', dateTo = '', space = 'all' } = req.query;
  const params = [];
  let where = spaceCondition(String(space), req.userId, params);
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    // Matches title, any category, or any field's value (covers free text,
    // list items, tags, and dates — jsonb cast to text so the raw stored
    // representation is searched, e.g. "2026-06-14" or ["Croquetas"]).
    where += ` AND (
      title ILIKE $${idx}
      OR EXISTS (SELECT 1 FROM unnest(categories) c WHERE c ILIKE $${idx})
      OR EXISTS (SELECT 1 FROM score_fields sf WHERE sf.score_id = scores.id AND sf.value::text ILIKE $${idx})
    )`;
  }
  if (category && category !== 'Todas') {
    params.push(category);
    where += ` AND $${params.length} = ANY(categories)`;
  }
  if (tag) {
    // Exact-match filter driven by picking a tag from the list in use.
    params.push(tag);
    where += ` AND EXISTS (
      SELECT 1 FROM score_fields sf
      WHERE sf.score_id = scores.id AND sf.type = 'tag' AND sf.value ? $${params.length}::text
    )`;
  }
  if (dateFrom || dateTo) {
    // Date-type field values are stored as a jsonb string ("YYYY-MM-DD");
    // #>>'{}' extracts the raw text so it can be cast and range-compared.
    const conditions = [];
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`(sf.value#>>'{}')::date >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`(sf.value#>>'{}')::date <= $${params.length}::date`);
    }
    where += ` AND EXISTS (
      SELECT 1 FROM score_fields sf
      WHERE sf.score_id = scores.id AND sf.type = 'date' AND jsonb_typeof(sf.value) = 'string'
        AND ${conditions.join(' AND ')}
    )`;
  }
  params.push(req.userId);
  const me = `$${params.length}`;
  const scoresRes = await pool.query(
    `SELECT scores.*, g.name AS group_name, u.name AS author_name, gm.role AS my_role
     FROM scores
     LEFT JOIN groups g ON g.id = scores.group_id
     LEFT JOIN users u ON u.id = scores.owner_id
     LEFT JOIN group_members gm ON gm.group_id = scores.group_id AND gm.user_id = ${me}
     WHERE ${where}
     ORDER BY scores.created_at DESC`,
    params
  );
  const ids = scoresRes.rows.map((s) => s.id);
  const ratingsByScore = {};
  if (ids.length > 0) {
    const ratingsRes = await pool.query(`${RATINGS_SQL} WHERE sr.score_id = ANY($1) ORDER BY sr.sort_order ASC, sr.created_at ASC`, [ids]);
    for (const r of ratingsRes.rows) {
      (ratingsByScore[r.score_id] ||= []).push(mapRating(r, req.userId));
    }
  }
  res.json({ items: scoresRes.rows.map((s) => mapScore(s, ratingsByScore[s.id] || [], req.userId)) });
}));

// Flattened list of every location-type field value across the notes of a
// space, for the "map of all notes" screen — one row per location (a score
// can have more than one location field).
router.get('/locations', asyncHandler(async (req, res) => {
  const params = [];
  const where = spaceCondition(String(req.query.space || 'all'), req.userId, params, 's');
  const result = await pool.query(
    `SELECT
       s.id AS score_id,
       s.title,
       s.photo_urls[1] AS cover_url,
       sf.value,
       (SELECT AVG(sr.value) FROM score_ratings sr WHERE sr.score_id = s.id) AS avg_score
     FROM score_fields sf
     JOIN scores s ON s.id = sf.score_id
     WHERE ${where}
       AND sf.type = 'location'
       AND sf.value IS NOT NULL
       AND sf.value->>'lat' IS NOT NULL
       AND sf.value->>'lng' IS NOT NULL`,
    params
  );
  const locations = result.rows.map((r) => ({
    scoreId: r.score_id,
    title: r.title,
    coverUrl: r.cover_url || null,
    avgScore: r.avg_score != null ? Math.round(Number(r.avg_score) * 10) / 10 : null,
    label: r.value.label || null,
    lat: Number(r.value.lat),
    lng: Number(r.value.lng),
  }));
  res.json({ locations });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const score = await loadScore(req.params.id, req.userId);
  if (!score) return res.status(404).json({ error: NOT_FOUND });
  res.json({ score });
}));

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return [...new Set(categories.map((c) => String(c).trim()).filter(Boolean))];
}

function normalizePhotoUrls(photoUrls) {
  if (!Array.isArray(photoUrls)) return [];
  return photoUrls.map((u) => String(u).trim()).filter(Boolean);
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// null clears a custom color (falls back to the client's category tint);
// anything else must be a plain #rrggbb hex string.
function normalizeCardColor(cardColor) {
  if (cardColor === null) return null;
  if (typeof cardColor === 'string' && HEX_COLOR.test(cardColor)) return cardColor;
  return undefined; // signals "invalid, ignore" to the caller
}

// A target space for a note: null (personal) or a group the user belongs to.
async function targetGroup(groupId, userId) {
  if (groupId === undefined || groupId === null || groupId === '') return null;
  if (!isUuid(groupId) || !(await groupRole(groupId, userId))) {
    throw new HttpError(403, 'No perteneces a ese grupo');
  }
  return groupId;
}

router.post('/', asyncHandler(async (req, res) => {
  const { title, categories, photoUrls, cardColor, ownerValue, ratings = [], fields = [], groupId } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const ownerScore = Number.isInteger(ownerValue) ? ownerValue : null;
  if (!ownerScore || ownerScore < 1 || ownerScore > 10) {
    return res.status(400).json({ error: 'La puntuación (1-10) es obligatoria' });
  }
  for (const f of fields) {
    if (!FIELD_TYPES.includes(f.type)) {
      return res.status(400).json({ error: `Tipo de campo inválido: ${f.type}` });
    }
  }
  const color = cardColor === undefined ? null : normalizeCardColor(cardColor);
  if (color === undefined) return res.status(400).json({ error: 'Color de card inválido' });
  const group = await targetGroup(groupId, req.userId);

  const client = await pool.connect();
  let scoreId;
  try {
    await client.query('BEGIN');
    const scoreRes = await client.query(
      'INSERT INTO scores (owner_id, title, categories, photo_urls, card_color, group_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.userId, String(title).trim(), normalizeCategories(categories), normalizePhotoUrls(photoUrls), color, group]
    );
    scoreId = scoreRes.rows[0].id;

    await client.query(
      "INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order, user_id) VALUES ($1, 'Tú', true, $2, 0, $3)",
      [scoreId, ownerScore, req.userId]
    );

    let sortOrder = 1;
    for (const p of ratings) {
      if (!p.personName || !Number.isInteger(p.value) || p.value < 1 || p.value > 10) continue;
      await client.query(
        'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order) VALUES ($1, $2, false, $3, $4)',
        [scoreId, p.personName, p.value, sortOrder++]
      );
    }

    let fieldOrder = 0;
    for (const f of fields) {
      await client.query(
        'INSERT INTO score_fields (score_id, type, label, value, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [scoreId, f.type, f.label || f.type, JSON.stringify(f.value ?? null), fieldOrder++]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ score: await loadScore(scoreId, req.userId) });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const current = await requireScore(req, res);
  if (!current) return;
  const { title, categories, photoUrls, cardColor, groupId } = req.body || {};
  const fieldsSet = [];
  const values = [];
  if (title !== undefined) { values.push(title); fieldsSet.push(`title = $${values.length}`); }
  if (categories !== undefined) { values.push(normalizeCategories(categories)); fieldsSet.push(`categories = $${values.length}`); }
  if (photoUrls !== undefined) { values.push(normalizePhotoUrls(photoUrls)); fieldsSet.push(`photo_urls = $${values.length}`); }
  if (cardColor !== undefined) {
    const color = normalizeCardColor(cardColor);
    if (color === undefined) return res.status(400).json({ error: 'Color de card inválido' });
    values.push(color);
    fieldsSet.push(`card_color = $${values.length}`);
  }
  if (groupId !== undefined) {
    // Moving between spaces: its author or a group admin. Taken out of a
    // group, a note goes back to its author as personal.
    const target = await targetGroup(groupId, req.userId);
    if (target !== (current.group_id || null)) {
      if (!canManage(current, req.userId)) {
        return res.status(403).json({ error: 'Solo su autor o un admin del grupo puede moverla' });
      }
      values.push(target);
      fieldsSet.push(`group_id = $${values.length}`);
      // A note whose author's account was deleted can't go back to them:
      // the group admin taking it out of the group keeps it.
      if (target === null && !current.owner_id) {
        values.push(req.userId);
        fieldsSet.push(`owner_id = $${values.length}`);
      }
    }
  }
  if (fieldsSet.length > 0) {
    fieldsSet.push('updated_at = now()');
    values.push(req.params.id);
    await pool.query(`UPDATE scores SET ${fieldsSet.join(', ')} WHERE id = $${values.length}`, values);
  }
  const score = await loadScore(req.params.id, req.userId);
  // An admin who moved someone else's note out of the group loses access.
  if (!score) return res.status(204).end();
  res.json({ score });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const current = await requireScore(req, res);
  if (!current) return;
  if (!canManage(current, req.userId)) {
    return res.status(403).json({ error: 'Solo su autor o un admin del grupo puede eliminarla' });
  }
  await pool.query('DELETE FROM scores WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- ratings (per-person scores) ----------

async function loadRating(scoreId, ratingId, userId) {
  const r = await pool.query(`${RATINGS_SQL} WHERE sr.id = $1 AND sr.score_id = $2`, [ratingId, scoreId]);
  return r.rows[0] ? { row: r.rows[0], dto: mapRating(r.rows[0], userId) } : null;
}

// A free-named "Nota adicional" for someone without an account.
router.post('/:id/ratings', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { personName = 'Nuevo', value = 5 } = req.body || {};
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 10' });
  }
  const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM score_ratings WHERE score_id = $1', [req.params.id]);
  const rating = await pool.query(
    'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order) VALUES ($1, $2, false, $3, $4) RETURNING id',
    [req.params.id, personName, value, countRes.rows[0].c]
  );
  await touch(req.params.id);
  res.status(201).json({ rating: (await loadRating(req.params.id, rating.rows[0].id, req.userId)).dto });
}));

// The caller's own score on a note (created if missing): how members of a
// group score each other's notes with their own account.
router.put('/:id/ratings/me', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { value } = req.body || {};
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 10' });
  }
  const existing = await pool.query('SELECT id FROM score_ratings WHERE score_id = $1 AND user_id = $2', [req.params.id, req.userId]);
  let ratingId = existing.rows[0]?.id;
  if (ratingId) {
    await pool.query('UPDATE score_ratings SET value = $1 WHERE id = $2', [value, ratingId]);
  } else {
    const me = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM score_ratings WHERE score_id = $1', [req.params.id]);
    const inserted = await pool.query(
      'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order, user_id) VALUES ($1, $2, false, $3, $4, $5) RETURNING id',
      [req.params.id, me.rows[0]?.name || 'Miembro', value, countRes.rows[0].c, req.userId]
    );
    ratingId = inserted.rows[0].id;
  }
  await touch(req.params.id);
  res.json({ rating: (await loadRating(req.params.id, ratingId, req.userId)).dto });
}));

router.patch('/:id/ratings/:ratingId', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { personName, value } = req.body || {};
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 10)) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 10' });
  }
  const found = await loadRating(req.params.id, req.params.ratingId, req.userId);
  if (!found) return res.status(404).json({ error: 'Puntuación de persona no encontrada' });
  const { row } = found;
  if (row.is_owner && personName !== undefined) {
    return res.status(400).json({ error: 'No se puede renombrar tu propia puntuación' });
  }
  if (row.user_id && row.user_id !== req.userId) {
    return res.status(403).json({ error: 'Solo esa persona puede cambiar su puntuación' });
  }
  if (row.user_id && personName !== undefined) {
    return res.status(400).json({ error: 'El nombre viene de su cuenta' });
  }
  const sets = [];
  const values = [];
  if (personName !== undefined) { values.push(personName); sets.push(`person_name = $${values.length}`); }
  if (value !== undefined) { values.push(value); sets.push(`value = $${values.length}`); }
  if (sets.length > 0) {
    values.push(req.params.ratingId);
    await pool.query(`UPDATE score_ratings SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    await touch(req.params.id);
  }
  res.json({ rating: (await loadRating(req.params.id, req.params.ratingId, req.userId)).dto });
}));

router.delete('/:id/ratings/:ratingId', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const found = await loadRating(req.params.id, req.params.ratingId, req.userId);
  if (!found) return res.status(404).json({ error: 'Puntuación de persona no encontrada' });
  const { row } = found;
  if (row.is_owner) return res.status(400).json({ error: 'No se puede eliminar tu propia puntuación' });
  if (row.user_id && row.user_id !== req.userId) {
    return res.status(403).json({ error: 'Solo esa persona puede quitar su puntuación' });
  }
  await pool.query('DELETE FROM score_ratings WHERE id = $1', [req.params.ratingId]);
  await touch(req.params.id);
  res.status(204).end();
}));

// ---------- dynamic fields ----------

router.post('/:id/fields', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { type, label, value } = req.body || {};
  if (!FIELD_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo de campo inválido' });
  const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM score_fields WHERE score_id = $1', [req.params.id]);
  const field = await pool.query(
    'INSERT INTO score_fields (score_id, type, label, value, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.params.id, type, label || type, JSON.stringify(value ?? null), countRes.rows[0].c]
  );
  await touch(req.params.id);
  res.status(201).json({ field: mapField(field.rows[0]) });
}));

router.patch('/:id/fields/:fieldId', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { label, value } = req.body || {};
  const sets = [];
  const values = [];
  if (label !== undefined) { values.push(label); sets.push(`label = $${values.length}`); }
  if (value !== undefined) { values.push(JSON.stringify(value)); sets.push(`value = $${values.length}`); }
  if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
  values.push(req.params.fieldId, req.params.id);
  const result = await pool.query(
    `UPDATE score_fields SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND score_id = $${values.length} RETURNING *`,
    values
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Campo no encontrado' });
  await touch(req.params.id);
  res.json({ field: mapField(result.rows[0]) });
}));

router.delete('/:id/fields/:fieldId', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  await pool.query('DELETE FROM score_fields WHERE id = $1 AND score_id = $2', [req.params.fieldId, req.params.id]);
  await touch(req.params.id);
  res.status(204).end();
}));

router.post('/:id/fields/reorder', asyncHandler(async (req, res) => {
  if (!(await requireScore(req, res))) return;
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'Falta el orden de campos' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query(
        'UPDATE score_fields SET sort_order = $1 WHERE id = $2 AND score_id = $3',
        [i, order[i], req.params.id]
      );
    }
    await touch(req.params.id, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const fieldsRes = await pool.query(
    'SELECT * FROM score_fields WHERE score_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [req.params.id]
  );
  res.json({ fields: fieldsRes.rows.map(mapField) });
}));

module.exports = router;
