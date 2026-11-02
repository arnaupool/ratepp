// Fixed-window rate limiter kept behind a tiny interface (a store with
// hit(key) -> count) so the in-memory map can be swapped for Redis if the app
// ever runs as more than one instance. In memory is fine for a single
// self-hosted container: counters just reset on restart.

function memoryStore(windowMs) {
  const entries = new Map();
  // Drop expired windows now and then so the map can't grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (now - entry.windowStart > windowMs) entries.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return {
    hit(key) {
      const now = Date.now();
      const entry = entries.get(key);
      if (!entry || now - entry.windowStart > windowMs) {
        entries.set(key, { windowStart: now, count: 1 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// keyBy 'user' falls back to the IP for unauthenticated requests, so it can
// sit in front of routes that check auth themselves.
function rateLimit({ windowMs, max, keyBy = 'ip', message = 'Demasiadas peticiones, inténtalo de nuevo más tarde', store }) {
  const counter = store || memoryStore(windowMs);
  return (req, res, next) => {
    const key = keyBy === 'user' && req.userId ? `u:${req.userId}` : `ip:${clientIp(req)}`;
    if (counter.hit(key) > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { rateLimit, memoryStore };
