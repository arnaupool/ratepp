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

// Removes a tag from every 'tag'-type field of every one of the user's
// scores that has it — "delete globally" for fixing a typo or retiring a
// tag, since tags aren't a separate managed entity, just values inside
// each field's array.
//
// jsonb_array_elements_text() throws "cannot extract elements from a
// scalar" if sf.value isn't a JSON array — which any legacy/malformed
// scalar-valued tag field would trigger, aborting the *entire* UPDATE (and
// silently deleting nothing, for any tag) since it's one statement across
// all matching rows. Restricting to jsonb_typeof(sf.value) = 'array' up
// front (as the GET / listing above already does) keeps such rows out of
// consideration entirely.
router.delete('/:name', asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE score_fields sf
     SET value = (
       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
       FROM jsonb_array_elements_text(sf.value) elem
       WHERE elem <> $1
     )
     FROM scores s
     WHERE sf.score_id = s.id
       AND s.owner_id = $2
       AND sf.type = 'tag'
       AND jsonb_typeof(sf.value) = 'array'
       AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(sf.value) e WHERE e = $1)`,
    [req.params.name, req.userId]
  );
  res.status(204).end();
}));

module.exports = router;
