// The server now hands out HTML and JS, and the session token lives in the
// page's localStorage — an XSS would be a stolen session. A strict CSP is the
// main defense; it is built from config so a different tile provider
// (MAP_TILE_URL) is allowed without touching code.

// Poster art from the cover search. Open Library answers its cover URLs with
// a redirect to archive.org, and CSP checks the redirect target too.
const POSTER_HOSTS = [
  'https://image.tmdb.org',
  'https://media.rawg.io',
  'https://covers.openlibrary.org',
  'https://archive.org',
  'https://*.archive.org',
];

// 'https://{s}.tile.example.org/{z}/{x}/{y}.png' -> 'https://*.tile.example.org'
function tileSource(template) {
  try {
    const withWildcard = template.replace(/\{s\}/g, 'subdomain-wildcard');
    const u = new URL(withWildcard.replace(/\{[a-z]+\}/gi, '0'));
    return `${u.protocol}//${u.host.replace('subdomain-wildcard', '*')}`;
  } catch {
    return null;
  }
}

function buildCsp({ mapTileUrl }) {
  const tiles = tileSource(mapTileUrl);
  const img = ["'self'", 'data:', 'blob:', ...POSTER_HOSTS, ...(tiles ? [tiles] : [])];
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src ${img.join(' ')}`,
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function securityHeaders(config) {
  const csp = buildCsp(config);
  return (req, res, next) => {
    // Stops browsers from guessing content-types and executing an uploaded
    // file as something other than the image it was validated as.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Referrer-Policy', 'same-origin');
    // Redundant with frame-ancestors, kept for older browsers.
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  };
}

module.exports = { securityHeaders, buildCsp, tileSource };
