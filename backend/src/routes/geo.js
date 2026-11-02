const express = require('express');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const asyncHandler = require('../middleware/asyncHandler');

// Address search and reverse geocoding for the location picker. The native
// app used the phone's geocoder; the web app goes through this proxy to a
// Nominatim-compatible API (GEOCODER_URL, public Nominatim by default).
// Nominatim's usage policy: an identifying User-Agent, at most 1 request per
// second, and cache results. All three are enforced here for every user.
const router = express.Router();
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60 * 1000, max: 60, keyBy: 'user' }));

const USER_AGENT = 'Puntuaciones/1.0 (self-hosted rating app; https://github.com/arnaupool/ratepp)';
const CACHE_MAX = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  // Refresh recency (Map keeps insertion order: oldest first).
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

// Serializes upstream calls at least one second apart.
let nextSlot = 0;
async function throttled(fn) {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1000;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return fn();
}

async function upstream(pathAndQuery) {
  const cached = cacheGet(pathAndQuery);
  if (cached !== undefined) return cached;
  const data = await throttled(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${config.geocoderUrl}${pathAndQuery}`, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`geocoder ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  });
  cacheSet(pathAndQuery, data);
  return data;
}

// Same parts the native app showed: street (with number), place name,
// city, region; duplicates dropped.
function buildLabel(result) {
  if (!result) return null;
  const a = result.address || {};
  const street = a.road ? [a.road, a.house_number].filter(Boolean).join(' ') : null;
  const city = a.city || a.town || a.village || a.municipality || a.county;
  const parts = [result.name, street, city, a.state].filter(Boolean);
  const label = [...new Set(parts)].join(', ');
  return label || result.display_name || null;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  if (q.length > 200) return res.status(400).json({ error: 'Búsqueda demasiado larga' });
  try {
    const data = await upstream(`/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`);
    const results = (Array.isArray(data) ? data : [])
      .map((r) => ({ label: buildLabel(r), lat: toNumber(r.lat), lng: toNumber(r.lon) }))
      .filter((r) => r.lat !== null && r.lng !== null);
    res.json({ results });
  } catch {
    res.status(502).json({ error: 'No se pudo buscar la dirección' });
  }
}));

router.get('/reverse', asyncHandler(async (req, res) => {
  const lat = toNumber(req.query.lat);
  const lng = toNumber(req.query.lng);
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  }
  // ~1 m precision is plenty and makes repeated taps hit the cache.
  const key = `/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`;
  try {
    const data = await upstream(key);
    res.json({ label: data && !data.error ? buildLabel(data) : null });
  } catch {
    res.json({ label: null });
  }
}));

module.exports = router;
