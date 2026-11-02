import { test, expect, type APIRequestContext } from '@playwright/test';
import { uniqueEmail } from './fixtures';

// Groups at the API level: who sees what, and who may do what
// (docs/grupos.md). Runs once (Chromium project), no browser needed.
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
  put(path: string, data?: unknown) {
    return this.request.put(path, { headers: this.h(), data });
  }
  patch(path: string, data: unknown) {
    return this.request.patch(path, { headers: this.h(), data });
  }
  del(path: string) {
    return this.request.delete(path, { headers: this.h() });
  }
  async json(res: Promise<import('@playwright/test').APIResponse>) {
    const r = await res;
    expect(r.ok(), `${r.url()} -> ${r.status()} ${await r.text()}`).toBeTruthy();
    return r.json();
  }
}

test('grupos: acceso, permisos, invitaciones, salir y borrar', async ({ request }) => {
  const ana = await new User(request, 'Ana').register();
  const bea = await new User(request, 'Bea').register();
  const carl = await new User(request, 'Carl').register();

  // Ana creates a group (admin) and a personal note.
  const { group } = await ana.json(ana.post('/api/groups', { name: 'Pareja' }));
  expect(group.role).toBe('admin');
  const personal = (await ana.json(ana.post('/api/scores', { title: 'Mía', ownerValue: 7, categories: ['Privada'] }))).score;
  expect(personal.groupId).toBeNull();

  // Bea can't see the group or create notes in it before joining.
  expect((await bea.get(`/api/groups/${group.id}`)).status()).toBe(404);
  expect((await bea.post('/api/scores', { title: 'x', ownerValue: 5, groupId: group.id })).status()).toBe(403);

  // Invitation link: only admins create it; anyone with it can join.
  const { invite } = await ana.json(ana.post(`/api/groups/${group.id}/invites`));
  expect(invite.path).toMatch(/^\/unirse\/[\w-]{20,}$/);
  const preview = await bea.json(bea.get(`/api/invites/${invite.token}`));
  expect(preview).toMatchObject({ group: { name: 'Pareja' }, alreadyMember: false });
  await bea.json(bea.post(`/api/invites/${invite.token}/accept`));
  expect((await bea.json(bea.get('/api/groups'))).groups).toMatchObject([{ name: 'Pareja', role: 'member', memberCount: 2 }]);
  expect((await bea.post(`/api/groups/${group.id}/invites`)).status()).toBe(403);
  expect((await bea.get('/api/invites/not-a-real-token')).status()).toBe(404);

  // Adding by email gives the same answer whether the account exists or not.
  const added = await ana.json(ana.post(`/api/groups/${group.id}/members`, { email: carl.email.toUpperCase() }));
  const notFound = await ana.json(ana.post(`/api/groups/${group.id}/members`, { email: 'nadie@nowhere.test' }));
  expect(added).toEqual(notFound);
  const members = (await ana.json(ana.get(`/api/groups/${group.id}`))).members;
  expect(members.map((m: { name: string }) => m.name)).toEqual(['Ana', 'Bea', 'Carl']);
  expect(members[1].email).toBe(bea.email);
  // Members don't see emails.
  expect((await bea.json(bea.get(`/api/groups/${group.id}`))).members[0].email).toBeUndefined();

  // Bea creates a note in the group; everyone in it sees it, outsiders don't.
  const shared = (await bea.json(bea.post('/api/scores', { title: 'Sushi', ownerValue: 8, groupId: group.id, categories: ['Japonés'], fields: [{ type: 'tag', label: 'Etiqueta', value: ['Caro'] }] }))).score;
  expect(shared).toMatchObject({ groupId: group.id, groupName: 'Pareja', authorName: 'Bea', canManage: true });
  const outsider = await new User(request, 'Dani').register();
  expect((await outsider.get(`/api/scores/${shared.id}`)).status()).toBe(404);
  const anaAll = (await ana.json(ana.get('/api/scores?space=all'))).items.map((s: { title: string }) => s.title);
  expect(anaAll.sort()).toEqual(['Mía', 'Sushi']);
  expect((await ana.json(ana.get('/api/scores?space=me'))).items.map((s: { title: string }) => s.title)).toEqual(['Mía']);
  expect((await ana.json(ana.get(`/api/scores?space=${group.id}`))).items.map((s: { title: string }) => s.title)).toEqual(['Sushi']);
  expect((await bea.json(bea.get('/api/scores?space=all'))).items.map((s: { title: string }) => s.title)).toEqual(['Sushi']);
  expect((await outsider.get(`/api/scores?space=${group.id}`)).status()).toBe(200);
  expect((await outsider.json(outsider.get(`/api/scores?space=${group.id}`))).items).toEqual([]);
  expect((await ana.get('/api/scores?space=nonsense')).status()).toBe(400);

  // Categories and tags per space.
  expect((await ana.json(ana.get(`/api/categories?space=${group.id}`))).categories).toEqual(['Japonés']);
  expect((await ana.json(ana.get('/api/categories?space=me'))).categories).toEqual(['Privada']);
  expect((await carl.json(carl.get(`/api/tags?space=${group.id}`))).tags).toEqual(['Caro']);

  // Any member edits; only the rater changes a member's own score.
  const s1 = await carl.json(carl.patch(`/api/scores/${shared.id}`, { title: 'Sushi Nakamura' }));
  expect(s1.score.canManage).toBe(false);
  const carlRating = (await carl.json(carl.put(`/api/scores/${shared.id}/ratings/me`, { value: 6 }))).rating;
  expect(carlRating).toMatchObject({ personName: 'Carl', value: 6, isMe: true, userId: carl.id });
  await carl.json(carl.put(`/api/scores/${shared.id}/ratings/me`, { value: 9 }));
  expect((await ana.patch(`/api/scores/${shared.id}/ratings/${carlRating.id}`, { value: 1 })).status()).toBe(403);
  expect((await ana.patch(`/api/scores/${shared.id}/ratings/${carlRating.id}`, { personName: 'X' })).status()).toBe(403);
  expect((await ana.del(`/api/scores/${shared.id}/ratings/${carlRating.id}`)).status()).toBe(403);
  const guest = (await ana.json(ana.post(`/api/scores/${shared.id}/ratings`, { personName: 'Mamá', value: 10 }))).rating;
  expect(guest.userId).toBeNull();
  const detail = (await ana.json(ana.get(`/api/scores/${shared.id}`))).score;
  expect(detail.ratings.map((r: { personName: string; value: number }) => `${r.personName}:${r.value}`)).toEqual(['Bea:8', 'Carl:9', 'Mamá:10']);
  expect(detail.canManage).toBe(true); // Ana is admin

  // Delete: author or admin only. Move: same rule, and only into your groups.
  expect((await carl.del(`/api/scores/${shared.id}`)).status()).toBe(403);
  expect((await carl.patch(`/api/scores/${shared.id}`, { groupId: null })).status()).toBe(403);
  expect((await ana.patch(`/api/scores/${personal.id}`, { groupId: '00000000-0000-0000-0000-000000000000' })).status()).toBe(403);
  const moved = await ana.json(ana.patch(`/api/scores/${personal.id}`, { groupId: group.id }));
  expect(moved.score.groupId).toBe(group.id);
  await ana.json(ana.patch(`/api/scores/${personal.id}`, { groupId: null }));
  expect((await bea.get(`/api/scores/${personal.id}`)).status()).toBe(404);

  // Global tag/category delete inside a group: admins only.
  expect((await carl.del(`/api/tags/Caro?space=${group.id}`)).status()).toBe(403);
  expect((await ana.del(`/api/tags/Caro?space=${group.id}`)).status()).toBe(204);
  expect((await bea.json(bea.get(`/api/tags?space=${group.id}`))).tags).toEqual([]);

  // Roles: members can't manage; the last admin can't vanish.
  expect((await bea.del(`/api/groups/${group.id}/members/${carl.id}`)).status()).toBe(403);
  expect((await bea.patch(`/api/groups/${group.id}`, { name: 'X' })).status()).toBe(403);

  // Carl leaves: his note scores stay, marked as a former member, and he loses access.
  expect((await carl.post(`/api/groups/${group.id}/leave`)).status()).toBe(204);
  expect((await carl.get(`/api/scores/${shared.id}`)).status()).toBe(404);
  const after = (await bea.json(bea.get(`/api/scores/${shared.id}`))).score;
  expect(after.ratings.find((r: { personName: string }) => r.personName === 'Carl')).toMatchObject({ value: 9, formerMember: true });

  // Ana (only admin) leaves: Bea becomes admin.
  expect((await ana.post(`/api/groups/${group.id}/leave`)).status()).toBe(204);
  expect((await bea.json(bea.get('/api/groups'))).groups[0].role).toBe('admin');

  // Deleting a group needs a choice for its notes.
  expect((await bea.del(`/api/groups/${group.id}`)).status()).toBe(400);
  expect((await bea.del(`/api/groups/${group.id}?notas=devolver`)).status()).toBe(204);
  // Notes go back to their authors as personal.
  expect((await bea.json(bea.get(`/api/scores/${shared.id}`))).score.groupId).toBeNull();
  expect((await ana.get(`/api/scores/${shared.id}`)).status()).toBe(404);

  // A second group, deleted along with its notes.
  const g2 = (await bea.json(bea.post('/api/groups', { name: 'Borrable' }))).group;
  const n2 = (await bea.json(bea.post('/api/scores', { title: 'Se va', ownerValue: 3, groupId: g2.id }))).score;
  expect((await bea.del(`/api/groups/${g2.id}?notas=borrar`)).status()).toBe(204);
  expect((await bea.get(`/api/scores/${n2.id}`)).status()).toBe(404);

  // A revoked invitation no longer works.
  const g3 = (await ana.json(ana.post('/api/groups', { name: 'Tres' }))).group;
  const inv3 = (await ana.json(ana.post(`/api/groups/${g3.id}/invites`))).invite;
  expect((await ana.json(ana.get(`/api/groups/${g3.id}/invites`))).invites).toHaveLength(1);
  expect((await ana.del(`/api/groups/${g3.id}/invites/${inv3.id}`)).status()).toBe(204);
  expect((await bea.post(`/api/invites/${inv3.token}/accept`)).status()).toBe(404);
});
