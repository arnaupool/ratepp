import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

test.use({ permissions: ['geolocation'], geolocation: { latitude: 39.4747, longitude: -0.3764 } });

test('elegir ubicación por búsqueda, por toque y por "mi ubicación"', async ({ page }) => {
  const tileReferers: Promise<string | null>[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://tile.openstreetmap.org/')) tileReferers.push(r.headerValue('referer'));
  });
  await signedInViaApi(page);
  await page.goto('/nueva');
  await page.getByPlaceholder('Título *').fill('Casa Pepa');
  await page.locator('.create-body > .editor-section').nth(2).getByRole('radio', { name: '9' }).click();
  await page.locator('.quick-chip', { hasText: 'Ubicación' }).click();
  await page.getByRole('button', { name: '📍 Elegir ubicación en el mapa' }).click();
  await expect(page.getByRole('heading', { name: 'Elegir ubicación' })).toBeVisible();
  await expect(page.locator('.location-map .leaflet-container')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar ubicación' })).toBeDisabled();
  await expect(page.locator('.location-map')).toContainText('© OpenStreetMap contributors');
  // OpenStreetMap blocks browser apps whose tile requests carry no Referer.
  await expect.poll(() => tileReferers.length).toBeGreaterThan(0);
  expect(await Promise.all(tileReferers)).toContain(new URL(page.url()).origin + '/');

  // 1. Search: the typed text becomes the label.
  await page.getByPlaceholder('Buscar dirección...').fill('Calle Mayor 12, Madrid');
  await page.getByLabel('Buscar dirección', { exact: true }).click();
  await expect(page.locator('.location-label')).toHaveText('Calle Mayor 12, Madrid');
  await expect(page.locator('.location-map .map-pin')).toHaveCount(1);

  // 2. Tap on the map: reverse geocoding gives the label.
  const box = (await page.locator('.location-map').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
  await expect(page.locator('.location-label')).toHaveText('Carrer de Colón 1, València, Comunitat Valenciana');

  // A drag pans the map but never moves the pin (no new reverse lookup).
  let reverseCalls = 0;
  page.on('request', (r) => {
    if (r.url().includes('/api/geo/reverse')) reverseCalls++;
  });
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(reverseCalls).toBe(0);

  // 3. Device position (needs a secure context; localhost counts).
  await page.getByRole('button', { name: '📍 Usar mi ubicación actual' }).click();
  await expect.poll(() => reverseCalls).toBe(1);
  await expect(page.locator('.location-label')).toHaveText('Carrer de Colón 1, València, Comunitat Valenciana');

  await page.getByRole('button', { name: 'Confirmar ubicación' }).click();
  await expect(page.locator('.field-row .map-preview-label')).toHaveText('Carrer de Colón 1, València, Comunitat Valenciana');
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();

  // Detalle: mini map, label and navigation button with the device position.
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await expect(page.locator('.detail-field .leaflet-container')).toBeVisible();
  await expect(page.getByLabel('Abrir navegación')).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=39.4747,-0.3764');

  // The backend identified itself to the geocoder.
  const ua = await (await page.request.get('http://localhost:4199/_last-user-agent')).json();
  expect(ua.userAgent).toMatch(/^Puntuaciones\//);
});

test('Mapa de ubicaciones: chincheta, globo y Detalle', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const s1 = await seed.score({
    title: 'Casa Pepa',
    ownerValue: 9,
    ratings: [{ personName: 'Ana', value: 8 }],
    fields: [{ type: 'location', label: 'Ubicación', value: { label: 'Calle Mayor 12, Madrid', lat: 40.4155, lng: -3.7074 } }],
  });
  await seed.score({
    title: 'Horchatería',
    ownerValue: 10,
    fields: [{ type: 'location', label: 'Ubicación', value: { label: 'València', lat: 39.4699, lng: -0.3763 } }],
  });

  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Mapa de ubicaciones').click();
  await expect(page.getByRole('heading', { name: 'Mapa de ubicaciones' })).toBeVisible();
  const pins = page.locator('.locations-map .map-pin-icon');
  await expect(pins).toHaveCount(2);
  // Both pins fit in view.
  for (const pin of await pins.all()) await expect(pin).toBeInViewport();

  await page.locator('.locations-map .map-pin-icon[title="Casa Pepa"]').click();
  const callout = page.getByLabel('Abrir Casa Pepa');
  await expect(callout).toBeVisible();
  await expect(callout).toContainText('Calle Mayor 12, Madrid');
  await expect(callout.locator('.score-badge')).toHaveText('8.5');
  await callout.click();
  await expect(page).toHaveURL(new RegExp(`/p/${s1.id}$`));
});

test('Mapa de ubicaciones vacío: centrado en València con aviso', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/mapa');
  await expect(page.getByText('Todavía no has guardado ninguna ubicación en tus puntuaciones.')).toBeVisible();
  await expect(page.locator('.locations-map')).toBeVisible();
});

test('los endpoints de geocodificación exigen sesión', async ({ request }) => {
  expect((await request.get('/api/geo/search?q=Madrid')).status()).toBe(401);
  expect((await request.get('/api/geo/reverse?lat=1&lng=1')).status()).toBe(401);
});
