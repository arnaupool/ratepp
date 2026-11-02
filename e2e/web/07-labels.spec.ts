import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

test('borrar una etiqueta y una categoría las quita de todas las notas', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const a = await seed.score({
    title: 'Casa Pepa',
    ownerValue: 9,
    categories: ['Restaurantes', 'Favoritos'],
    fields: [{ type: 'tag', label: 'Etiqueta', value: ['Mediterránea', 'Barato'] }],
  });
  await seed.score({
    title: 'Bar Tomás',
    ownerValue: 7,
    categories: ['Restaurantes'],
    fields: [{ type: 'tag', label: 'Etiqueta', value: ['Mediterránea'] }],
  });
  // A legacy scalar tag value must not break the global delete (old bug: 500).
  await seed.score({ title: 'Antigua', ownerValue: 5, fields: [{ type: 'tag', label: 'Etiqueta', value: 'Mediterránea' }] });

  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Categorías y etiquetas').click();
  await expect(page.getByRole('heading', { name: 'Categorías y etiquetas' })).toBeVisible();
  await expect(page.locator('.labels-item-name')).toHaveText(['Favoritos', 'Restaurantes', 'Barato', 'Mediterránea']);

  // Cancel keeps it.
  await page.getByLabel('Eliminar etiqueta Mediterránea').click();
  await expect(page.getByText('¿Eliminar "Mediterránea"?')).toBeVisible();
  await expect(page.getByText('Está siendo usada por una o más notas. Se quitará de todas ellas. No se puede deshacer.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  // The title keeps the name while the sheet closes (never "undefined").
  await expect(page.getByText('¿Eliminar "undefined"?')).toHaveCount(0);
  await expect(page.locator('.labels-item-name', { hasText: 'Mediterránea' })).toHaveCount(1);

  await page.getByLabel('Eliminar etiqueta Mediterránea').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.locator('.labels-item-name', { hasText: 'Mediterránea' })).toHaveCount(0);

  await page.getByLabel('Eliminar categoría Restaurantes').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.locator('.labels-item-name')).toHaveText(['Favoritos', 'Barato']);

  // Gone from every score.
  await page.goto(`/p/${a.id}`);
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await expect(page.getByText('Mediterránea')).toHaveCount(0);
  await expect(page.getByText('Barato')).toBeVisible();
  await expect(page.getByText('Restaurantes')).toHaveCount(0);
  const tags = await (await page.request.get('/api/tags', { headers: { Authorization: `Bearer ${token}` } })).json();
  expect(tags.tags).toEqual(['Barato']);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveCount(0);
});

test('sin categorías ni etiquetas', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/etiquetas');
  await expect(page.getByText('No tienes categorías todavía.')).toBeVisible();
  await expect(page.getByText('No tienes etiquetas todavía.')).toBeVisible();
});
