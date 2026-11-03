import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { uniqueEmail } from './fixtures';

// Note templates at the API level (docs/plantillas.md). Runs once
// (Chromium project), no browser needed.
test.skip(({ browserName }) => browserName !== 'chromium', 'API only');

class User {
  token = '';
  id = '';
  email = uniqueEmail();
  constructor(private request: APIRequestContext, public name: string) {}
  async register() {
    const r = await this.request.post('/api/auth/register', { data: { email: this.email, password: 'secret123', name: this.name } });
    const body = await r.json();
    this.token = body.token;
    this.id = body.user.id;
    return this;
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
  async templates() {
    return (await this.json(this.get('/api/templates'))).templates as { id: string; name: string; groupId: string | null; canManage: boolean }[];
  }
}

test('plantillas: solo se guarda la forma de la nota', async ({ request }) => {
  const ana = await new User(request, 'Ana').register();
  const { template } = await ana.json(
    ana.post('/api/templates', {
      name: '  Restaurante  ',
      emoji: '🍽️',
      categories: ['Restaurantes', 'Restaurantes', ''],
      cardColor: '#aa3311',
      people: ['Bea', ''],
      fields: [
        { type: 'criteria', label: 'Criterios', value: [{ name: 'Sabor', value: 9 }, { name: 'Servicio', value: 7 }, { name: '', value: 3 }] },
        { type: 'price', label: 'Precio', value: { amount: '24,50', currency: 'USD', per: 'total', people: 2 } },
        { type: 'text_long', label: 'Notas', value: 'Muy bueno' },
        { type: 'location', label: 'Ubicación', value: { label: 'Valencia', lat: 39.4, lng: -0.3 } },
        { type: 'ingredients', label: 'Ingredientes', value: { servings: 2, items: [{ qty: '3', unit: '', name: 'huevos' }] } },
        { type: 'nope', label: 'Raro', value: 1 },
      ],
    })
  );
  expect(template).toMatchObject({
    name: 'Restaurante',
    emoji: '🍽️',
    groupId: null,
    categories: ['Restaurantes'],
    cardColor: '#aa3311',
    people: ['Bea'],
    canManage: true,
  });
  expect(template.fields).toEqual([
    { type: 'criteria', label: 'Criterios', value: [{ name: 'Sabor', value: null }, { name: 'Servicio', value: null }] },
    { type: 'price', label: 'Precio', value: { amount: '', currency: 'USD', per: 'total', people: null } },
    { type: 'text_long', label: 'Notas', value: '' },
    { type: 'location', label: 'Ubicación', value: null },
    { type: 'ingredients', label: 'Ingredientes', value: { servings: null, items: [{ qty: '', unit: '', name: '' }] } },
  ]);

  expect((await ana.post('/api/templates', { name: '', emoji: '🍕' })).status()).toBe(400);
  expect((await ana.post('/api/templates', { name: 'Sin emoji', emoji: '' })).status()).toBe(400);

  // Rename and change the emoticon; delete.
  const renamed = (await ana.json(ana.patch(`/api/templates/${template.id}`, { name: 'Restaurantes', emoji: '🍕' }))).template;
  expect(renamed).toMatchObject({ name: 'Restaurantes', emoji: '🍕', fields: template.fields });
  await ana.json(ana.del(`/api/templates/${template.id}`));
  expect(await ana.templates()).toEqual([]);
});

test('plantillas: tuyas o del grupo, y quién las cambia', async ({ request }) => {
  const ana = await new User(request, 'Ana').register();
  const bea = await new User(request, 'Bea').register();
  const carl = await new User(request, 'Carl').register();
  const { group } = await ana.json(ana.post('/api/groups', { name: 'Pareja' }));
  await ana.json(ana.post(`/api/groups/${group.id}/members`, { email: bea.email }));

  const personal = (await ana.json(ana.post('/api/templates', { name: 'Solo mía', emoji: '📚' }))).template;
  const byAna = (await ana.json(ana.post('/api/templates', { name: 'De Ana', emoji: '🍷', groupId: group.id }))).template;
  const byBea = (await bea.json(bea.post('/api/templates', { name: 'De Bea', emoji: '🎬', groupId: group.id }))).template;
  expect(byBea).toMatchObject({ groupId: group.id, groupName: 'Pareja' });

  // Not a member: can't add to the group, sees nothing.
  expect((await carl.post('/api/templates', { name: 'x', emoji: '⭐', groupId: group.id })).status()).toBe(403);
  expect(await carl.templates()).toEqual([]);
  expect((await carl.patch(`/api/templates/${byAna.id}`, { name: 'x' })).status()).toBe(404);

  // Bea sees the group's two, not Ana's personal one; manages only hers.
  const beaSees = await bea.templates();
  expect(beaSees.map((t) => t.name).sort()).toEqual(['De Ana', 'De Bea']);
  expect(beaSees.find((t) => t.id === byAna.id)?.canManage).toBe(false);
  expect(beaSees.find((t) => t.id === byBea.id)?.canManage).toBe(true);
  expect((await bea.patch(`/api/templates/${byAna.id}`, { name: 'Mía' })).status()).toBe(403);
  expect((await bea.del(`/api/templates/${personal.id}`)).status()).toBe(404);

  // Ana, group admin, manages Bea's too.
  const anaSees = await ana.templates();
  expect(anaSees.map((t) => t.name)).toEqual(['Solo mía', 'De Ana', 'De Bea']);
  expect(anaSees.every((t) => t.canManage)).toBe(true);
  await ana.json(ana.patch(`/api/templates/${byBea.id}`, { emoji: '📺' }));

  // Deleting the group gives each template back to whoever made it.
  await ana.json(ana.del(`/api/groups/${group.id}?notas=borrar`));
  expect((await ana.templates()).map((t) => [t.name, t.groupId])).toEqual([
    ['De Ana', null],
    ['Solo mía', null],
  ]);
  expect((await bea.templates()).map((t) => [t.name, t.groupId])).toEqual([['De Bea', null]]);
});
