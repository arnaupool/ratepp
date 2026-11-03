import type { Page } from '@playwright/test';
import { test, expect, signedInViaApi } from './fixtures';

// Templates in the app (docs/plantillas.md), on the phone.
const chip = (page: Page, label: string) => page.locator('.quick-chip', { hasText: new RegExp(`${label}$`) });

test('guardar una puntuación como plantilla y usarla en otra', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/nueva');
  // No templates yet: no dropdown.
  await expect(page.getByRole('group', { name: 'Plantillas' })).toHaveCount(0);

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
  const card = page.getByRole('button', { name: 'Plantilla Restaurante' });
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  // Something already written stays.
  await page.getByPlaceholder('Título *').fill('Otro sitio');
  await chip(page, 'Texto').click();
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByPlaceholder('Título *')).toHaveValue('Otro sitio');
  await expect(page.getByLabel('Etiqueta del campo Texto')).toBeVisible();
  await expect(page.getByLabel('Nombre del criterio')).toHaveValue('Sabor');
  await expect(page.getByLabel('Importe')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Unmarking it untouched takes out what it added, and only that.
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Nombre del criterio')).toHaveCount(0);
  await expect(page.getByLabel('Importe')).toHaveCount(0);
  await expect(page.getByLabel('Etiqueta del campo Texto')).toBeVisible();
  await page.getByLabel('Ver todas las categorías').click();
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByLabel('Ocultar categorías').click();

  // Filled in: it asks. Cancelar keeps it marked; Borrar campos takes them out.
  const unpick = page.getByRole('dialog', { name: '¿Quitar la plantilla?' });
  await card.click();
  await page.getByLabel('Importe').fill('25');
  await card.click();
  await unpick.getByRole('button', { name: 'Cancelar' }).click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await card.click();
  await unpick.getByRole('button', { name: 'Borrar campos' }).click();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Importe')).toHaveCount(0);

  // Dejarlos keeps them (to derive another template); picking it again doesn't duplicate them.
  await card.click();
  await page.getByLabel('Importe').fill('25');
  await card.click();
  await unpick.getByRole('button', { name: 'Dejarlos' }).click();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Importe')).toHaveValue('25');
  await card.click();
  await expect(page.getByLabel('Nombre del criterio')).toHaveCount(1);
  await expect(page.getByLabel('Importe')).toHaveCount(1);

  await page.getByRole('radio', { name: '8', exact: true }).first().click();
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page).toHaveURL(/\/p\//);
  await expect(page.locator('.detail-criterion')).toContainText('Sabor');
});

test('pantalla Plantillas: editar la plantilla entera y borrarla', async ({ page }) => {
  const { token } = await signedInViaApi(page);
  const auth = { Authorization: `Bearer ${token}` };
  await page.request.post('/api/templates', {
    headers: auth,
    data: { name: 'Receta', emoji: '🍳', categories: ['Recetas'], fields: [{ type: 'steps', label: 'Pasos', value: [''] }] },
  });
  await page.goto('/');
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Plantillas').click();
  await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible();
  await expect(page.getByText('1 campo · Recetas')).toBeVisible();

  await page.getByRole('button', { name: 'Editar Receta' }).click();
  await expect(page.getByRole('heading', { name: 'Editar plantilla' })).toBeVisible();
  await page.getByLabel('Nombre de la plantilla').fill('Receta base');
  await page.getByLabel('Otro emoticono').fill('🥘');
  // Fields show only their shape: no step inputs, criteria without scores.
  await expect(page.getByText('Se rellena en cada puntuación.')).toBeVisible();
  await page.locator('.quick-chip', { hasText: /Criterios$/ }).click();
  await page.getByLabel('Nombre del criterio').fill('Sabor');
  await expect(page.locator('.fe-criterion .num-pill')).toHaveCount(0);
  await page.getByLabel('Añadir persona').fill('Bea');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Quitar a Bea' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar plantilla' }).click();

  await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible();
  await expect(page.getByText('Receta base')).toBeVisible();
  await expect(page.locator('.template-row-emoji')).toHaveText('🥘');
  await expect(page.getByText('2 campos · Recetas · con Bea')).toBeVisible();
  const { templates } = await (await page.request.get('/api/templates', { headers: auth })).json();
  expect(templates[0].fields).toEqual([
    { type: 'steps', label: 'Pasos', value: [''] },
    { type: 'criteria', label: 'Criterios', value: [{ name: 'Sabor', value: null }] },
  ]);

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
