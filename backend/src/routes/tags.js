const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// Distinct values used in 'tag'-type fields (each field holds an array of
// tags) across all of the user's scores, so the tag field can suggest
// previously-created tags instead of always starting blank.
router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT elem AS value
     FROM score_fields sf
     JOIN scores s ON s.id = sf.score_id,
     LATERAL jsonb_array_elements_text(sf.value) AS elem
     WHERE s.owner_id = $1 AND sf.type = 'tag' AND jsonb_typeof(sf.value) = 'array'`,
    [req.userId]
  );
  const tags = result.rows
    .map((r) => r.value)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  res.json({ tags });
}));

module.exports = router;
