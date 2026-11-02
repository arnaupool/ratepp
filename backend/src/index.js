require('dotenv').config();
const express = require('express');
const config = require('./config');
const { securityHeaders } = require('./middleware/securityHeaders');
const { mountWebApp } = require('./webApp');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const uploadsRoutes = require('./routes/uploads');
const tagsRoutes = require('./routes/tags');
const categoriesRoutes = require('./routes/categories');
const coversRoutes = require('./routes/covers');
const colorsRoutes = require('./routes/colors');
const configRoutes = require('./routes/config');
const thumbsRoutes = require('./routes/thumbs');
const geoRoutes = require('./routes/geo');
const { groups: groupsRoutes, invites: invitesRoutes } = require('./routes/groups');
const adminRoutes = require('./routes/admin');

const app = express();

// JWT_SECRET signs every auth token; a missing or well-known placeholder
// value would let anyone forge a valid token for any user. This only warns
// (doesn't refuse to start) so an already-running deployment isn't broken
// by this check — but it makes the risk impossible to miss in the logs.
const INSECURE_JWT_SECRETS = new Set(['change-this-to-a-long-random-string', '']);
if (!process.env.JWT_SECRET || INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET)) {
  console.warn(
    '\n[AVISO DE SEGURIDAD] JWT_SECRET no está definido o usa el valor de ejemplo por defecto.\n' +
    'Cualquiera que conozca ese valor podría falsificar tokens de sesión válidos para cualquier usuario.\n' +
    'Define una variable de entorno JWT_SECRET propia y aleatoria (por ejemplo: openssl rand -hex 32).\n'
  );
}

// Behind a reverse proxy (tailscale serve, Caddy, NPM, Cloudflare Tunnel)
// req.ip is the proxy's address unless this is set, and every user would
// share one rate-limit counter.
if (config.trustProxy !== null) app.set('trust proxy', config.trustProxy);

// No CORS: the web app is served from this same origin and nothing else is
// meant to call the API from a browser.
app.use(express.json({ limit: '2mb' }));
app.use(securityHeaders(config));
// Upload filenames are random UUIDs and never overwritten, so a cached copy
// can never go stale.
app.use('/uploads', express.static(config.uploadsDir, {
  index: false,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/covers', coversRoutes);
app.use('/api/color', colorsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/thumb', thumbsRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/admin', adminRoutes);

mountWebApp(app, config.webDistDir);

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Expected errors thrown on purpose (access.js HttpError).
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  // Postgres invalid_text_representation — a malformed UUID in a route
  // param, not a server fault.
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Identificador inválido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = config.port;
app.listen(port, () => console.log(`Puntuaciones API escuchando en :${port}`));
