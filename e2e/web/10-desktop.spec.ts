import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

// Runs in the "desktop" project (1440x900): the wide layout. Phone layouts
// are covered by every other suite.
test('escritorio: rejilla ancha, Detalle en dos columnas, diálogos centrados', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const photo = await seed.upload();
  for (let i = 1; i <= 6; i++) await seed.score({ title: `Nota ${i}`, ownerValue: i + 2, photoUrls: [photo], categories: ['Restaurantes'] });

  await page.goto('/');
  await expect(page.locator('.score-card')).toHaveCount(6);
  const tops = await page.locator('.score-card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  const perRow = tops.filter((t) => t === tops[0]).length;
  expect(perRow).toBeGreaterThanOrEqual(4);
  const screenBox = (await page.locator('.home-screen').boundingBox())!;
  expect(screenBox.width).toBeLessThanOrEqual(1200);
  // Its title and search sit in the same centered column as the other screens.
  const homeTitle = (await page.getByRole('heading', { name: 'Tus puntuaciones' }).boundingBox())!;
  const search = (await page.locator('.home-search-row').boundingBox())!;
  expect(Math.abs(search.x + search.width / 2 - 720)).toBeLessThan(4);
  await page.goto('/ajustes');
  const menuBox = (await page.getByLabel('Volver').boundingBox())!;
  await page.goto('/');
  const homeMenu = (await page.getByLabel('Abrir menú').boundingBox())!;
  expect(Math.abs(homeMenu.x - menuBox.x)).toBeLessThan(10);
  expect(homeTitle.x).toBeGreaterThan(homeMenu.x);

  // Detalle: photos on the left, information on the right.
  await page.getByLabel('Ver Nota 6').click();
  await expect(page.getByRole('heading', { name: 'Nota 6' })).toBeVisible();
  const media = (await page.locator('.detail-media').boundingBox())!;
  const info = (await page.locator('.detail-info').boundingBox())!;
  expect(info.x).toBeGreaterThan(media.x + media.width);
  expect(Math.abs(info.y - media.y)).toBeLessThan(40);

  // Sheets become centered dialogs.
  await page.getByLabel('Eliminar puntuación').click();
  const panel = page.locator('.sheet-panel');
  await expect(panel).toBeVisible();
  await expect.poll(async () => (await panel.boundingBox())!.y).toBeGreaterThan(100);
  const box = (await panel.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(4);
  expect(box.y + box.height).toBeLessThan(900 - 100);
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // Forms are a centered column and the 1-10 pills keep a sane size.
  await page.goto('/nueva');
  const form = (await page.locator('.create-screen').boundingBox())!;
  expect(form.width).toBeLessThanOrEqual(760);
  expect(Math.abs(form.x + form.width / 2 - 720)).toBeLessThan(4);
  const pill = (await page.locator('.num-pill').first().boundingBox())!;
  expect(pill.width).toBeLessThanOrEqual(46);
});
