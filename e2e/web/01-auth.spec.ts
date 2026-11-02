import { test, expect, registerViaUi } from './fixtures';

test('registro, sesión persistente, cerrar sesión e iniciar sesión', async ({ page, consoleErrors }) => {
  const { email, password } = await registerViaUi(page);

  // Session survives a reload: straight to Principal.
  await page.reload();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page.getByText('Bienvenido de nuevo')).toHaveCount(0);

  // Side menu shows the name derived from the email, then logs out.
  await page.getByLabel('Abrir menú').click();
  await expect(page.getByText(email.split('@')[0], { exact: true })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByText('Cerrar sesión').click();
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('puntuaciones_token'))).toBeNull();

  // Wrong password shows the server's message as-is.
  await page.getByPlaceholder('tucorreo@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill('wrong-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Credenciales incorrectas')).toBeVisible();
  // The browser logs that 401 response itself; it's the expected outcome.
  consoleErrors.length = 0;

  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('validaciones en cliente del formulario', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Introduce tu email y contraseña')).toBeVisible();

  await page.getByText('Regístrate').click();
  await page.getByPlaceholder('tucorreo@email.com').fill('x@test.com');
  const pw = page.getByPlaceholder('••••••••');
  await pw.nth(0).fill('secret123');
  await pw.nth(1).fill('otra-cosa');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();

  await page.getByText('Inicia sesión').click();
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toHaveCount(1);
});

test('token inválido al arrancar vuelve a Acceder', async ({ page, consoleErrors }) => {
  await page.addInitScript(() => localStorage.setItem('puntuaciones_token', 'not-a-real-token'));
  await page.goto('/');
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('puntuaciones_token'))).toBeNull();
  // The browser logs the 401 response itself.
  consoleErrors.length = 0;
});

test('401 durante la sesión cierra la sesión', async ({ page, consoleErrors }) => {
  await registerViaUi(page);
  // The token gets rejected mid-session (expired, secret rotated...).
  await page.evaluate(() => localStorage.setItem('puntuaciones_token', 'expired'));
  await page.reload();
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  consoleErrors.length = 0;
});

test('sin servidor: mensaje claro y Reintentar', async ({ page, consoleErrors }) => {
  await registerViaUi(page);
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByText('No se puede conectar con el servidor')).toBeVisible();
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  // The aborted requests are logged by the browser itself; expected here.
  consoleErrors.length = 0;
});

test('login sin servidor no se queda colgado', async ({ page, consoleErrors }) => {
  await page.goto('/login');
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.getByPlaceholder('tucorreo@email.com').fill('x@test.com');
  await page.getByPlaceholder('••••••••').fill('secret123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('No se puede conectar con el servidor')).toBeVisible();
  consoleErrors.length = 0;
});

test('modo oscuro desde Ajustes, persistente', async ({ page }) => {
  await registerViaUi(page);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const lightBg = await bg();

  await page.getByLabel('Abrir menú').click();
  await page.getByText('Ajustes').click();
  await expect(page).toHaveURL(/\/ajustes$/);
  const sw = page.getByRole('switch', { name: 'Modo oscuro' });
  await expect(sw).not.toBeChecked();
  await sw.click();
  await expect(sw).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).not.toBe(lightBg);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('switch', { name: 'Modo oscuro' })).toBeChecked();

  await page.getByRole('switch', { name: 'Modo oscuro' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Volver').click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
});

test('ALLOW_REGISTRATION=false oculta Regístrate', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { allowRegistration: false, mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' } })
  );
  await page.goto('/login');
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  await expect(page.getByText('Regístrate')).toHaveCount(0);
});
