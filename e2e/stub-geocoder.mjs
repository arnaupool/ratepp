// Nominatim stand-in for the e2e suite (the backend's GEOCODER_URL points
// here), so tests never depend on the public service or the network.
import http from 'node:http';

const PORT = Number(process.env.STUB_GEOCODER_PORT || 4199);
let lastUserAgent = null;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (body) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === '/_last-user-agent') return json({ userAgent: lastUserAgent });
  lastUserAgent = req.headers['user-agent'] || null;
  if (url.pathname === '/search') {
    const q = url.searchParams.get('q') || '';
    if (/sin resultados/i.test(q)) return json([]);
    return json([
      {
        lat: '40.4155',
        lon: '-3.7074',
        name: 'Calle Mayor',
        display_name: 'Calle Mayor, 12, Madrid, España',
        address: { road: 'Calle Mayor', house_number: '12', city: 'Madrid', state: 'Comunidad de Madrid' },
      },
    ]);
  }
  if (url.pathname === '/reverse') {
    return json({
      name: '',
      display_name: 'Carrer de Colón, 1, València',
      address: { road: 'Carrer de Colón', house_number: '1', city: 'València', state: 'Comunitat Valenciana' },
    });
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log(`stub geocoder on :${PORT}`));
