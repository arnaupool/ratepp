require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const uploadsRoutes = require('./routes/uploads');
const tagsRoutes = require('./routes/tags');
const categoriesRoutes = require('./routes/categories');
const coversRoutes = require('./routes/covers');
const colorsRoutes = require('./routes/colors');

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

app.use(cors());
app.use(express.json({ limit: '2mb' }));
// Cheap hardening: stops browsers from guessing content-types and
// executing an uploaded file as something other than the image it was
// validated as. No effect on legitimate requests/responses.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use('/uploads', express.static(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/covers', coversRoutes);
app.use('/api/color', colorsRoutes);

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Postgres invalid_text_representation — a malformed UUID in a route
  // param, not a server fault.
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Identificador inválido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Puntuaciones API escuchando en :${port}`));
