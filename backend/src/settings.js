const { pool } = require('./db');
const config = require('./config');

// Settings the admin panel can change at runtime. Each one falls back to the
// container's environment while nobody has touched it in the panel.

async function getSetting(key) {
  const r = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return r.rowCount > 0 ? r.rows[0].value : undefined;
}

/** null clears the override, back to the environment value. */
async function setSetting(key, value) {
  if (value === null) {
    await pool.query('DELETE FROM app_settings WHERE key = $1', [key]);
    return;
  }
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

/** { open, overridden } */
async function registration() {
  const v = await getSetting('allowRegistration');
  return typeof v === 'boolean' ? { open: v, overridden: true } : { open: config.allowRegistration, overridden: false };
}

/** Site admin: flagged in the panel, or the ADMIN_EMAIL account. */
function isSiteAdmin(user) {
  return !!user.is_admin || isProtected(user);
}

function isProtected(user) {
  return !!config.adminEmail && user.email === config.adminEmail;
}

module.exports = { getSetting, setSetting, registration, isSiteAdmin, isProtected };
