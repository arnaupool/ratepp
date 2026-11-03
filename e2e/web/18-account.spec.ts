import { test, expect, ADMIN_EMAIL, signedInViaApi, uniqueEmail, registerViaUi } from './fixtures';

// Your own account from Ajustes (docs/cuenta.md).

test('cuenta por API: nombre, contraseña, email, sesiones y borrar', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', 'API only');
  const email = uniqueEmail();
  const reg = await (await request.post('/api/auth/register', { data: { email, password: 'secret123', name: 'Ana' } })).json();
  let token: string = reg.token;
  const h = () => ({ Authorization: `Bearer ${token}` });

  // Name.
  const renamed = await request.patch('/api/auth/me', { headers: h(), data: { name: '  Ana María ' } });
  expect((await renamed.json()).user.name).toBe('Ana María');
  expect((await request.patch('/api/auth/me', { headers: h(), data: { name: ' ' } })).status()).toBe(400);

  // Password: a wrong current one is 403 (never 401, which signs the app out).
  const wrong = await request.put('/api/auth/me/password', { headers: h(), data: { currentPassword: 'nope', newPassword: 'nueva123' } });
  expect(wrong.status()).toBe(403);
  expect((await request.put('/api/auth/me/password', { headers: h(), data: { currentPassword: 'secret123', newPassword: '123' } })).status()).toBe(400);
  const old = token;
  const changed = await request.put('/api/auth/me/password', { headers: h(), data: { currentPassword: 'secret123', newPassword: 'nueva123' } });
  token = (await changed.json()).token;
  expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${old}` } })).status()).toBe(401);
  expect((await request.get('/api/auth/me', { headers: h() })).ok()).toBeTruthy();
  expect((await request.post('/api/auth/login', { data: { email, password: 'nueva123' } })).ok()).toBeTruthy();

  // Email: needs the password, must be free.
  const other = uniqueEmail();
  await request.post('/api/auth/register', { data: { email: other, password: 'secret123', name: 'Otra' } });
  expect((await request.put('/api/auth/me/email', { headers: h(), data: { email: other, password: 'nueva123' } })).status()).toBe(409);
  expect((await request.put('/api/auth/me/email', { headers: h(), data: { email: 'x@y.z', password: 'mal' } })).status()).toBe(403);
  const newEmail = uniqueEmail();
  const moved = await request.put('/api/auth/me/email', { headers: h(), data: { email: newEmail.toUpperCase(), password: 'nueva123' } });
  expect((await moved.json()).user.email).toBe(newEmail);
  expect((await request.post('/api/auth/login', { data: { email: newEmail, password: 'nueva123' } })).ok()).toBeTruthy();

  // Other sessions: closed, this one keeps working with the new token.
  const elsewhere = (await (await request.post('/api/auth/login', { data: { email: newEmail, password: 'nueva123' } })).json()).token;
  token = (await (await request.post('/api/auth/me/logout-others', { headers: h() })).json()).token;
  expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${elsewhere}` } })).status()).toBe(401);
  expect((await request.get('/api/auth/me', { headers: h() })).ok()).toBeTruthy();

  // Delete: needs the password.
  expect((await request.delete('/api/auth/me', { headers: h(), data: { password: 'mal' } })).status()).toBe(403);
  expect((await request.delete('/api/auth/me', { headers: h(), data: { password: 'nueva123' } })).status()).toBe(204);
  expect((await request.get('/api/auth/me', { headers: h() })).status()).toBe(401);
  expect((await request.post('/api/auth/login', { data: { email: newEmail, password: 'nueva123' } })).status()).toBe(401);
});

test('la cuenta de ADMIN_EMAIL no cambia su email ni se borra desde Ajustes', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', 'API only');
  const data = { email: ADMIN_EMAIL, password: 'secret123', name: 'Admin' };
  let r = await request.post('/api/auth/register', { data });
  if (r.status() === 409) r = await request.post('/api/auth/login', { data });
  const { token, user } = await r.json();
  expect(user.isProtected).toBe(true);
  const h = { Authorization: `Bearer ${token}` };
  expect((await request.put('/api/auth/me/email', { headers: h, data: { email: uniqueEmail(), password: 'secret123' } })).status()).toBe(403);
  expect((await request.delete('/api/auth/me', { headers: h, data: { password: 'secret123' } })).status()).toBe(403);
});

test('Ajustes: cambiar nombre y contraseña, y borrar la cuenta', async ({ page, consoleErrors }) => {
  const { email, password } = await registerViaUi(page);
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Ajustes').click();
  await expect(page.getByText('Dirección externa')).toHaveCount(0);

  // Name: saved on leaving the field, shown in the side menu.
  await page.getByLabel('Nombre', { exact: true }).fill('Ana Nueva');
  await page.getByLabel('Nombre', { exact: true }).press('Enter');
  await expect(page.getByText('Nombre guardado')).toBeVisible();

  // Password: a wrong current one shows the error and keeps you signed in.
  await page.locator('.settings-row', { hasText: 'Contraseña' }).getByRole('button', { name: 'Cambiar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Cambiar contraseña' });
  await sheet.getByLabel('Contraseña actual').fill('incorrecta');
  await sheet.getByLabel('Contraseña nueva', { exact: true }).fill('nueva123');
  await sheet.getByLabel('Repite la contraseña nueva').fill('nueva123');
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(sheet.getByText('La contraseña no es correcta')).toBeVisible();
  // The browser logs that 403 itself; it's the expected outcome.
  consoleErrors.length = 0;
  await sheet.getByLabel('Contraseña actual').fill(password);
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Contraseña cambiada')).toBeVisible();
  // Still signed in after a reload (the new token was kept).
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();

  await page.getByLabel('Volver').click();
  await page.getByLabel('Abrir menú').click();
  await expect(page.getByText('Ana Nueva', { exact: true })).toBeVisible();
  await page.getByText('Ajustes').click();

  // Delete the account: back to the login screen, and it can't log in.
  await page.getByRole('button', { name: 'Borrar mi cuenta' }).click();
  const del = page.getByRole('dialog', { name: '¿Borrar tu cuenta?' });
  await del.getByLabel('Contraseña actual').fill('nueva123');
  await del.getByRole('button', { name: 'Borrar cuenta' }).click();
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  expect((await page.request.post('/api/auth/login', { data: { email, password: 'nueva123' } })).status()).toBe(401);
});

test('Ajustes: cerrar sesión en los demás dispositivos', async ({ page, baseURL }) => {
  const { token } = await signedInViaApi(page);
  await page.goto('/ajustes');
  await page.getByRole('button', { name: 'Cerrar sesión en los demás dispositivos' }).click();
  await page.getByRole('button', { name: 'Cerrar sesiones' }).click();
  await expect(page.getByText('Sesiones cerradas en los demás dispositivos')).toBeVisible();
  // The token from before (another device) no longer works; this page does.
  expect((await page.request.get(`${baseURL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
});
