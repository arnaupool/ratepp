const path = require('path');

// Everything that depends on where/how the app is deployed comes from the
// environment, never from code: the same image has to work on a LAN IP, a
// Tailscale hostname or a public domain without a rebuild.

function parseBool(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(String(raw).trim().toLowerCase());
}

// Express's 'trust proxy' accepts a boolean, a hop count or a list of
// addresses/subnets ('loopback', '10.0.0.0/8', ...). Empty means "don't trust
// any proxy", which is Express's own default.
function parseTrustProxy(raw) {
  if (raw === undefined || raw.trim() === '') return null;
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

// The address people use to reach the app from outside (e.g. the Tailscale
// or public HTTPS name). Only an http(s) origin is accepted; anything else is
// ignored with a warning so a typo can't produce broken links.
function parsePublicUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol');
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    console.warn(`[config] PUBLIC_URL no es una URL http(s) válida y se ignora: ${v}`);
    return null;
  }
}

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org';

const config = {
  port: Number(process.env.PORT) || 4000,
  // Starting value; the admin panel can override it (settings.js).
  allowRegistration: parseBool(process.env.ALLOW_REGISTRATION, true),
  // This account is always a site admin and the panel can't demote, disable
  // or delete it: the way back in if the other admins lock you out.
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase() || null,
  // Shown in the admin panel; set by the image build (Dockerfile).
  appVersion: (process.env.APP_VERSION || '').trim() || null,
  // Login/register attempts per IP every 15 minutes.
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Used to build links meant for other people (group invitations), so they
  // work even when the sender opened the app through a LAN address.
  publicUrl: parsePublicUrl(process.env.PUBLIC_URL),
  // Extra origins push subscriptions may point at, besides the browsers'
  // push services (push.js). Only the e2e suite sets it, for its stub.
  pushExtraOrigins: (process.env.PUSH_EXTRA_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  mapTileUrl: (process.env.MAP_TILE_URL || '').trim() || DEFAULT_TILE_URL,
  geocoderUrl: ((process.env.GEOCODER_URL || '').trim() || DEFAULT_GEOCODER_URL).replace(/\/+$/, ''),
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')),
  // Built web app (web/dist). In the Docker image it is copied to /app/public;
  // in local development it is read straight from the sibling web/ folder.
  webDistDir: path.resolve(process.env.WEB_DIST_DIR || path.join(__dirname, '../public')),
};

module.exports = config;
