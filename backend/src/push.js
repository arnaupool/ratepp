const webpush = require('web-push');
const { pool } = require('./db');
const config = require('./config');
const { getSetting, setSetting } = require('./settings');

// Web Push (docs/avisos.md). The VAPID keys are made on first use and kept
// in app_settings, so the container needs no extra configuration; they
// must never change afterwards or every device has to subscribe again.

let keys = null;

async function vapidKeys() {
  if (keys) return keys;
  let stored = await getSetting('vapidKeys');
  if (!stored?.publicKey || !stored?.privateKey) {
    stored = webpush.generateVAPIDKeys();
    await setSetting('vapidKeys', stored);
    // Two first requests at once: keep whichever was saved last.
    stored = await getSetting('vapidKeys');
  }
  keys = stored;
  return keys;
}

async function publicKey() {
  return (await vapidKeys()).publicKey;
}

// The push services want a contact; it is never shown to users.
function subject() {
  if (config.adminEmail) return `mailto:${config.adminEmail}`;
  if (config.publicUrl?.startsWith('https:')) return config.publicUrl;
  return 'mailto:admin@puntuaciones.invalid';
}

/**
 * Sends { title, body, url } to every device of these users. Never throws:
 * a failed push must not break what triggered it. Subscriptions the push
 * service reports as gone (404/410) are deleted.
 */
async function sendToUsers(userIds, payload) {
  try {
    if (userIds.length === 0) return;
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = ANY($1)', [userIds]);
    if (subs.rowCount === 0) return;
    const { publicKey: pub, privateKey } = await vapidKeys();
    const options = { vapidDetails: { subject: subject(), publicKey: pub, privateKey }, TTL: 24 * 3600 };
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.rows.map(async (s) => {
        try {
          // web-push encrypts and signs; the request itself goes through
          // fetch, which also reaches the e2e suite's plain-http stub.
          const r = webpush.generateRequestDetails({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, options);
          const sent = await fetch(r.endpoint, { method: r.method, headers: r.headers, body: r.body, signal: AbortSignal.timeout(10000) });
          if (sent.status === 404 || sent.status === 410) {
            await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]);
          } else if (!sent.ok) {
            console.warn(`[push] envío fallido (${sent.status})`);
          }
        } catch (err) {
          console.warn(`[push] envío fallido (${err.message})`);
        }
      })
    );
  } catch (err) {
    console.warn(`[push] ${err.message}`);
  }
}

/**
 * A note was created in a group, or moved into one: asks the other members
 * for their score.
 */
async function notifyNewGroupNote(scoreId, actorId) {
  try {
    const r = await pool.query(
      `SELECT s.title, g.name AS group_name, u.name AS actor_name
       FROM scores s JOIN groups g ON g.id = s.group_id JOIN users u ON u.id = $2
       WHERE s.id = $1`,
      [scoreId, actorId]
    );
    const n = r.rows[0];
    if (!n) return;
    const members = await pool.query(
      `SELECT gm.user_id FROM group_members gm JOIN scores s ON s.group_id = gm.group_id
       WHERE s.id = $1 AND gm.user_id <> $2`,
      [scoreId, actorId]
    );
    await sendToUsers(
      members.rows.map((m) => m.user_id),
      { title: `${n.group_name}: ${n.title}`, body: `${n.actor_name} ha puntuado «${n.title}». ¿Y tú?`, url: `/p/${scoreId}`, tag: `score-${scoreId}` }
    );
  } catch (err) {
    console.warn(`[push] ${err.message}`);
  }
}

module.exports = { publicKey, sendToUsers, notifyNewGroupNote };
