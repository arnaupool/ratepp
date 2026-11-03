import crypto from 'node:crypto';
import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { uniqueEmail } from './fixtures';

// Asking group members for their score (docs/avisos.md): pending notes,
// "No la he probado" and Web Push. API only.
test.skip(({ browserName }) => browserName !== 'chromium', 'API only');

const STUB = 'http://localhost:4199';

class User {
  token = '';
  id = '';
  email = uniqueEmail();
  constructor(
    private request: APIRequestContext,
    public name: string
  ) {}
  async register() {
    const body = await (await this.request.post('/api/auth/register', { data: { email: this.email, password: 'secret123', name: this.name } })).json();
    this.token = body.token;
    this.id = body.user.id;
    return this;
  }
  private opts(data?: unknown) {
    return { headers: { Authorization: `Bearer ${this.token}` }, data };
  }
  async ok(res: Promise<APIResponse>) {
    const r = await res;
    expect(r.ok(), `${r.url()} -> ${r.status()} ${await r.text()}`).toBeTruthy();
    return r.status() === 204 ? null : r.json();
  }
  get = (path: string) => this.ok(this.request.get(path, this.opts()));
  post = (path: string, data?: unknown) => this.ok(this.request.post(path, this.opts(data)));
  put = (path: string, data?: unknown) => this.ok(this.request.put(path, this.opts(data)));
  del = (path: string, data?: unknown) => this.ok(this.request.delete(path, this.opts(data)));
  raw = (path: string) => this.request.post(path, this.opts());
  pendingCount = async () => (await this.get('/api/scores/pending-count')).count as number;
}

// What a browser's PushManager gives: an endpoint and the keys to encrypt for it.
function fakeSubscription(endpoint: string) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return { endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
}

test('pendientes: notas del grupo sin tu nota, puntuar y "No la he probado"', async ({ request }) => {
  const ana = await new User(request, 'Ana').register();
  const bea = await new User(request, 'Bea').register();
  const { group } = await ana.post('/api/groups', { name: 'Cenas' });
  // A note from before Bea joined never asks her.
  const before = (await ana.post('/api/scores', { title: 'Antigua', ownerValue: 7, groupId: group.id })).score;
  await ana.post(`/api/groups/${group.id}/members`, { email: bea.email });
  expect(await bea.pendingCount()).toBe(0);

  const note = (await ana.post('/api/scores', { title: 'Casa Pepe', ownerValue: 8, groupId: group.id })).score;
  // Not pending for its author, nor for personal notes.
  expect(note.pending).toBe(false);
  await ana.post('/api/scores', { title: 'Solo mía', ownerValue: 5 });
  expect(await ana.pendingCount()).toBe(0);

  expect(await bea.pendingCount()).toBe(1);
  const list = (await bea.get('/api/scores?pending=1')).items;
  expect(list.map((s: { title: string }) => s.title)).toEqual(['Casa Pepe']);
  expect((await bea.get(`/api/scores/${note.id}`)).score.pending).toBe(true);
  expect((await bea.get(`/api/scores/${before.id}`)).score.pending).toBe(false);

  // Scoring it clears it.
  await bea.put(`/api/scores/${note.id}/ratings/me`, { value: 9 });
  expect(await bea.pendingCount()).toBe(0);

  // "No la he probado" too, and it can be undone.
  const other = (await ana.post('/api/scores', { title: 'Bar Manolo', ownerValue: 6, groupId: group.id })).score;
  expect(await bea.pendingCount()).toBe(1);
  const dismissed = (await bea.post(`/api/scores/${other.id}/dismiss`)).score;
  expect(dismissed).toMatchObject({ pending: false, dismissed: true });
  expect(await bea.pendingCount()).toBe(0);
  expect((await bea.del(`/api/scores/${other.id}/dismiss`)).score.pending).toBe(true);

  // Only group notes ask for a score.
  const mine = (await bea.post('/api/scores', { title: 'Personal', ownerValue: 5 })).score;
  expect((await bea.raw(`/api/scores/${mine.id}/dismiss`)).status()).toBe(400);
});

test('push: una nota nueva del grupo avisa a los demás miembros', async ({ request }) => {
  const ana = await new User(request, 'Ana').register();
  const bea = await new User(request, 'Bea').register();
  const { group } = await ana.post('/api/groups', { name: 'Viajes' });
  await ana.post(`/api/groups/${group.id}/members`, { email: bea.email });
  const pushes = async (key: string) => (await (await request.get(`${STUB}/_pushes/${key}`)).json()).count as number;

  expect((await bea.get('/api/push/key')).publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
  const beaPhone = crypto.randomUUID();
  await bea.post('/api/push/subscription', fakeSubscription(`${STUB}/push/${beaPhone}`));
  const anaPhone = crypto.randomUUID();
  await ana.post('/api/push/subscription', fakeSubscription(`${STUB}/push/${anaPhone}`));

  // Bea gets it; Ana, who created it, doesn't. Personal notes send nothing.
  await ana.post('/api/scores', { title: 'Lisboa', ownerValue: 9, groupId: group.id });
  await expect.poll(() => pushes(beaPhone)).toBe(1);
  await ana.post('/api/scores', { title: 'Privada', ownerValue: 4 });
  await bea.post('/api/scores', { title: 'De Bea', ownerValue: 7, groupId: group.id });
  await expect.poll(() => pushes(anaPhone)).toBe(1);
  expect(await pushes(beaPhone)).toBe(1);

  // A subscription the push service reports as gone is dropped.
  const gone = `gone-${crypto.randomUUID()}`;
  await bea.post('/api/push/subscription', fakeSubscription(`${STUB}/push/${gone}`));
  await ana.post('/api/scores', { title: 'Oporto', ownerValue: 8, groupId: group.id });
  await expect.poll(() => pushes(gone)).toBe(1);
  await expect.poll(() => pushes(beaPhone)).toBe(2);
  await ana.post('/api/scores', { title: 'Braga', ownerValue: 8, groupId: group.id });
  await expect.poll(() => pushes(beaPhone)).toBe(3);
  expect(await pushes(gone)).toBe(1);

  // Turned off on that device: no more there.
  await bea.del('/api/push/subscription', { endpoint: `${STUB}/push/${beaPhone}` });
  await bea.post('/api/scores', { title: 'Faro', ownerValue: 8, groupId: group.id });
  await expect.poll(() => pushes(anaPhone)).toBe(2);
  await ana.post('/api/scores', { title: 'Sintra', ownerValue: 8, groupId: group.id });
  await new Promise((r) => setTimeout(r, 500));
  expect(await pushes(beaPhone)).toBe(3);
});
