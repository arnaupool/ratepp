const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { isSiteAdmin } = require('../settings');

// Last-seen is written at most this often per account.
const SEEN_EVERY_MS = 5 * 60 * 1000;

function signToken(user) {
  return jwt.sign({ sub: user.id, tv: user.token_version || 0 }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// The token alone isn't enough: the account is checked on every request so
// that deleting, disabling it or closing its sessions (admin panel) takes
// effect at once. Tokens issued before token_version existed carry no tv and
// count as version 0.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  try {
    const r = await pool.query(
      'SELECT id, email, is_admin, disabled_at, token_version, last_seen_at FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = r.rows[0];
    if (!user || user.disabled_at || (payload.tv ?? 0) !== user.token_version) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }
    req.userId = user.id;
    req.isSiteAdmin = isSiteAdmin(user);
    if (!user.last_seen_at || Date.now() - user.last_seen_at.getTime() > SEEN_EVERY_MS) {
      pool.query('UPDATE users SET last_seen_at = now() WHERE id = $1', [user.id]).catch(() => {});
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireSiteAdmin(req, res, next) {
  if (!req.isSiteAdmin) return res.status(403).json({ error: 'Solo para administradores' });
  next();
}

module.exports = { requireAuth, requireSiteAdmin, signToken };
