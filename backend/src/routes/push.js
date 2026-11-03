const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { HttpError } = require('../access');
const { publicKey } = require('../push');

// This device's notifications (docs/avisos.md): the browser's PushManager
// subscription, saved for the signed-in account.
const router = express.Router();
router.use(requireAuth);

const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : '');

router.get('/key', asyncHandler(async (req, res) => {
  res.json({ publicKey: await publicKey() });
}));

// { endpoint, keys: { p256dh, auth } }, as PushSubscription.toJSON() gives
// it. A device that was someone else's moves to this account.
router.post('/subscription', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const endpoint = str(b.endpoint, 2000);
  const p256dh = str(b.keys?.p256dh, 200);
  const auth = str(b.keys?.auth, 100);
  if (!/^https?:\/\//.test(endpoint) || !p256dh || !auth) throw new HttpError(400, 'Suscripción inválida');
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [req.userId, endpoint, p256dh, auth]
  );
  res.status(204).end();
}));

router.delete('/subscription', asyncHandler(async (req, res) => {
  const endpoint = str(req.body?.endpoint, 2000);
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.userId]);
  res.status(204).end();
}));

module.exports = router;
