import { test, expect, signedInViaApi } from './fixtures';
import { Seeder } from './seed';

// Add-field chip by its name (the icon glyph before it varies in length).
const chip = (page: import('@playwright/test').Page, label: string) =>
  page.locator('.quick-chip', { hasText: new RegExp(`${label}$`) });

test('crear con Precio, Criterios, Tiempo, Enlace, Sí/No, Ingredientes, Pasos y Dificultad', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/nueva');
  await page.getByPlaceholder('Título *').fill('Tortilla de patatas');
  await page.locator('.create-body > .editor-section').nth(2).getByRole('radio', { name: '9' }).click();

  // Precio: total for 4 people.
  await chip(page, 'Precio').click();
  await page.getByLabel('Importe').fill('60,00');
  await page.getByRole('button', { name: 'Total', exact: true }).click();
  await page.getByLabel('Personas').fill('4');

  // Criterios.
  await chip(page, 'Criterios').click();
  await page.getByLabel('Nombre del criterio').fill('Sabor');
  await page.locator('.fe-criterion').first().getByRole('radio', { name: '9' }).click();
  await page.getByRole('button', { name: '+ Añadir criterio' }).click();
  await page.getByLabel('Nombre del criterio').nth(1).fill('Presentación');
  await page.locator('.fe-criterion').nth(1).getByRole('radio', { name: '6' }).click();

  // Tiempo: 1 h 35 min.
  await chip(page, 'Tiempo').click();
  await page.getByLabel('Horas').fill('1');
  await page.getByLabel('Minutos').fill('35');

  // Enlace.
  await chip(page, 'Enlace').click();
  await page.getByLabel('Dirección del enlace').fill('www.example.com/receta');
  await page.getByLabel('Título del enlace').fill('Receta original');

  // Sí / No.
  await chip(page, 'Sí / No').click();
  await page.getByLabel('Etiqueta del campo Sí / No').fill('¿Repetiría?');
  await page.locator('.field-row', { has: page.getByRole('button', { name: 'Sí', exact: true }) }).getByRole('button', { name: 'Sí', exact: true }).click();

  // Ingredientes for 2, steps, difficulty.
  await chip(page, 'Ingredientes').click();
  await page.getByLabel('Raciones').fill('2');
  await page.getByLabel('Cantidad').fill('3');
  await page.getByLabel('Ingrediente', { exact: true }).fill('huevos');
  await page.getByRole('button', { name: '+ Añadir ingrediente' }).click();
  await page.getByLabel('Cantidad').nth(1).fill('1/2');
  await page.getByLabel('Unidad').nth(1).fill('kg');
  await page.getByLabel('Ingrediente', { exact: true }).nth(1).fill('patatas');
  await page.getByRole('button', { name: '+ Añadir ingrediente' }).click();
  await page.getByLabel('Ingrediente', { exact: true }).nth(2).fill('sal al gusto');
  await chip(page, 'Pasos').click();
  await page.getByPlaceholder('Describe el paso...').fill('Pelar y cortar las patatas.');
  await page.getByRole('button', { name: '+ Añadir paso' }).click();
  await page.getByPlaceholder('Describe el paso...').nth(1).fill('Freír y cuajar con el huevo.');
  await chip(page, 'Dificultad').click();
  await page.getByRole('button', { name: 'Media', exact: true }).click();

  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page.getByRole('heading', { name: 'Tortilla de patatas' })).toBeVisible();

  // Detalle.
  await expect(page.getByText('60,00 € en total')).toBeVisible();
  await expect(page.getByText('15,00 € por persona (4 personas)')).toBeVisible();
  const criteria = page.locator('.detail-criterion');
  await expect(criteria).toHaveCount(2);
  await expect(criteria.first()).toContainText('Sabor');
  await expect(criteria.first().locator('.score-badge')).toHaveText('9');
  await expect(page.getByText('Media: 7,5')).toBeVisible();
  await expect(page.getByText('1 h 35 min')).toBeVisible();
  const link = page.getByRole('link', { name: 'Receta original ↗' });
  await expect(link).toHaveAttribute('href', 'https://www.example.com/receta');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(page.getByText('¿REPETIRÍA?', { exact: false })).toBeVisible();
  await expect(page.locator('.detail-yesno.yes')).toHaveText('Sí');
  await expect(page.getByText('Para 2 raciones')).toBeVisible();
  const items = page.locator('.detail-ingredients li');
  await expect(items).toHaveText(['3 huevos', '1/2 kg patatas', 'sal al gusto']);
  await page.getByLabel('Más raciones').click();
  await page.getByLabel('Más raciones').click();
  await expect(page.getByText('Para 4 raciones')).toBeVisible();
  await expect(items).toHaveText(['6 huevos', '1 kg patatas', 'sal al gusto']);
  await expect(page.locator('.detail-steps li')).toHaveText(['Pelar y cortar las patatas.', 'Freír y cuajar con el huevo.']);
  await expect(page.locator('.detail-difficulty')).toContainText('Media');

  // Edit mode: changes persist after reload.
  await page.getByLabel('Editar puntuación').click();
  await page.getByRole('button', { name: 'Por persona', exact: true }).click();
  await page.getByLabel('Importe').fill('18,5');
  await page.getByText('Tu puntuación').click();
  await page.getByLabel('Minutos').fill('50');
  await page.getByText('Tu puntuación').click();
  await page.getByRole('button', { name: 'Difícil', exact: true }).click();
  await page.locator('.field-row').filter({ has: page.getByLabel('Etiqueta del campo ¿Repetiría?') }).getByRole('button', { name: 'No', exact: true }).click();
  await page.getByLabel('Quitar paso 1').click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.reload();
  await expect(page.getByText('18,50 € por persona')).toBeVisible();
  await expect(page.getByText('1 h 50 min')).toBeVisible();
  await expect(page.locator('.detail-difficulty')).toContainText('Difícil');
  await expect(page.locator('.detail-yesno')).toHaveText('No');
  await expect(page.locator('.detail-steps li')).toHaveText(['Freír y cuajar con el huevo.']);

  // Searchable like any other field.
  await page.goto('/');
  await page.getByPlaceholder('Buscar por título, texto, fecha, categoría o etiqueta...').fill('patatas');
  await expect(page.getByLabel('Ver Tortilla de patatas')).toBeVisible();
});

test('un enlace no http(s) nunca se vuelve clicable y los datos raros no rompen', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const s = await seed.score({
    title: 'Raro',
    ownerValue: 5,
    fields: [
      { type: 'link', label: 'Enlace', value: { url: 'javascript:alert(1)', title: 'Trampa' } },
      { type: 'price', label: 'Precio', value: 'no es un objeto' },
      { type: 'criteria', label: 'Criterios', value: [{ name: 'Sabor', value: 42 }, null] },
      { type: 'ingredients', label: 'Ingredientes', value: { items: 'mal' } },
      { type: 'duration', label: 'Tiempo', value: -5 },
      { type: 'difficulty', label: 'Dificultad', value: 'muy' },
    ],
  });
  await page.goto(`/p/${s.id}`);
  await expect(page.getByRole('heading', { name: 'Raro' })).toBeVisible();
  await expect(page.getByText('Trampa')).toBeVisible();
  await expect(page.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(page.getByText('Sabor')).toBeVisible();
  await page.getByLabel('Editar puntuación').click();
  await expect(page.getByLabel('Importe')).toHaveValue('');
  await page.getByRole('button', { name: 'Listo' }).click();
});
