require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const uploadsRoutes = require('./routes/uploads');
const tagsRoutes = require('./routes/tags');
const coversRoutes = require('./routes/covers');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/covers', coversRoutes);

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
