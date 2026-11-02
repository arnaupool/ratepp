import { test, expect, signedInViaApi } from './fixtures';
import { PNG_BASE64, Seeder } from './seed';

async function openSeeded(page: import('@playwright/test').Page) {
  const { token } = await signedInViaApi(page);
  const seed = new Seeder(page.request, token);
  const score = await seed.score({
    title: 'Casa Pepa',
    ownerValue: 9,
    categories: ['Restaurantes'],
    ratings: [{ personName: 'Marta', value: 6 }],
    fields: [
      { type: 'text_long', label: 'Notas', value: 'Bien.' },
      { type: 'list', label: 'Platos', value: ['Paella'] },
    ],
  });
  await page.goto('/');
  await page.getByLabel('Ver Casa Pepa').click();
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  return score;
}

test('cada edición se guarda al momento y persiste tras recargar', async ({ page }) => {
  await openSeeded(page);
  await page.getByLabel('Editar puntuación').click();
  await expect(page.getByRole('button', { name: 'Listo' })).toBeVisible();
  await expect(page.getByLabel('Añadir foto a la galería')).toBeVisible();

  // Title (on blur).
  await page.getByLabel('Título').fill('Casa Pepa Valencia');
  await page.getByText('Tu puntuación').click();

  // Own score.
  await page.locator('.detail-owner-pills').getByRole('radio', { name: '10' }).click();
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('10');

  // Categories: remove one, add a new one.
  await page.getByRole('button', { name: 'Restaurantes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveCount(0);
  await page.getByPlaceholder('Escribe y pulsa enter para añadir...').fill('Arroces');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Arroces' })).toHaveAttribute('aria-pressed', 'true');

  // People: add, rename while focused, score; remove Marta.
  await page.getByLabel('Añadir persona').click();
  await expect(page.getByText('Editando puntuación de Nuevo')).toBeVisible();
  const names = page.getByLabel('Nombre de la persona');
  await names.nth(1).fill('Ana');
  await expect(page.getByText('Editando puntuación de Ana')).toBeVisible();
  await expect(names.nth(1)).toBeFocused();
  await page.locator('.people-editing').getByRole('radio', { name: '8' }).click();
  await page.getByLabel('Quitar persona').first().click();
  await expect(names).toHaveCount(1);

  // Fields: edit text, add a list item, add a number field, reorder, remove.
  await page.getByPlaceholder('Escribe tus notas...').fill('Muy bien.');
  await page.getByText('Tu puntuación').click();
  await page.getByRole('button', { name: '+ Añadir ítem' }).click();
  await page.getByPlaceholder('Añade un ítem...').nth(1).fill('Croquetas');
  await page.getByText('Tu puntuación').click();
  await page.locator('.quick-chip', { hasText: 'Número' }).click();
  await page.getByPlaceholder('Ej. 24.50').fill('32');
  await page.getByText('Tu puntuación').click();
  await page.getByLabel('Mover Número arriba').click();
  await expect(page.locator('.field-label-input').nth(1)).toHaveValue('Número');
  await page.getByLabel('Quitar campo Notas').click();
  await expect(page.getByLabel('Quitar campo Notas')).toHaveCount(0);

  // Gallery photo (uploads immediately) and card color (applies live).
  const chooser = page.waitForEvent('filechooser');
  await page.getByLabel('Añadir foto a la galería').click();
  await (await chooser).setFiles({ name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') });
  await expect(page.getByText('PORTADA')).toBeVisible();
  await page.getByLabel('Mostrar Color de la card').click();
  await page.getByLabel('Color #f6c9c9').click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 201, 201)');

  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByLabel('Editar puntuación')).toBeVisible();

  // Everything persisted on the server.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Casa Pepa Valencia' })).toBeVisible();
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('10');
  await expect(page.getByText('Arroces')).toBeVisible();
  await expect(page.getByText('Restaurantes')).toHaveCount(0);
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await expect(page.getByText('Marta', { exact: true })).toHaveCount(0);
  await expect(page.locator('.detail-person .score-badge')).toHaveText(['8']);
  await expect(page.locator('.detail-field-label')).toHaveText(['Número', 'Platos']);
  await expect(page.getByText('32', { exact: true })).toBeVisible();
  await expect(page.getByText('— Croquetas')).toBeVisible();
  await expect(page.getByText('Muy bien.')).toHaveCount(0);
  await expect(page.locator('.detail-hero')).toHaveAttribute('src', /\/uploads\//);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 201, 201)');
});

test('salir con un texto a medias pregunta: Cancelar, Descartar y Guardar', async ({ page }) => {
  await openSeeded(page);
  await page.getByLabel('Editar puntuación').click();

  // Cancelar: stays in edit mode with the text intact.
  await page.getByLabel('Título').fill('Título a medias');
  await page.getByLabel('Volver').click();
  await expect(page.getByText('¿Guardar los cambios?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByLabel('Título')).toHaveValue('Título a medias');

  // Descartar: leaves without saving.
  await page.getByLabel('Título').focus();
  await page.getByLabel('Volver').click();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page.getByLabel('Ver Casa Pepa')).toBeVisible();

  // Guardar: commits the focused input, then leaves.
  await page.getByLabel('Ver Casa Pepa').click();
  await page.getByLabel('Editar puntuación').click();
  await page.getByLabel('Título').fill('Título guardado');
  await page.getByLabel('Volver').click();
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page.getByLabel('Ver Título guardado')).toBeVisible();
});

test('si el servidor falla, el cambio se revierte y se muestra el error', async ({ page, consoleErrors }) => {
  await openSeeded(page);
  await page.getByLabel('Editar puntuación').click();
  await page.route('**/api/scores/*/ratings/*', (route) =>
    route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'Error interno del servidor' } }) : route.continue()
  );
  await page.locator('.detail-owner-pills').getByRole('radio', { name: '3' }).click();
  await expect(page.getByText('Error interno del servidor')).toBeVisible();
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('9');

  await page.route('**/api/scores/*/fields/*', (route) =>
    route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: {} }) : route.continue()
  );
  await page.getByPlaceholder('Escribe tus notas...').fill('No llega');
  await page.getByText('Tu puntuación').click();
  await expect(page.getByText('No se pudo guardar el campo')).toBeVisible();
  await expect(page.getByPlaceholder('Escribe tus notas...')).toHaveValue('Bien.');
  consoleErrors.length = 0; // the stubbed 500s are logged by the browser
});
