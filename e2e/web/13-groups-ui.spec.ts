import type { Browser, Page } from '@playwright/test';
import { test, expect, signedInViaApi, uniqueEmail } from './fixtures';
import { PNG_BASE64 } from './seed';

// Two people, two browsers: Ana creates a group and invites Bea with a
// link; Bea opens it signed out, registers, joins, and they share notes.
async function secondBrowser(browser: Browser, baseURL: string) {
  const { use } = test.info().project;
  const ctx = await browser.newContext({ ...(use as object), baseURL });
  await ctx.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: Buffer.from(PNG_BASE64, 'base64') }));
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}

async function openMenuItem(page: Page, label: string) {
  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText(label, { exact: false }).click();
}

test('grupo compartido entre dos personas, de la invitación a borrar el grupo', async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const { token } = await signedInViaApi(page);

  // Ana: a personal note, then a group.
  await page.request.post('/api/scores', { headers: { Authorization: `Bearer ${token}` }, data: { title: 'Solo de Ana', ownerValue: 6 } });
  await openMenuItem(page, 'Grupos');
  await expect(page.getByText('Todavía no estás en ningún grupo.')).toBeVisible();
  await page.getByLabel('Nombre del grupo nuevo').fill('Pareja');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pareja' })).toBeVisible();
  await expect(page.locator('.groups-role')).toHaveText('Admin');
  await page.getByRole('button', { name: 'Crear enlace de invitación' }).click();
  const link = await page.getByLabel('Enlace de invitación').inputValue();
  // The external address (PUBLIC_URL), not the one this browser used.
  expect(link.startsWith('https://puntuaciones.example/unirse/')).toBeTruthy();
  expect(link).toMatch(/\/unirse\/[\w-]{20,}$/);
  await expect(page.getByText('Enlace activo')).toBeVisible();

  // Bea opens the link signed out: login, register, back to the invitation.
  const bea = await secondBrowser(browser, baseURL!);
  await bea.page.goto(new URL(link).pathname);
  await expect(bea.page.getByText('Bienvenido de nuevo')).toBeVisible();
  await bea.page.getByText('Regístrate').click();
  await bea.page.getByPlaceholder('tucorreo@email.com').fill(uniqueEmail());
  await bea.page.getByPlaceholder('••••••••').nth(0).fill('secret123');
  await bea.page.getByPlaceholder('••••••••').nth(1).fill('secret123');
  await bea.page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(bea.page.getByText('Te han invitado a 👥 Pareja')).toBeVisible();
  await bea.page.getByRole('button', { name: 'Unirme al grupo' }).click();
  await expect(bea.page.getByRole('heading', { name: 'Pareja' })).toBeVisible();
  await expect(bea.page.locator('.groups-member')).toHaveCount(2);
  // Members don't get admin controls.
  await expect(bea.page.getByRole('button', { name: 'Crear enlace de invitación' })).toHaveCount(0);
  await expect(bea.page.getByRole('button', { name: 'Borrar grupo' })).toHaveCount(0);

  // Bea creates a note in the group (and doesn't see Ana's personal one).
  await bea.page.goto('/');
  await expect(bea.page.getByLabel('Ver Solo de Ana')).toHaveCount(0);
  await bea.page.getByLabel('Crear puntuación').click();
  await bea.page.getByPlaceholder('Título *').fill('Sushi Nakamura');
  await bea.page.getByRole('group', { name: 'Dónde' }).getByRole('button', { name: '👥 Pareja' }).click();
  await bea.page.locator('.create-body > .editor-section').nth(3).getByRole('radio', { name: '8' }).click();
  await bea.page.getByPlaceholder('Escribe y pulsa enter para añadir...').fill('Japonés');
  await bea.page.keyboard.press('Enter');
  await bea.page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(bea.page.getByText('👥 Pareja · creada por ti')).toBeVisible();

  // Ana sees it under "Todo" with the group badge, scores it with her account.
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Espacio' })).toBeVisible();
  const card = page.getByLabel('Ver Sushi Nakamura');
  await expect(card.locator('.group-badge')).toHaveText('👥 Pareja');
  await page.getByRole('group', { name: 'Espacio' }).getByRole('button', { name: 'Solo yo' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByLabel('Ver Solo de Ana')).toBeVisible();
  await page.getByRole('group', { name: 'Espacio' }).getByRole('button', { name: '👥 Pareja' }).click();
  await expect(page.getByRole('button', { name: 'Japonés', exact: true })).toBeVisible();
  await card.click();
  await expect(page.getByText(/👥 Pareja · creada por /)).toBeVisible();
  await page.getByRole('button', { name: 'Puntuar' }).click();
  await page.locator('.detail-rate-pills').getByRole('radio', { name: '9' }).click();
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('9');
  await expect(page.locator('.detail-person-name').first()).not.toHaveText('');
  // Ana is admin: she may delete it; the author too.
  await expect(page.getByLabel('Eliminar puntuación')).toBeVisible();

  // Bea sees Ana's score under Miembros; she can't change it.
  await bea.page.reload();
  await expect(bea.page.getByText('Miembros')).toBeVisible();
  await expect(bea.page.locator('.detail-person .score-badge')).toHaveText(['9']);

  // Shared labels: the group's section in Categorías y etiquetas (admin can delete).
  await openMenuItem(page, 'Categorías y etiquetas');
  await expect(page.getByRole('heading', { name: '👥 Pareja' })).toBeVisible();
  await expect(page.getByLabel('Eliminar categoría Japonés de Pareja')).toBeVisible();
  await openMenuItem(bea.page, 'Categorías y etiquetas');
  await expect(bea.page.getByText('Solo un admin del grupo puede borrarlas.')).toBeVisible();
  await expect(bea.page.getByLabel(/Eliminar categoría Japonés/)).toHaveCount(0);

  // The map uses the same space selector.
  await openMenuItem(page, 'Mapa de ubicaciones');
  await expect(page.getByRole('group', { name: 'Espacio' })).toBeVisible();

  // Bea leaves: her note stays in the group, her score shows as a former member.
  await openMenuItem(bea.page, 'Grupos');
  await bea.page.getByLabel('Abrir grupo Pareja').click();
  await bea.page.getByRole('button', { name: 'Salir del grupo' }).click();
  await bea.page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(bea.page.getByText('Todavía no estás en ningún grupo.')).toBeVisible();
  await page.goto('/');
  await page.getByLabel('Ver Sushi Nakamura').click();
  await expect(page.getByText('ex miembro')).toBeVisible();

  // Ana deletes the group giving the notes back to their authors.
  await openMenuItem(page, 'Grupos');
  await page.getByLabel('Abrir grupo Pareja').click();
  await page.getByRole('button', { name: 'Borrar grupo' }).click();
  await page.getByRole('button', { name: 'Devolver las notas a sus autores' }).click();
  await expect(page.getByText('Todavía no estás en ningún grupo.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByLabel('Ver Sushi Nakamura')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Espacio' })).toHaveCount(0);
  await bea.page.goto('/');
  await expect(bea.page.getByLabel('Ver Sushi Nakamura')).toBeVisible();

  expect(bea.errors.filter((e) => !/status of 40[134]/.test(e))).toEqual([]);
  await bea.ctx.close();
});
