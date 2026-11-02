const express = require('express');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth);
// Each search calls a third-party API with the server's own key.
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 150, keyBy: 'user' }));

async function searchMovieOrTv(kind, query) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { results: [], note: 'TMDB_API_KEY no configurada en el servidor' };
  const url = `https://api.themoviedb.org/3/search/${kind}?api_key=${encodeURIComponent(key)}&language=es-ES&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return { results: [] };
  const data = await res.json();
  const results = (data.results || [])
    .filter((r) => r.poster_path)
    .slice(0, 20)
    .map((r) => ({
      id: `tmdb-${r.id}`,
      title: r.title || r.name,
      subtitle: (r.release_date || r.first_air_date || '').slice(0, 4) || null,
      posterUrl: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
    }));
  return { results };
}

async function searchGame(query) {
  const key = process.env.RAWG_API_KEY;
  if (!key) return { results: [], note: 'RAWG_API_KEY no configurada en el servidor' };
  const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=20`;
  const res = await fetch(url);
  if (!res.ok) return { results: [] };
  const data = await res.json();
  const results = (data.results || [])
    .filter((r) => r.background_image)
    .map((r) => ({
      id: `rawg-${r.id}`,
      title: r.name,
      subtitle: r.released ? r.released.slice(0, 4) : null,
      posterUrl: r.background_image,
    }));
  return { results };
}

async function searchBook(query) {
  const url = `https://openlibrary.org/search.json?limit=20&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return { results: [] };
  const data = await res.json();
  const results = (data.docs || [])
    .filter((d) => d.cover_i)
    .map((d) => ({
      id: `ol-${d.key}`,
      title: d.title,
      subtitle: d.author_name ? d.author_name[0] : null,
      posterUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
    }));
  return { results };
}

const HANDLERS = {
  movie: (q) => searchMovieOrTv('movie', q),
  tv: (q) => searchMovieOrTv('tv', q),
  game: searchGame,
  book: searchBook,
};

router.get('/search', asyncHandler(async (req, res) => {
  const { type, q } = req.query;
  const handler = HANDLERS[type];
  if (!handler) return res.status(400).json({ error: 'Tipo inválido. Usa movie, tv, game o book.' });
  if (!q || !String(q).trim()) return res.json({ results: [] });
  const data = await handler(String(q).trim());
  res.json(data);
}));

module.exports = router;
