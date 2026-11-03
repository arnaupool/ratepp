import zlib from 'node:zlib';
import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

test('Detalle en lectura: todos los tipos de campo, datos antiguos, visor y eliminar', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const p1 = await seed.upload();
  const p2 = await seed.upload();
  // Uploads now return a relative path. Rows written before (by the Expo app)
  // may still carry absolute URLs with a LAN IP over HTTP if migration 005
  // didn't see them; the web app must still show them from its own origin.
  expect(p2).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
  const legacyUrl = `http://192.168.1.50:4000${p2}`;
  const score = await seed.score({
    title: 'Casa Pepa',
    ownerValue: 9,
    categories: ['Restaurantes', 'Favoritos'],
    photoUrls: [p1, legacyUrl],
    cardColor: '#2a3b4c',
    ratings: [
      { personName: 'Marta', value: 6 },
      { personName: 'Luis', value: 10 },
    ],
    fields: [
      { type: 'text_long', label: 'Notas', value: 'El arroz estaba en su punto.\nRepetiremos.' },
      { type: 'number', label: 'Precio medio', value: '24.50' },
      { type: 'date', label: 'Fecha de la visita', value: '2026-06-14' },
      { type: 'location', label: 'Ubicación', value: { label: 'Calle Mayor 12, Madrid', lat: 40.4155, lng: -3.7074 } },
      { type: 'location', label: 'Sin coordenadas', value: { label: 'Solo texto', lat: null, lng: null } },
      { type: 'gallery', label: 'Galería', value: [p1, legacyUrl] },
      { type: 'photo', label: 'Foto antigua', value: legacyUrl },
      { type: 'list', label: 'Platos', value: ['Paella de marisco', '', 'Croquetas de jamón'] },
      { type: 'tag', label: 'Etiqueta', value: ['Mediterránea', 'Barato'] },
      { type: 'tag', label: 'Etiqueta vieja', value: 'Escalar' },
    ],
  });

  await page.goto('/');
  await page.getByLabel('Ver Casa Pepa').click();
  await expect(page).toHaveURL(new RegExp(`/p/${score.id}$`));

  // Title on a dark custom color switches to light ink; page painted with it.
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toHaveCSS('color', 'rgb(247, 244, 240)');
  await expect(page.locator('html')).toHaveClass(/custom-page-bg/);

  await expect(page.getByText('Restaurantes', { exact: true })).toBeVisible();
  await expect(page.getByText('Tu puntuación')).toBeVisible();
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('9');
  await expect(page.getByText('Marta', { exact: true })).toBeVisible();
  await expect(page.locator('.detail-person .score-badge')).toHaveText(['6', '10']);

  // Every field type renders its value.
  await expect(page.getByText('El arroz estaba en su punto.')).toBeVisible();
  await expect(page.getByText('24.50')).toBeVisible();
  await expect(page.getByText('14 de junio de 2026')).toBeVisible();
  await expect(page.getByText('Calle Mayor 12, Madrid')).toBeVisible();
  await expect(page.getByLabel('Abrir navegación')).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=40.4155,-3.7074');
  await expect(page.getByText('Solo texto')).toBeVisible();
  await expect(page.getByText('— Paella de marisco')).toBeVisible();
  await expect(page.getByText('— Croquetas de jamón')).toBeVisible();
  await expect(page.getByText('—', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mediterránea')).toBeVisible();
  await expect(page.getByText('Escalar')).toBeVisible();
  await expect(page.locator('.detail-field-thumb')).toHaveCount(3);
  // Legacy absolute URLs are rewritten to same-origin paths and load.
  const legacyImgs = page.locator('img[src*="/api/thumb?path=%2Fuploads%2F"]');
  await expect(legacyImgs.first()).toBeVisible();
  for (const src of await page.locator('img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src))) {
    expect(src.startsWith('http://192.168.1.50')).toBeFalsy();
    const res = await page.request.get(src);
    expect(res.ok(), src).toBeTruthy();
  }

  // Two photos: thumbnails switch the hero; the inactive one is dimmed.
  const thumbs = page.locator('.detail-thumb');
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.nth(1)).toHaveCSS('opacity', '0.6');
  await thumbs.nth(1).click();
  await expect(thumbs.nth(1)).toHaveCSS('opacity', '1');

  // Hero opens the full-screen viewer; double tap zooms.
  await page.getByLabel('Ampliar foto').click();
  await expect(page.getByLabel('Cerrar foto')).toBeVisible();
  const img = page.locator('.lightbox-img');
  await img.dblclick();
  await expect.poll(() => img.evaluate((el) => el.style.transform)).toContain('scale(2.5)');
  await page.getByLabel('Cerrar foto').click();
  await expect(page.getByLabel('Cerrar foto')).toHaveCount(0);

  // A gallery-field photo also opens the viewer.
  await page.locator('.detail-field-thumb').first().click();
  await expect(page.getByLabel('Cerrar foto')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Cerrar foto')).toHaveCount(0);

  // Read mode has no inputs at all.
  await expect(page.locator('input, textarea')).toHaveCount(0);

  // Reload keeps the screen (direct link), then delete: cancel first.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await page.getByLabel('Eliminar puntuación').click();
  await expect(page.getByText('¿Eliminar esta puntuación?')).toBeVisible();
  await expect(page.getByText('Se borrará para siempre, junto con sus fotos y campos. No se puede deshacer.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('¿Eliminar esta puntuación?')).toHaveCount(0);
  await page.getByLabel('Eliminar puntuación').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page.getByText('Todavía no hay puntuaciones')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/custom-page-bg/);
});

test('Detalle sin fotos: franjas y volver', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  await seed.score({ title: 'Sin foto', ownerValue: 4 });
  await page.goto('/');
  await page.getByLabel('Ver Sin foto').click();
  await expect(page.locator('.detail-hero')).toHaveCSS('background-image', /repeating-linear-gradient/);
  await expect(page.getByText('Nadie más ha puntuado esto todavía.')).toBeVisible();
  await expect(page.locator('.detail-thumbs')).toHaveCount(0);
  await page.getByLabel('Volver').click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
});

test('Detalle de una puntuación ajena o inexistente', async ({ page, consoleErrors }) => {
  await signedInViaApi(page);
  await page.goto('/p/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Puntuación no encontrada')).toBeVisible();
  await page.getByLabel('Volver').click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  consoleErrors.length = 0; // the 404 response itself is logged by the browser
});

// A plain RGB PNG of the given size (a tall "poster" for the test below).
function solidPng(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0xcc)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// The photo keeps its proportions instead of a fixed 4:3 crop.
test('Detalle: la foto se ve entera con sus proporciones', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const up = await page.request.post('/api/uploads', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { photo: { name: 'poster.png', mimeType: 'image/png', buffer: solidPng(250, 300) } },
  });
  const { url } = await up.json();
  const score = await new Seeder(page.request, token).score({ title: 'Póster', ownerValue: 8, photoUrls: [url] });
  await page.goto(`/p/${score.id}`);
  const hero = page.locator('img.detail-hero');
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(250);
  const { w, h } = await hero.evaluate((img) => ({ w: img.clientWidth, h: img.clientHeight }));
  // 6:5, taller than the old fixed 4:3 frame (0.75).
  expect(h / w).toBeCloseTo(1.2, 1);
});
