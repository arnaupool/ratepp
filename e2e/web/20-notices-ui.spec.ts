import crypto from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, signedInViaApi, uniqueEmail } from './fixtures';

// Asking group members for their score, in the app (docs/avisos.md).

const STUB = 'http://localhost:4199';

/** Ana, with a group Bea (the signed-in page) belongs to. */
async function anaWithGroup(request: APIRequestContext, beaEmail: string) {
  const reg = await (await request.post('/api/auth/register', { data: { email: uniqueEmail(), password: 'secret123', name: 'Ana' } })).json();
  const headers = { Authorization: `Bearer ${reg.token}` };
  const { group } = await (await request.post('/api/groups', { headers, data: { name: 'Cenas' } })).json();
  await request.post(`/api/groups/${group.id}/members`, { headers, data: { email: beaEmail } });
  const note = async (title: string) => {
    const r = await request.post('/api/scores', { headers, data: { title, ownerValue: 8, groupId: group.id } });
    expect(r.ok()).toBeTruthy();
  };
  return { note };
}

test('Principal y Detalle: notas sin tu puntuación, puntuar y "No la he probado"', async ({ page }) => {
  const { email } = await signedInViaApi(page);
  const ana = await anaWithGroup(page.request, email);
  await ana.note('Bar Manolo');
  await ana.note('Casa Pepe');

  await page.goto('/');
  const notice = page.getByRole('button', { name: /2 notas de tus grupos esperan tu puntuación/ });
  await expect(notice).toBeVisible();
  await expect(page.getByLabel('Ver Casa Pepe')).toContainText('Falta tu nota');

  // The notice filters to them; "Ver todas" goes back.
  await notice.click();
  await expect(page.getByRole('button', { name: /Sin tu puntuación/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.score-card')).toHaveCount(2);
  await page.getByRole('button', { name: /Sin tu puntuación/ }).click();
  await expect(notice).toBeVisible();

  // "No la he probado" takes one out, and can be undone.
  await page.getByLabel('Ver Casa Pepe').click();
  await page.getByRole('button', { name: 'No la he probado' }).click();
  const undo = page.getByRole('button', { name: 'Deshacer «No la he probado»' });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(page.getByRole('button', { name: 'No la he probado' })).toBeVisible();
  await page.getByRole('button', { name: 'No la he probado' }).click();
  await expect(undo).toBeVisible();
  await page.getByLabel('Volver').click();
  await expect(page.getByRole('button', { name: /1 nota de tus grupos espera tu puntuación/ })).toBeVisible();
  await expect(page.getByLabel('Ver Casa Pepe')).not.toContainText('Falta tu nota');

  // Scoring the other one clears the notice.
  await page.getByLabel('Ver Bar Manolo').click();
  await page.getByRole('button', { name: 'Puntuar' }).click();
  await page.getByRole('radio', { name: '8', exact: true }).click();
  await expect(page.getByRole('button', { name: 'No la he probado' })).toHaveCount(0);
  await page.getByLabel('Volver').click();
  await expect(page.getByLabel('Ver Bar Manolo')).toBeVisible();
  await expect(page.getByRole('button', { name: /esperan? tu puntuación/ })).toHaveCount(0);
});

test.describe(() => {
  // Push needs the service worker, blocked in the other specs.
  test.use({ serviceWorkers: 'allow' });

  test('Ajustes: activar y desactivar las notificaciones', async ({ page, browserName }) => {
    const { email } = await signedInViaApi(page);
    if (browserName === 'webkit') {
      // The iPhone profile: Safari only offers push to the installed app.
      await page.goto('/ajustes');
      await expect(page.getByText('añade la app a la pantalla de inicio')).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Notificaciones' })).toBeDisabled();
      return;
    }

    // Chromium has no real push service here (and headless always reports
    // notifications as blocked): the permission is asked and granted, and
    // PushManager hands out a subscription pointing at the stub, which counts
    // what the server sends.
    const id = crypto.randomUUID();
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    const sub = {
      endpoint: `${STUB}/push/${id}`,
      keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') },
    };
    await page.addInitScript((json) => {
      let current: unknown = null;
      let permission: NotificationPermission = 'default';
      Object.defineProperty(Notification, 'permission', { get: () => permission });
      Notification.requestPermission = async () => (permission = 'granted');
      const make = () => ({ endpoint: json.endpoint, toJSON: () => json, unsubscribe: async () => ((current = null), true) });
      PushManager.prototype.getSubscription = async () => current as PushSubscription | null;
      PushManager.prototype.subscribe = async () => (current = make()) as unknown as PushSubscription;
    }, sub);
    const pushes = async () => (await (await page.request.get(`${STUB}/_pushes/${id}`)).json()).count as number;
    const ana = await anaWithGroup(page.request, email);

    await page.goto('/ajustes');
    const toggle = page.getByRole('switch', { name: 'Notificaciones' });
    await expect(page.getByText('Te avisa cuando alguien crea una nota en uno de tus grupos.')).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
    await ana.note('Lisboa');
    await expect.poll(pushes).toBe(1);

    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await ana.note('Oporto');
    await new Promise((r) => setTimeout(r, 500));
    expect(await pushes()).toBe(1);
  });
});
