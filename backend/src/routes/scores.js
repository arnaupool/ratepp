const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

const FIELD_TYPES = ['text_long', 'number', 'date', 'location', 'photo', 'gallery', 'list', 'tag'];

function mapRating(r) {
  return { id: r.id, personName: r.person_name, isOwner: r.is_owner, value: r.value, sortOrder: r.sort_order };
}

function mapField(f) {
  return { id: f.id, type: f.type, label: f.label, value: f.value, sortOrder: f.sort_order };
}

async function loadScore(scoreId, userId, { withFields } = {}) {
  const scoreRes = await pool.query(
    'SELECT * FROM scores WHERE id = $1 AND owner_id = $2',
    [scoreId, userId]
  );
  const score = scoreRes.rows[0];
  if (!score) return null;

  const ratingsRes = await pool.query(
    'SELECT * FROM score_ratings WHERE score_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [scoreId]
  );

  const dto = {
    id: score.id,
    title: score.title,
    categories: score.categories || [],
    coverPhotoUrl: score.cover_photo_url,
    createdAt: score.created_at,
    updatedAt: score.updated_at,
    ratings: ratingsRes.rows.map(mapRating),
  };

  if (withFields) {
    const fieldsRes = await pool.query(
      'SELECT * FROM score_fields WHERE score_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [scoreId]
    );
    dto.fields = fieldsRes.rows.map(mapField);
  }

  return dto;
}

async function assertOwnedScore(scoreId, userId) {
  const res = await pool.query('SELECT id FROM scores WHERE id = $1 AND owner_id = $2', [scoreId, userId]);
  return res.rowCount > 0;
}

// ---------- scores ----------

router.get('/', asyncHandler(async (req, res) => {
  const { search = '', category = '' } = req.query;
  const params = [req.userId];
  let where = 'owner_id = $1';
  if (search) {
    params.push(`%${search}%`);
    where += ` AND title ILIKE $${params.length}`;
  }
  if (category && category !== 'Todas') {
    params.push(category);
    where += ` AND $${params.length} = ANY(categories)`;
  }
  const scoresRes = await pool.query(
    `SELECT * FROM scores WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  const ids = scoresRes.rows.map(s => s.id);
  let ratingsByScore = {};
  if (ids.length > 0) {
    const ratingsRes = await pool.query(
      'SELECT * FROM score_ratings WHERE score_id = ANY($1) ORDER BY sort_order ASC, created_at ASC',
      [ids]
    );
    for (const r of ratingsRes.rows) {
      (ratingsByScore[r.score_id] ||= []).push(mapRating(r));
    }
  }
  const items = scoresRes.rows.map(s => ({
    id: s.id,
    title: s.title,
    categories: s.categories || [],
    coverPhotoUrl: s.cover_photo_url,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    ratings: ratingsByScore[s.id] || [],
  }));
  res.json({ items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const score = await loadScore(req.params.id, req.userId, { withFields: true });
  if (!score) return res.status(404).json({ error: 'Puntuación no encontrada' });
  res.json({ score });
}));

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return [...new Set(categories.map((c) => String(c).trim()).filter(Boolean))];
}

router.post('/', asyncHandler(async (req, res) => {
  const { title, categories, coverPhotoUrl, ownerValue, ratings = [], fields = [] } = req.body || {};
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const scoreRes = await client.query(
      'INSERT INTO scores (owner_id, title, categories, cover_photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, String(title).trim(), normalizeCategories(categories), coverPhotoUrl || null]
    );
    const score = scoreRes.rows[0];

    await client.query(
      'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order) VALUES ($1, $2, true, $3, 0)',
      [score.id, 'Tú', ownerScore]
    );

    let sortOrder = 1;
    for (const p of ratings) {
      if (!p.personName || !Number.isInteger(p.value) || p.value < 1 || p.value > 10) continue;
      await client.query(
        'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order) VALUES ($1, $2, false, $3, $4)',
        [score.id, p.personName, p.value, sortOrder++]
      );
    }

    let fieldOrder = 0;
    for (const f of fields) {
      await client.query(
        'INSERT INTO score_fields (score_id, type, label, value, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [score.id, f.type, f.label || f.type, JSON.stringify(f.value ?? null), fieldOrder++]
      );
    }

    await client.query('COMMIT');
    const full = await loadScore(score.id, req.userId, { withFields: true });
    res.status(201).json({ score: full });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  const { title, categories, coverPhotoUrl } = req.body || {};
  const fieldsSet = [];
  const values = [];
  if (title !== undefined) { values.push(title); fieldsSet.push(`title = $${values.length}`); }
  if (categories !== undefined) { values.push(normalizeCategories(categories)); fieldsSet.push(`categories = $${values.length}`); }
  if (coverPhotoUrl !== undefined) { values.push(coverPhotoUrl); fieldsSet.push(`cover_photo_url = $${values.length}`); }
  if (fieldsSet.length === 0) {
    const score = await loadScore(req.params.id, req.userId, { withFields: true });
    return res.json({ score });
  }
  fieldsSet.push('updated_at = now()');
  values.push(req.params.id);
  await pool.query(`UPDATE scores SET ${fieldsSet.join(', ')} WHERE id = $${values.length}`, values);
  const score = await loadScore(req.params.id, req.userId, { withFields: true });
  res.json({ score });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  await pool.query('DELETE FROM scores WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- ratings (per-person scores) ----------

router.post('/:id/ratings', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  const { personName = 'Nuevo', value = 5 } = req.body || {};
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 10' });
  }
  const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM score_ratings WHERE score_id = $1', [req.params.id]);
  const rating = await pool.query(
    'INSERT INTO score_ratings (score_id, person_name, is_owner, value, sort_order) VALUES ($1, $2, false, $3, $4) RETURNING *',
    [req.params.id, personName, value, countRes.rows[0].c]
  );
  await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.status(201).json({ rating: mapRating(rating.rows[0]) });
}));

router.patch('/:id/ratings/:ratingId', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  const { personName, value } = req.body || {};
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 10)) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 10' });
  }
  const existing = await pool.query('SELECT * FROM score_ratings WHERE id = $1 AND score_id = $2', [req.params.ratingId, req.params.id]);
  if (existing.rowCount === 0) return res.status(404).json({ error: 'Puntuación de persona no encontrada' });
  if (existing.rows[0].is_owner && personName !== undefined) {
    return res.status(400).json({ error: 'No se puede renombrar tu propia puntuación' });
  }
  const sets = [];
  const values = [];
  if (personName !== undefined) { values.push(personName); sets.push(`person_name = $${values.length}`); }
  if (value !== undefined) { values.push(value); sets.push(`value = $${values.length}`); }
  if (sets.length > 0) {
    values.push(req.params.ratingId);
    await pool.query(`UPDATE score_ratings SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  }
  const updated = await pool.query('SELECT * FROM score_ratings WHERE id = $1', [req.params.ratingId]);
  res.json({ rating: mapRating(updated.rows[0]) });
}));

router.delete('/:id/ratings/:ratingId', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  const existing = await pool.query('SELECT * FROM score_ratings WHERE id = $1 AND score_id = $2', [req.params.ratingId, req.params.id]);
  if (existing.rowCount === 0) return res.status(404).json({ error: 'Puntuación de persona no encontrada' });
  if (existing.rows[0].is_owner) return res.status(400).json({ error: 'No se puede eliminar tu propia puntuación' });
  await pool.query('DELETE FROM score_ratings WHERE id = $1', [req.params.ratingId]);
  await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- dynamic fields ----------

router.post('/:id/fields', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  const { type, label, value } = req.body || {};
  if (!FIELD_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo de campo inválido' });
  const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM score_fields WHERE score_id = $1', [req.params.id]);
  const field = await pool.query(
    'INSERT INTO score_fields (score_id, type, label, value, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.params.id, type, label || type, JSON.stringify(value ?? null), countRes.rows[0].c]
  );
  await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.status(201).json({ field: mapField(field.rows[0]) });
}));

router.patch('/:id/fields/:fieldId', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
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
  await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.json({ field: mapField(result.rows[0]) });
}));

router.delete('/:id/fields/:fieldId', asyncHandler(async (req, res) => {
  const owned = await assertOwnedScore(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Puntuación no encontrada' });
  await pool.query('DELETE FROM score_fields WHERE id = $1 AND score_id = $2', [req.params.fieldId, req.params.id]);
  await pool.query('UPDATE scores SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
