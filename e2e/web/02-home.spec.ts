import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

test('Principal: estado vacío, FAB y menú', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/');
  await expect(page.getByText('Todavía no hay puntuaciones')).toBeVisible();
  await expect(page.getByText('Toca el botón + para puntuar tu primer restaurante, peli o recuerdo.')).toBeVisible();
  await page.getByLabel('Crear puntuación').click();
  await expect(page).toHaveURL(/\/nueva$/);
});

test('Principal: rejilla, badges, búsqueda, categorías y filtros', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const photo = await seed.upload();
  // Created oldest first: the grid lists the newest first.
  await seed.score({
    title: 'Casa Pepa',
    ownerValue: 9,
    categories: ['Restaurantes'],
    photoUrls: [photo],
    fields: [
      { type: 'tag', label: 'Etiqueta', value: ['Mediterránea'] },
      { type: 'date', label: 'Fecha', value: '2026-06-14' },
      { type: 'list', label: 'Platos', value: ['Croquetas de jamón'] },
    ],
  });
  await seed.score({
    title: 'Dune: Part Two',
    ownerValue: 8,
    categories: ['Películas'],
    ratings: [
      { personName: 'Ana', value: 7 },
      { personName: 'Luis', value: 10 },
    ],
  });
  await seed.score({ title: 'Viaje a Lisboa', ownerValue: 10, categories: ['Recuerdos'], cardColor: '#bcd4f0' });

  await page.goto('/');
  const cards = page.locator('.score-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Viaje a Lisboa');
  await expect(cards.nth(2)).toContainText('Casa Pepa');

  // Stacked badges: two minis plus "+1".
  const dune = page.getByLabel('Ver Dune: Part Two');
  await expect(dune.locator('.score-badge.mini')).toHaveCount(3);
  await expect(dune.getByText('+1', { exact: true })).toBeVisible();

  // Custom card color: the title switches to dark ink for the light pastel.
  const lisboa = page.getByLabel('Ver Viaje a Lisboa');
  await expect(lisboa).toHaveCSS('background-color', 'rgb(188, 212, 240)');
  await expect(lisboa.locator('.score-card-title')).toHaveCSS('color', 'rgb(36, 31, 26)');

  // Cover photo comes from the thumbnail endpoint with a same-origin URL.
  const img = page.getByLabel('Ver Casa Pepa').locator('img');
  await expect(img).toHaveAttribute('src', /^\/api\/thumb\?path=%2Fuploads%2F/);
  // (naturalWidth is useless here: a 4 px test image with a 400w/800w srcset
  // rounds down to 0, so check the bytes that were actually fetched.)
  const thumb = await page.request.get(await img.evaluate((el: HTMLImageElement) => el.currentSrc || el.src));
  expect(thumb.status()).toBe(200);
  expect(thumb.headers()['content-type']).toBe('image/jpeg');

  // Category chips: fixed height, clear gap above the grid.
  const chip = page.getByRole('button', { name: 'Películas', exact: true });
  await expect(chip).toHaveCSS('height', '32px');
  const chipBox = (await page.locator('.home-chips').boundingBox())!;
  const gridBox = (await page.locator('.home-grid').boundingBox())!;
  expect(gridBox.y - (chipBox.y + chipBox.height)).toBeGreaterThanOrEqual(13.5);

  await chip.click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Dune');
  await page.getByRole('button', { name: 'Todas', exact: true }).click();
  await expect(cards).toHaveCount(3);

  // Server-side search, including text inside fields.
  const search = page.getByPlaceholder('Buscar por título, texto, fecha, categoría o etiqueta...');
  await search.fill('croquetas');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Casa Pepa');
  await search.fill('nada-coincide');
  await expect(page.getByText('No hay notas')).toBeVisible();
  await expect(page.getByText('Toca el botón + para crear una.')).toBeVisible();
  await page.getByLabel('Borrar búsqueda').click();
  await expect(cards).toHaveCount(3);

  // Filters sheet: tag filter.
  await page.getByLabel('Filtros de fecha y etiqueta').click();
  await expect(page.getByRole('heading', { name: 'Filtros' })).toBeVisible();
  await page.getByRole('button', { name: 'Mediterránea' }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.home-filters-dot')).toHaveText('1');

  // Date range through the sliding date picker.
  await page.getByLabel('Filtros de fecha y etiqueta').click();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.getByLabel('Fecha Desde').click();
  await expect(page.getByRole('heading', { name: 'Elegir fecha — Desde' })).toBeVisible();
  await page.getByLabel('Mes', { exact: true }).selectOption({ label: 'junio' });
  await page.getByLabel('Año', { exact: true }).selectOption('2026');
  await page.getByRole('button', { name: '1 de junio de 2026', exact: true }).click();
  await page.getByRole('button', { name: 'Listo' }).last().click();
  await expect(page.getByRole('heading', { name: 'Elegir fecha — Desde' })).toHaveCount(0);
  await expect(page.getByLabel('Fecha Desde')).toHaveText('1 de junio de 2026');
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Casa Pepa');

  // Filters survive a trip to another screen and back.
  await page.getByLabel('Crear puntuación').click();
  await page.goBack();
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Filtros de fecha y etiqueta').click();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(cards).toHaveCount(3);

  // Tapping a card opens its Detalle route.
  await page.getByLabel('Ver Casa Pepa').click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
});

test('miniaturas: solo archivos de /uploads', async ({ request }) => {
  const bad = await request.get('/api/thumb?path=/uploads/..%2F..%2Fpackage.json&w=400');
  expect(bad.status()).toBe(400);
  const outside = await request.get('/api/thumb?path=/etc/passwd');
  expect(outside.status()).toBe(400);
  const missing = await request.get('/api/thumb?path=/uploads/00000000-0000-0000-0000-000000000000.jpg');
  expect(missing.status()).toBe(404);
});
