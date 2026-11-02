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

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org';

const config = {
  port: Number(process.env.PORT) || 4000,
  allowRegistration: parseBool(process.env.ALLOW_REGISTRATION, true),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  mapTileUrl: (process.env.MAP_TILE_URL || '').trim() || DEFAULT_TILE_URL,
  geocoderUrl: ((process.env.GEOCODER_URL || '').trim() || DEFAULT_GEOCODER_URL).replace(/\/+$/, ''),
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')),
  // Built web app (web/dist). In the Docker image it is copied to /app/public;
  // in local development it is read straight from the sibling web/ folder.
  webDistDir: path.resolve(process.env.WEB_DIST_DIR || path.join(__dirname, '../public')),
};

module.exports = config;
