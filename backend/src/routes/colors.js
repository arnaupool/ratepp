const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');
const { extractDominantColor } = require('../utils/dominantColor');

const router = express.Router();
router.use(requireAuth);
// Decoding a photo is CPU-heavy and external URLs are fetched server-side.
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, keyBy: 'user' }));

const MAX_BYTES = 8 * 1024 * 1024;
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));
const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// Matches our own photos: the relative path /uploads/<filename> stored today,
// or an old absolute URL with that path (host/protocol don't matter). A match
// is read straight off disk rather than fetched over the network, so it has
// no SSRF surface (the resolved path is verified to stay inside uploadsDir)
// and works even though the server's own address is usually a private one
// the hostname blocklist below would reject.
function readOwnUpload(url) {
  let u;
  try {
    u = new URL(url, 'http://relative.invalid');
  } catch {
    return null;
  }
  const m = u.pathname.match(/^\/uploads\/([^/]+)$/);
  if (!m) return null;
  const filePath = path.resolve(uploadsDir, m[1]);
  if (path.dirname(filePath) !== uploadsDir) return null; // path traversal guard
  return filePath;
}

// Basic SSRF guard for genuinely-external URLs (cover-search poster art):
// only http(s), and reject obvious loopback/private-network hostnames so
// an authenticated user can't use this as a probe against other services
// in the same Docker network. Not bulletproof against DNS rebinding, but
// reasonable for a self-hosted, low-user-count app.
const BLOCKED_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/i;

function isSafeExternalUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (BLOCKED_HOST_RE.test(u.hostname)) return false;
  return true;
}

// Suggests a card tint by averaging the pixels of an image URL — either our
// own /uploads/ file or an external cover-search poster. Best-effort: any
// failure (unsupported format, fetch error, oversized file) just returns a
// null color rather than an error, since this is only ever a suggestion the
// user can override via the color picker.
router.get('/', asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ color: null });

  const ownUploadPath = readOwnUpload(url);
  if (ownUploadPath) {
    try {
      const buffer = await fs.readFile(ownUploadPath);
      const mimetype = MIME_BY_EXT[path.extname(ownUploadPath).toLowerCase()];
      return res.json({ color: mimetype ? extractDominantColor(buffer, mimetype) : null });
    } catch {
      return res.json({ color: null });
    }
  }

  if (!isSafeExternalUrl(url)) return res.json({ color: null });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return res.json({ color: null });

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > MAX_BYTES) return res.json({ color: null });

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) return res.json({ color: null });

    const color = extractDominantColor(buffer, contentType);
    res.json({ color });
  } catch {
    res.json({ color: null });
  }
}));

module.exports = router;
