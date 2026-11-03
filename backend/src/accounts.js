const { pool } = require('./db');
const { removePhoto } = require('./utils/uploadFiles');
const { ensureAdmin } = require('./routes/groups');

/**
 * Deletes an account (docs/admin.md): its personal notes, photos and
 * templates go; its group notes, templates and scores stay in the groups as
 * a former member's, like when someone leaves a group. Used by the admin
 * panel and by Ajustes.
 */
async function deleteAccount(user) {
  const client = await pool.connect();
  let photoUrls = [];
  try {
    await client.query('BEGIN');
    // Leave every group first: a group left empty gives its notes back to
    // their authors, so this account's ones then go with the personal ones.
    const memberships = await client.query('DELETE FROM group_members WHERE user_id = $1 RETURNING group_id', [user.id]);
    for (const m of memberships.rows) await ensureAdmin(client, m.group_id);
    const personal = await client.query('DELETE FROM scores WHERE owner_id = $1 AND group_id IS NULL RETURNING photo_urls', [user.id]);
    photoUrls = personal.rows.flatMap((r) => r.photo_urls || []);
    await client.query('DELETE FROM note_templates WHERE owner_id = $1 AND group_id IS NULL', [user.id]);
    await client.query(
      "UPDATE score_ratings SET former_user = true, person_name = COALESCE(NULLIF(person_name, ''), $2) WHERE user_id = $1",
      [user.id, user.name]
    );
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  // Files last, once the rows are gone, and only those no other note uses.
  for (const url of new Set(photoUrls)) {
    const still = await pool.query('SELECT 1 FROM scores WHERE $1 = ANY(photo_urls) LIMIT 1', [url]);
    if (still.rowCount === 0) await removePhoto(url).catch((err) => console.warn(`[accounts] no se pudo borrar ${url}: ${err.message}`));
  }
}

module.exports = { deleteAccount };
