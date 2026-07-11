const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// Distinct values used in 'tag'-type fields across all of the user's scores,
// so the tag field can suggest previously-created tags instead of always
// starting blank.
router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT sf.value AS value
     FROM score_fields sf
     JOIN scores s ON s.id = sf.score_id
     WHERE s.owner_id = $1 AND sf.type = 'tag' AND sf.value IS NOT NULL AND sf.value != 'null'`,
    [req.userId]
  );
  const tags = result.rows
    .map((r) => (typeof r.value === 'string' ? r.value : null))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  res.json({ tags });
}));

module.exports = router;
