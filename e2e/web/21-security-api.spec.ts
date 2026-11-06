import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { uniqueEmail } from './fixtures';
import { PNG_BASE64 } from './seed';

// Fixes from the security review: uploads must really be images, and the
// color suggestion never fetches from the server's own network. API only.
test.skip(({ browserName }) => browserName !== 'chromium', 'API only');

const STUB = 'http://localhost:4199';

async function signUp(request: import('@playwright/test').APIRequestContext) {
  const r = await request.post('/api/auth/register', { data: { email: uniqueEmail(), password: 'secret123', name: 'Sec' } });
  return { Authorization: `Bearer ${(await r.json()).token}` };
}

test('subidas: solo imágenes de verdad, con la extensión de lo que son', async ({ request }) => {
  const headers = await signUp(request);
  const upload = (name: string, mimeType: string, buffer: Buffer) => request.post('/api/uploads', { headers, multipart: { photo: { name, mimeType, buffer } } });

  // Whatever the client claims, a non-image is refused.
  expect((await upload('x.png', 'image/png', Buffer.from('not an image at all'))).status()).toBe(400);
  expect((await upload('x.jpg', 'image/jpeg', Buffer.from('<html><script>alert(1)</script></html>'))).status()).toBe(400);
  expect((await upload('x.webp', 'image/webp', Buffer.from('RIFF0000WAVEfmt '))).status()).toBe(400);

  // A real PNG sent as a JPEG is kept, as .png.
  const r = await upload('foto.jpg', 'image/jpeg', Buffer.from(PNG_BASE64, 'base64'));
  expect(r.status()).toBe(201);
  const { url } = await r.json();
  expect(url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
  expect((await request.get(url)).headers()['content-type']).toBe('image/png');
});

test('color: nunca pide nada a la red del propio servidor', async ({ request }) => {
  const headers = await signUp(request);
  const probes = async (id: string) => (await (await request.get(`${STUB}/_probes/${id}`)).json()).count as number;

  // The probe counts any request that reaches it.
  const control = crypto.randomUUID();
  await request.get(`${STUB}/probe/${control}`);
  expect(await probes(control)).toBe(1);

  const id = crypto.randomUUID();
  for (const url of [
    `http://localhost:4199/probe/${id}`,
    `http://[::1]:4199/probe/${id}`,
    `http://[::ffff:127.0.0.1]:4199/probe/${id}`,
    `https://localhost:4199/probe/${id}`,
    `http://dockersocket:2375/containers/json`,
    `https://image.tmdb.org.evil.example/x.jpg`,
  ]) {
    const r = await request.get(`/api/color?url=${encodeURIComponent(url)}`, { headers });
    expect(await r.json(), url).toEqual({ color: null });
  }
  expect(await probes(id)).toBe(0);
});
