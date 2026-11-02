import { test, expect, signedInViaApi } from './fixtures';

test.use({ serviceWorkers: 'allow' });

test('manifest, iconos y metadatos de iOS', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('manifest+json');
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Puntuaciones', short_name: 'Puntuaciones', display: 'standalone', start_url: '/', theme_color: '#fbf4eb' });
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.ok(), icon.src).toBeTruthy();
    expect(r.headers()['content-type']).toBe('image/png');
  }
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBeTruthy();

  await page.goto('/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  // The service worker and index.html are always revalidated so releases arrive.
  expect((await request.get('/sw.js')).headers()['cache-control']).toBe('no-cache');
  expect((await request.get('/')).headers()['cache-control']).toBe('no-cache');
});

test('service worker: shell sin conexión y nunca cachea /api', async ({ page, context, browserName, consoleErrors }) => {
  await signedInViaApi(page);
  await page.goto('/');
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  const hasSW = await page.evaluate(() => 'serviceWorker' in navigator && window.isSecureContext);
  test.skip(!hasSW, `sin service worker en ${browserName} de Playwright`);

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const cached: string[] = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) urls.push(new URL(req.url).pathname);
    }
    return urls;
  });
  expect(cached).toContain('/index.html');
  expect(cached.some((u) => u.startsWith('/api/'))).toBeFalsy();

  // Offline (e.g. away from home without the VPN): the app shell still
  // opens and says the server can't be reached instead of a blank page.
  // Playwright's WebKit on Windows aborts any navigation while offline even
  // with a service worker ("WebKit encountered an internal error"), so this
  // part runs in Chromium; check it by hand on the iPhone.
  if (browserName === 'webkit') return;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('No se puede conectar con el servidor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  consoleErrors.length = 0; // offline fetch failures are logged by the browser
});
