const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { HttpError, groupRole, isUuid } = require('../access');
const { FIELD_TYPES } = require('../fieldTypes');

// Note templates (docs/plantillas.md): yours, plus those of the groups you
// are in. Any member can add one to a group; its creator or a group admin
// renames or deletes it.
const router = express.Router();
router.use(requireAuth);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_FIELDS = 40;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanList(raw, max, itemMax) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => str(v, itemMax)).filter(Boolean))].slice(0, max);
}

/**
 * The shape of a field, without what was filled in: criteria keep their
 * names and the price its currency and per-person/total; every other value is
 * left empty (the same empty values the app uses for a new field).
 */
function shapeOf(type, value) {
  switch (type) {
    case 'criteria': {
      const names = Array.isArray(value) ? value.map((c) => str(c?.name, 60)).filter(Boolean) : [];
      return (names.length ? names : ['']).map((name) => ({ name, value: null }));
    }
    case 'price':
      return {
        amount: '',
        currency: str(value?.currency, 8) || 'EUR',
        per: value?.per === 'total' ? 'total' : 'person',
        people: null,
      };
    case 'list':
    case 'steps':
      return [''];
    case 'link':
      return { url: '', title: '' };
    case 'ingredients':
      return { servings: null, items: [{ qty: '', unit: '', name: '' }] };
    case 'photo':
    case 'gallery':
    case 'tag':
      return [];
    case 'date':
    case 'location':
    case 'duration':
    case 'boolean':
    case 'difficulty':
      return null;
    default:
      return '';
  }
}

function cleanFields(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && FIELD_TYPES.includes(f.type))
    .slice(0, MAX_FIELDS)
    .map((f) => ({ type: f.type, label: str(f.label, 60) || f.type, value: shapeOf(f.type, f.value) }));
}

function cleanName(raw) {
  const name = str(raw, 60);
  if (!name) throw new HttpError(400, 'La plantilla necesita un nombre');
  return name;
}

function cleanEmoji(raw) {
  const emoji = str(raw, 16);
  if (!emoji || [...emoji].length > 8) throw new HttpError(400, 'Elige un emoticono');
  return emoji;
}

const VISIBLE_SQL = `
  SELECT t.*, g.name AS group_name, gm.role AS my_role
  FROM note_templates t
  LEFT JOIN groups g ON g.id = t.group_id
  LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.user_id = $1
  WHERE ((t.group_id IS NULL AND t.owner_id = $1) OR gm.user_id IS NOT NULL)`;

function mapTemplate(t, userId) {
  return {
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    groupId: t.group_id || null,
    groupName: t.group_name || null,
    categories: t.categories || [],
    cardColor: t.card_color || null,
    people: t.people || [],
    fields: t.fields || [],
    canManage: t.owner_id === userId || t.my_role === 'admin',
  };
}

async function loadTemplate(id, userId) {
  if (!isUuid(id)) throw new HttpError(404, 'Plantilla no encontrada');
  const r = await pool.query(`${VISIBLE_SQL} AND t.id = $2`, [userId, id]);
  if (r.rowCount === 0) throw new HttpError(404, 'Plantilla no encontrada');
  return r.rows[0];
}

router.get('/', asyncHandler(async (req, res) => {
  const r = await pool.query(`${VISIBLE_SQL} ORDER BY t.group_id IS NOT NULL, lower(g.name), lower(t.name)`, [req.userId]);
  res.json({ templates: r.rows.map((t) => mapTemplate(t, req.userId)) });
}));

// { name, emoji, groupId?, categories, cardColor, people, fields }: the
// fields may come straight from a note; only their shape is stored.
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = cleanName(b.name);
  const emoji = cleanEmoji(b.emoji);
  let groupId = null;
  if (b.groupId) {
    if (!(await groupRole(b.groupId, req.userId))) throw new HttpError(403, 'No eres miembro de ese grupo');
    groupId = b.groupId;
  }
  const cardColor = typeof b.cardColor === 'string' && HEX_COLOR.test(b.cardColor) ? b.cardColor : null;
  const r = await pool.query(
    `INSERT INTO note_templates (owner_id, group_id, name, emoji, categories, card_color, people, fields)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      req.userId,
      groupId,
      name,
      emoji,
      cleanList(b.categories, 20, 40),
      cardColor,
      cleanList(b.people, 20, 40),
      JSON.stringify(cleanFields(b.fields)),
    ]
  );
  res.status(201).json({ template: mapTemplate(await loadTemplate(r.rows[0].id, req.userId), req.userId) });
}));

async function managed(req) {
  const t = await loadTemplate(req.params.id, req.userId);
  if (!mapTemplate(t, req.userId).canManage) throw new HttpError(403, 'Solo quien la creó o un admin del grupo puede cambiarla');
  return t;
}

router.get('/:id', asyncHandler(async (req, res) => {
  res.json({ template: mapTemplate(await loadTemplate(req.params.id, req.userId), req.userId) });
}));

// Any of { name, emoji, categories, cardColor, people, fields }, cleaned like
// on creation.
router.patch('/:id', asyncHandler(async (req, res) => {
  const t = await managed(req);
  const b = req.body || {};
  const sets = [];
  const values = [];
  const set = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (b.name !== undefined) set('name', cleanName(b.name));
  if (b.emoji !== undefined) set('emoji', cleanEmoji(b.emoji));
  if (b.categories !== undefined) set('categories', cleanList(b.categories, 20, 40));
  if (b.cardColor !== undefined) set('card_color', typeof b.cardColor === 'string' && HEX_COLOR.test(b.cardColor) ? b.cardColor : null);
  if (b.people !== undefined) set('people', cleanList(b.people, 20, 40));
  if (b.fields !== undefined) set('fields', JSON.stringify(cleanFields(b.fields)));
  if (sets.length > 0) {
    values.push(t.id);
    await pool.query(`UPDATE note_templates SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values);
  }
  res.json({ template: mapTemplate(await loadTemplate(t.id, req.userId), req.userId) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const t = await managed(req);
  await pool.query('DELETE FROM note_templates WHERE id = $1', [t.id]);
  res.status(204).end();
}));

module.exports = router;
