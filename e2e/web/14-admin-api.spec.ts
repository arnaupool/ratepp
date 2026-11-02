import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { ADMIN_EMAIL, uniqueEmail } from './fixtures';
import { PNG_BASE64 } from './seed';

// Site administration at the API level (docs/admin.md). Runs once
// (Chromium project), no browser needed. ADMIN_EMAIL comes from
// playwright.config.ts.
test.skip(({ browserName }) => browserName !== 'chromium', 'API only');

class User {
  token = '';
  id = '';
  constructor(private request: APIRequestContext, public name: string, public email = uniqueEmail(), public password = 'secret123') {}
  /** Registers, or logs in when the account already exists (ADMIN_EMAIL survives between runs). */
  async open() {
    let r = await this.request.post('/api/auth/register', { data: { email: this.email, password: this.password, name: this.name } });
    if (r.status() === 409) r = await this.login();
    expect(r.ok(), await r.text()).toBeTruthy();
    const body = await r.json();
    this.token = body.token;
    this.id = body.user.id;
    return this;
  }
  login(password = this.password) {
    return this.request.post('/api/auth/login', { data: { email: this.email, password } });
  }
  h() {
    return { Authorization: `Bearer ${this.token}` };
  }
  get(path: string) {
    return this.request.get(path, { headers: this.h() });
  }
  post(path: string, data?: unknown) {
    return this.request.post(path, { headers: this.h(), data });
  }
  put(path: string, data?: unknown) {
    return this.request.put(path, { headers: this.h(), data });
  }
  patch(path: string, data: unknown) {
    return this.request.patch(path, { headers: this.h(), data });
  }
  del(path: string) {
    return this.request.delete(path, { headers: this.h() });
  }
  async json(res: Promise<APIResponse>) {
    const r = await res;
    expect(r.ok(), `${r.url()} -> ${r.status()} ${await r.text()}`).toBeTruthy();
    return r.status() === 204 ? null : r.json();
  }
}

test('admin: datos, permisos, desactivar, sesiones y contraseña', async ({ request }) => {
  const admin = await new User(request, 'Admin', ADMIN_EMAIL).open();
  const ana = await new User(request, 'Ana').open();
  const bea = await new User(request, 'Bea').open();

  expect((await admin.json(admin.get('/api/auth/me'))).user.isAdmin).toBe(true);
  expect((await ana.json(ana.get('/api/auth/me'))).user.isAdmin).toBe(false);

  // Not for regular accounts.
  for (const r of [ana.get('/api/admin/stats'), ana.get('/api/admin/users'), ana.put('/api/admin/settings', { allowRegistration: false })]) {
    expect((await r).status()).toBe(403);
  }

  const stats = await admin.json(admin.get('/api/admin/stats'));
  expect(stats.users.total).toBeGreaterThanOrEqual(3);
  expect(stats.users.active30d).toBeGreaterThanOrEqual(1);
  expect(typeof stats.storage.dbBytes).toBe('number');
  expect(stats.storage.dbBytes).toBeGreaterThan(0);
  expect(stats.system.adminEmail).toBe(ADMIN_EMAIL);
  expect(stats.system.registrationOpen).toBe(true);

  const { users } = await admin.json(admin.get('/api/admin/users'));
  const me = users.find((u: { id: string }) => u.id === admin.id);
  expect(me).toMatchObject({ isMe: true, isProtected: true, isAdmin: true });
  expect(users.find((u: { id: string }) => u.id === ana.id)).toMatchObject({ isAdmin: false, disabled: false, isProtected: false });

  // Nobody acts on their own account or on ADMIN_EMAIL's.
  expect((await admin.patch(`/api/admin/users/${admin.id}`, { isAdmin: false })).status()).toBe(403);
  expect((await admin.del(`/api/admin/users/${admin.id}`)).status()).toBe(403);
  expect((await admin.patch('/api/admin/users/not-a-uuid', { isAdmin: true })).status()).toBe(400);

  // Promote Ana: she gets the panel, but still can't touch ADMIN_EMAIL.
  await admin.json(admin.patch(`/api/admin/users/${ana.id}`, { isAdmin: true }));
  expect((await ana.json(ana.get('/api/auth/me'))).user.isAdmin).toBe(true);
  await ana.json(ana.get('/api/admin/stats'));
  expect((await ana.patch(`/api/admin/users/${admin.id}`, { disabled: true })).status()).toBe(403);
  await admin.json(admin.patch(`/api/admin/users/${ana.id}`, { isAdmin: false }));
  expect((await ana.get('/api/admin/stats')).status()).toBe(403);

  // Disabled: out at once, can't log in, back after reactivating.
  const disabled = await admin.json(admin.patch(`/api/admin/users/${bea.id}`, { disabled: true }));
  expect(disabled.user.disabled).toBe(true);
  expect((await bea.get('/api/scores')).status()).toBe(401);
  const blocked = await bea.login();
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).error).toBe('Esta cuenta está desactivada');
  await admin.json(admin.patch(`/api/admin/users/${bea.id}`, { disabled: false }));
  bea.token = (await admin.json(bea.login())).token;
  await bea.json(bea.get('/api/scores'));

  // Close every session: the old token stops working, a new login works.
  const oldToken = bea.token;
  await admin.json(admin.post(`/api/admin/users/${bea.id}/logout`));
  expect((await bea.get('/api/scores')).status()).toBe(401);
  bea.token = (await admin.json(bea.login())).token;
  await bea.json(bea.get('/api/scores'));
  expect(oldToken).not.toBe(bea.token);

  // Temporary password: the old one and the open sessions stop working.
  const { password } = await admin.json(admin.post(`/api/admin/users/${bea.id}/password`));
  expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  expect((await bea.get('/api/scores')).status()).toBe(401);
  expect((await bea.login()).status()).toBe(401);
  await admin.json(bea.login(password));
});

test('admin: abrir y cerrar el registro desde el panel', async ({ request }) => {
  const admin = await new User(request, 'Admin', ADMIN_EMAIL).open();
  try {
    const closed = await admin.json(admin.put('/api/admin/settings', { allowRegistration: false }));
    expect(closed).toEqual({ registrationOpen: false, registrationOverridden: true });
    expect((await (await request.get('/api/config')).json()).allowRegistration).toBe(false);
    const r = await request.post('/api/auth/register', { data: { email: uniqueEmail(), password: 'secret123', name: 'X' } });
    expect(r.status()).toBe(403);
    // ADMIN_EMAIL gets past the closed registration (and then finds it exists).
    const own = await request.post('/api/auth/register', { data: { email: ADMIN_EMAIL, password: 'secret123', name: 'X' } });
    expect(own.status()).toBe(409);
    expect((await admin.put('/api/admin/settings', { allowRegistration: 'no' })).status()).toBe(400);
  } finally {
    const back = await admin.json(admin.put('/api/admin/settings', { allowRegistration: null }));
    expect(back).toEqual({ registrationOpen: true, registrationOverridden: false });
  }
  await new User(request, 'Nueva').open();
});

test('admin: borrar una cuenta deja sus notas de grupo como de antiguo miembro', async ({ request }) => {
  const admin = await new User(request, 'Admin', ADMIN_EMAIL).open();
  const tres = await new User(request, 'Tres').open();
  const cuatro = await new User(request, 'Cuatro').open();

  // Tres: a personal note with a photo, a group shared with Cuatro, and a
  // group of their own.
  const up = await request.post('/api/uploads', {
    headers: tres.h(),
    multipart: { photo: { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') } },
  });
  const photoUrl = (await up.json()).url as string;
  expect((await request.get(photoUrl)).status()).toBe(200);
  await tres.json(tres.post('/api/scores', { title: 'Personal de Tres', ownerValue: 7, photoUrls: [photoUrl] }));

  const shared = (await tres.json(tres.post('/api/groups', { name: 'Compartido' }))).group;
  await tres.json(tres.post(`/api/groups/${shared.id}/members`, { email: cuatro.email }));
  const byTres = (await tres.json(tres.post('/api/scores', { title: 'De Tres en grupo', ownerValue: 8, groupId: shared.id }))).score;
  const byCuatro = (await cuatro.json(cuatro.post('/api/scores', { title: 'De Cuatro', ownerValue: 5, groupId: shared.id }))).score;
  await tres.json(tres.put(`/api/scores/${byCuatro.id}/ratings/me`, { value: 9 }));

  const alone = (await tres.json(tres.post('/api/groups', { name: 'Solo Tres' }))).group;
  await tres.json(tres.post('/api/scores', { title: 'En grupo vacío', ownerValue: 4, groupId: alone.id }));

  const before = await admin.json(admin.get('/api/admin/stats'));
  await admin.json(admin.del(`/api/admin/users/${tres.id}`));
  expect((await tres.get('/api/scores')).status()).toBe(401);
  expect((await tres.login()).status()).toBe(401);

  // The photo of the personal note is gone.
  expect((await request.get(photoUrl)).status()).toBe(404);

  // Cuatro keeps the group, now as its admin, with Tres's note and score.
  const group = await cuatro.json(cuatro.get(`/api/groups/${shared.id}`));
  expect(group.group.role).toBe('admin');
  const kept = (await cuatro.json(cuatro.get(`/api/scores/${byTres.id}`))).score;
  expect(kept).toMatchObject({ title: 'De Tres en grupo', authorId: null, authorName: null, canManage: true });
  const theirs = (await cuatro.json(cuatro.get(`/api/scores/${byCuatro.id}`))).score;
  const former = theirs.ratings.find((r: { personName: string }) => r.personName === 'Tres');
  expect(former).toMatchObject({ value: 9, formerMember: true, isMe: false });

  // Taken out of the group, the author-less note stays with whoever moved it.
  const moved = (await cuatro.json(cuatro.patch(`/api/scores/${byTres.id}`, { groupId: null }))).score;
  expect(moved).toMatchObject({ groupId: null, authorId: cuatro.id });

  // Gone: the account, its personal note, and the group only Tres was in
  // with its note.
  const { users } = await admin.json(admin.get('/api/admin/users'));
  expect(users.some((u: { id: string }) => u.id === tres.id)).toBe(false);
  const after = await admin.json(admin.get('/api/admin/stats'));
  expect(after.users.total).toBe(before.users.total - 1);
  expect(after.content.groups).toBe(before.content.groups - 1);
  expect(after.content.notes).toBe(before.content.notes - 2);
});
