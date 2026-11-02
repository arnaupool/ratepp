const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { deleteSpace, spaceCondition } = require('../access');

const router = express.Router();
router.use(requireAuth);

// Categories aren't a separate entity: they are the free text on each note,
// listed per space (?space=me|<groupId>|all, see access.js).
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const where = spaceCondition(String(req.query.space || 'all'), req.userId, params);
  const result = await pool.query(`SELECT DISTINCT unnest(categories) AS value FROM scores WHERE ${where}`, params);
  const categories = result.rows.map((r) => r.value).filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ categories });
}));

// Removes a category from every note of the space that has it — "delete
// globally" for fixing a typo or retiring a category.
router.delete('/:name', asyncHandler(async (req, res) => {
  const params = [req.params.name];
  const where = spaceCondition(await deleteSpace(req), req.userId, params);
  await pool.query(`UPDATE scores SET categories = array_remove(categories, $1) WHERE ${where} AND $1 = ANY(categories)`, params);
  res.status(204).end();
}));

module.exports = router;
