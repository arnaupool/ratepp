const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT unnest(categories) AS value FROM scores WHERE owner_id = $1`,
    [req.userId]
  );
  const categories = result.rows.map((r) => r.value).filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ categories });
}));

// Removes a category from every one of the user's scores that has it —
// "delete globally" for fixing a typo or retiring a category, since
// categories aren't a separate managed entity, just free text on each score.
router.delete('/:name', asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE scores SET categories = array_remove(categories, $1) WHERE owner_id = $2 AND $1 = ANY(categories)',
    [req.params.name, req.userId]
  );
  res.status(204).end();
}));

module.exports = router;
