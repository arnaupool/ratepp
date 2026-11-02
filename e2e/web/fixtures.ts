import { test as base, expect, type Page } from '@playwright/test';
import { PNG_BASE64 } from './seed';

// Every test fails on any console error or uncaught page error, like the
// original suite did. A test that provokes network failures on purpose
// clears the list itself.
export const test = base.extend<{ consoleErrors: string[]; offlineTiles: void }>({
  // Map tiles come from a stub image: no dependency on OpenStreetMap.
  offlineTiles: [
    async ({ page }, use) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.fulfill({ contentType: 'image/png', body: Buffer.from(PNG_BASE64, 'base64') })
      );
      await use();
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
      await use(errors);
      expect(errors, 'errores de consola').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

let seq = 0;
export function uniqueEmail() {
  return `e2e-${Date.now()}-${++seq}@test.com`;
}

export async function registerViaUi(page: Page, email = uniqueEmail(), password = 'secret123') {
  await page.goto('/');
  await page.getByText('Bienvenido de nuevo').waitFor();
  await page.getByText('Regístrate').click();
  await page.getByText('Crea tu cuenta').waitFor();
  await page.getByPlaceholder('tucorreo@email.com').fill(email);
  const pw = page.getByPlaceholder('••••••••');
  await pw.nth(0).fill(password);
  await pw.nth(1).fill(password);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByText('Tus puntuaciones').waitFor();
  return { email, password };
}

/** Registers through the API (faster) and stores the token before the app loads. */
export async function signedInViaApi(page: Page) {
  const email = uniqueEmail();
  const res = await page.request.post('/api/auth/register', {
    data: { email, password: 'secret123', name: email.split('@')[0] },
  });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  await page.addInitScript((t) => {
    if (!sessionStorage.getItem('e2e-token-set')) {
      localStorage.setItem('puntuaciones_token', t);
      sessionStorage.setItem('e2e-token-set', '1');
    }
  }, token);
  return { email, token: token as string };
}
