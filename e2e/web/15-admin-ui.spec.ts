import type { Page } from '@playwright/test';
import { test, expect, ADMIN_EMAIL, signedInViaApi, uniqueEmail } from './fixtures';

// The Administración screen, on the phone (Chromium and iPhone WebKit).

async function signedInAsAdmin(page: Page) {
  const data = { email: ADMIN_EMAIL, password: 'secret123', name: 'Admin' };
  let r = await page.request.post('/api/auth/register', { data });
  if (r.status() === 409) r = await page.request.post('/api/auth/login', { data });
  expect(r.ok()).toBeTruthy();
  const { token } = await r.json();
  await page.addInitScript((t) => {
    if (!sessionStorage.getItem('e2e-token-set')) {
      localStorage.setItem('puntuaciones_token', t);
      sessionStorage.setItem('e2e-token-set', '1');
    }
  }, token);
  return token as string;
}

async function openAdmin(page: Page) {
  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Administración').click();
  await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible();
}

test('sin permisos no hay Administración', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await expect(page.getByText('Ajustes')).toBeVisible();
  await expect(page.getByText('Administración')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('admin: datos, permisos, contraseña, desactivar y borrar una cuenta', async ({ page }) => {
  test.setTimeout(90_000);
  await signedInAsAdmin(page);
  const email = uniqueEmail();
  const reg = await page.request.post('/api/auth/register', { data: { email, password: 'secret123', name: 'Víctima' } });
  const { token } = await reg.json();
  await page.request.post('/api/scores', { headers: { Authorization: `Bearer ${token}` }, data: { title: 'Nota de Víctima', ownerValue: 6 } });

  await openAdmin(page);
  await expect(page.locator('.admin-stat-label', { hasText: 'Usuarios' })).toBeVisible();
  await expect(page.locator('.admin-stat-label', { hasText: 'Base de datos' })).toBeVisible();
  await expect(page.locator('.admin-info-row', { hasText: 'ADMIN_EMAIL' })).toContainText(ADMIN_EMAIL);
  await expect(page.locator('.admin-info-row', { hasText: 'Dirección externa' })).toContainText('https://puntuaciones.example');

  // Your own row (also the ADMIN_EMAIL one) has no actions.
  const mine = page.getByRole('button', { name: `Admin, ${ADMIN_EMAIL}` });
  await expect(mine).toBeDisabled();
  await expect(mine).toContainText('(tú)');

  const row = page.getByRole('button', { name: `Víctima, ${email}` });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toContainText('1 nota');

  // Make admin.
  await row.click();
  await page.getByRole('button', { name: 'Hacer admin' }).click();
  await expect(row.locator('.groups-role')).toHaveText('Admin');

  // Temporary password, shown once.
  await row.click();
  await expect(page.getByRole('button', { name: 'Quitar admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  const password = await page.getByRole('textbox', { name: 'Contraseña temporal' }).inputValue();
  expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  await page.getByRole('button', { name: 'Hecho' }).click();
  const login = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(login.ok()).toBeTruthy();

  // Disable, then delete (typing the email to confirm).
  await row.click();
  await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
  await expect(row.locator('.admin-badge', { hasText: 'Desactivada' })).toBeVisible();
  await row.click();
  await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
  const confirm = page.getByRole('button', { name: 'Eliminar', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Escribe su email para confirmar').fill(email);
  await confirm.click();
  await expect(row).toHaveCount(0);
});

test('admin: cerrar el registro y volver al valor del servidor', async ({ page }) => {
  const token = await signedInAsAdmin(page);
  try {
    await openAdmin(page);
    const sw = page.getByRole('switch', { name: 'Registro abierto' });
    await expect(sw).toBeChecked();
    await expect(page.getByText('Sigue el valor del servidor (ALLOW_REGISTRATION).', { exact: false })).toBeVisible();
    await sw.click();
    await expect(sw).not.toBeChecked();
    await expect(page.getByText('Cambiado desde el panel', { exact: false })).toBeVisible();
    expect((await (await page.request.get('/api/config')).json()).allowRegistration).toBe(false);

    await page.getByRole('button', { name: 'Volver al valor del servidor' }).click();
    await expect(sw).toBeChecked();
    await expect(page.getByRole('button', { name: 'Volver al valor del servidor' })).toHaveCount(0);
  } finally {
    await page.request.put('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` }, data: { allowRegistration: null } });
  }
});
