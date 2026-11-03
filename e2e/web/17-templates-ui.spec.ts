import type { Page } from '@playwright/test';
import { test, expect, signedInViaApi } from './fixtures';

// Templates in the app (docs/plantillas.md), on the phone.
const chip = (page: Page, label: string) => page.locator('.quick-chip', { hasText: new RegExp(`${label}$`) });

test('guardar una puntuación como plantilla y usarla en otra', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/nueva');
  // No templates yet: no dropdown.
  await expect(page.getByLabel('Plantilla', { exact: true })).toHaveCount(0);

  // A restaurant with criteria and a price, saved as a template.
  await page.getByPlaceholder('Título *').fill('Casa Pepe');
  await page.getByLabel('Ver todas las categorías').click();
  await page.getByRole('button', { name: 'Restaurantes', exact: true }).click();
  await page.getByLabel('Ocultar categorías').click();
  await chip(page, 'Criterios').click();
  await page.getByLabel('Nombre del criterio').fill('Sabor');
  await chip(page, 'Precio').click();
  await page.getByLabel('Importe').fill('30');
  await page.getByRole('button', { name: 'Guardar como plantilla' }).click();
  const sheet = page.getByRole('dialog', { name: 'Guardar como plantilla' });
  await sheet.getByRole('button', { name: 'Guardar plantilla' }).click();
  await expect(sheet.getByText('Ponle un nombre')).toBeVisible();
  await sheet.getByLabel('Nombre de la plantilla').fill('Restaurante');
  await sheet.getByRole('radio', { name: '🍽️' }).click();
  await sheet.getByRole('button', { name: 'Guardar plantilla' }).click();
  await expect(page.getByText('Plantilla «🍽️ Restaurante» guardada')).toBeVisible();

  // A new note starts empty; picking the template brings its shape.
  await page.goto('/nueva');
  const picker = page.getByLabel('Plantilla', { exact: true });
  await expect(picker).toHaveValue('');
  // Something already written stays.
  await page.getByPlaceholder('Título *').fill('Otro sitio');
  await chip(page, 'Texto').click();
  await picker.selectOption({ label: '🍽️ Restaurante' });
  await expect(page.getByPlaceholder('Título *')).toHaveValue('Otro sitio');
  await expect(page.getByLabel('Etiqueta del campo Texto')).toBeVisible();
  await expect(page.getByLabel('Nombre del criterio')).toHaveValue('Sabor');
  await expect(page.getByLabel('Importe')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Picking it again doesn't duplicate anything.
  await picker.selectOption('');
  await picker.selectOption({ label: '🍽️ Restaurante' });
  await expect(page.getByLabel('Nombre del criterio')).toHaveCount(1);
  await expect(page.getByLabel('Importe')).toHaveCount(1);

  await page.getByRole('radio', { name: '8', exact: true }).first().click();
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page).toHaveURL(/\/p\//);
  await expect(page.locator('.detail-criterion')).toContainText('Sabor');
});

test('pantalla Plantillas: editar nombre y emoticono, y borrar', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  await page.request.post('/api/templates', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Receta', emoji: '🍳', categories: ['Recetas'], fields: [{ type: 'steps', label: 'Pasos', value: [''] }] },
  });
  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Plantillas').click();
  await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible();
  await expect(page.getByText('1 campo · Recetas')).toBeVisible();

  await page.getByRole('button', { name: 'Editar Receta' }).click();
  const sheet = page.getByRole('dialog', { name: 'Editar plantilla' });
  await sheet.getByLabel('Nombre de la plantilla').fill('Receta base');
  await sheet.getByLabel('Otro emoticono').fill('🥘');
  await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Receta base')).toBeVisible();
  await expect(page.locator('.template-row-emoji')).toHaveText('🥘');

  await page.getByRole('button', { name: 'Borrar Receta base' }).click();
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(page.getByText('Todavía no tienes plantillas.')).toBeVisible();
});

test('guardar como plantilla desde el modo edición de una nota', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const res = await page.request.post('/api/scores', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: 'Bar Manolo',
      ownerValue: 7,
      categories: ['Bares'],
      ratings: [{ personName: 'Bea', value: 8 }],
      fields: [{ type: 'criteria', label: 'Criterios', value: [{ name: 'Tapas', value: 9 }] }],
    },
  });
  const { score } = await res.json();
  await page.goto(`/p/${score.id}`);
  await page.getByLabel('Editar puntuación').click();
  await page.getByRole('button', { name: 'Guardar como plantilla' }).click();
  const sheet = page.getByRole('dialog', { name: 'Guardar como plantilla' });
  await expect(sheet.getByText('Se guardan 1 campo')).toBeVisible();
  await sheet.getByLabel('Nombre de la plantilla').fill('Bar');
  await sheet.getByRole('radio', { name: '🍺' }).click();
  await sheet.getByRole('button', { name: 'Guardar plantilla' }).click();
  await expect(page.getByText('Plantilla «🍺 Bar» guardada')).toBeVisible();

  const { templates } = await (await page.request.get('/api/templates', { headers: { Authorization: `Bearer ${token}` } })).json();
  expect(templates).toHaveLength(1);
  expect(templates[0]).toMatchObject({
    name: 'Bar',
    categories: ['Bares'],
    people: ['Bea'],
    fields: [{ type: 'criteria', label: 'Criterios', value: [{ name: 'Tapas', value: null }] }],
  });
});
