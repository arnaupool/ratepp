import { test, expect, signedInViaApi } from './fixtures';
import { PNG_BASE64 } from './seed';
import type { Page } from '@playwright/test';

const photoFile = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') };

async function pickPhoto(page: Page, trigger: () => Promise<void>) {
  const chooser = page.waitForEvent('filechooser');
  await trigger();
  await (await chooser).setFiles(photoFile);
}

test.use({ permissions: ['geolocation'], geolocation: { latitude: 40.4155, longitude: -3.7074 } });

test('Crear con todos los tipos de campo y verla en Detalle', async ({ page }) => {
  await signedInViaApi(page);
  // Cover search answers come from a stub so the test doesn't need API keys.
  await page.route('**/api/covers/search**', (route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');
    const q = url.searchParams.get('q');
    route.fulfill({
      json: { results: [{ id: `${type}-1`, title: `${q} (${type})`, subtitle: '2024', posterUrl: `data:image/png;base64,${PNG_BASE64}` }] },
    });
  });

  await page.goto('/');
  await page.getByLabel('Crear puntuación').click();
  await expect(page).toHaveURL(/\/nueva$/);

  // Validation: title, then score.
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page.getByText('El título es obligatorio')).toBeVisible();
  await page.getByPlaceholder('Título *').fill('Casa Pepa');
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page.getByText('La puntuación (1-10) es obligatoria')).toBeVisible();

  // Gallery: upload from the device, it becomes the cover.
  await pickPhoto(page, () => page.getByLabel('Añadir foto a la galería').click());
  await expect(page.getByText('PORTADA', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Mover foto a la izquierda')).toBeDisabled();

  // Cover search: tabs keep their own query and results.
  await page.getByRole('button', { name: 'Buscar carátula' }).click();
  await page.getByPlaceholder('Título...').fill('Dune');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Dune (movie)')).toBeVisible();
  await page.getByRole('tab', { name: 'Libro' }).click();
  await expect(page.getByPlaceholder('Título...')).toHaveValue('');
  await expect(page.getByText('Dune (movie)')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Película' }).click();
  await expect(page.getByPlaceholder('Título...')).toHaveValue('Dune');
  await expect(page.getByText('Dune (movie)')).toBeVisible();
  await page.getByText('Dune (movie)').click();
  await expect(page.getByRole('heading', { name: 'Buscar carátula' })).toHaveCount(0);
  await expect(page.locator('.gallery-editor-item')).toHaveCount(2);
  // Reorder: second photo moves first and becomes the cover.
  await page.getByLabel('Mover foto a la izquierda').nth(1).click();
  await expect(page.locator('.gallery-editor-item').first().locator('img')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByLabel('Quitar foto').first().click();
  await expect(page.locator('.gallery-editor-item')).toHaveCount(1);

  // Categories: suggestions behind the chevron, plus a custom one.
  await page.getByLabel('Ver todas las categorías').click();
  await page.getByRole('button', { name: 'Restaurantes', exact: true }).click();
  await page.getByRole('button', { name: 'Películas', exact: true }).click();
  await page.getByRole('button', { name: 'Películas', exact: true }).click();
  await page.getByPlaceholder('Escribe y pulsa enter para añadir...').fill('Favoritos 2026');
  await page.keyboard.press('Enter');
  await page.getByLabel('Ocultar categorías').click();
  await expect(page.getByRole('button', { name: 'Favoritos 2026' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Películas', exact: true })).toHaveCount(0);

  // Score 9.
  await page.locator('.create-body > .editor-section').nth(2).getByRole('radio', { name: '9' }).click();

  // Other people: add, rename while typing, score.
  await page.getByLabel('Añadir persona').click();
  await expect(page.getByText('Editando puntuación de Nuevo')).toBeVisible();
  const name = page.getByLabel('Nombre de la persona');
  await name.fill('Marta');
  await expect(page.getByText('Editando puntuación de Marta')).toBeVisible();
  await page.locator('.people-editing').getByRole('radio', { name: '6' }).click();
  await expect(page.getByText('Editando puntuación de Marta')).toHaveCount(0);
  await page.getByLabel('Añadir persona').click();
  await page.getByLabel('Nombre de la persona').nth(1).fill('');
  await page.getByLabel('Quitar persona').nth(1).click();
  await expect(page.getByLabel('Nombre de la persona')).toHaveCount(1);

  // Fields.
  await page.locator('.quick-chip', { hasText: 'Texto' }).click();
  await page.getByPlaceholder('Escribe tus notas...').fill('El arroz estaba en su punto.');
  await page.locator('.quick-chip', { hasText: 'Número' }).click();
  await page.getByPlaceholder('Ej. 24.50').fill('24.50');
  await page.locator('.quick-chip', { hasText: 'Lista de ítems' }).click();
  await page.getByPlaceholder('Añade un ítem...').first().fill('Paella de marisco');
  await page.getByRole('button', { name: '+ Añadir ítem' }).click();
  await page.getByPlaceholder('Añade un ítem...').nth(1).fill('Croquetas de jamón');
  await page.locator('.quick-chip', { hasText: 'Galería' }).click();
  await pickPhoto(page, () => page.getByLabel('Añadir foto', { exact: true }).click());
  await expect(page.locator('.field-gallery-item img')).toHaveCount(1);
  await page.locator('.quick-chip', { hasText: 'Fecha' }).click();
  await page.getByRole('button', { name: 'Toca para elegir una fecha' }).click();
  await page.getByLabel('Mes', { exact: true }).selectOption({ label: 'junio' });
  await page.getByLabel('Año', { exact: true }).selectOption('2026');
  await page.getByRole('button', { name: '14 de junio de 2026', exact: true }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByRole('heading', { name: 'Elegir fecha' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '14 de junio de 2026' })).toBeVisible();
  await page.locator('.quick-chip', { hasText: 'Ubicación' }).click();
  await page.getByRole('button', { name: '📍 Elegir ubicación en el mapa' }).click();
  await expect(page.getByRole('heading', { name: 'Elegir ubicación' })).toBeVisible();
  await page.getByPlaceholder('Buscar dirección...').fill('Calle Mayor 12, Madrid');
  await page.getByLabel('Buscar dirección', { exact: true }).click();
  await expect(page.locator('.location-label')).toHaveText('Calle Mayor 12, Madrid');
  await page.getByRole('button', { name: 'Confirmar ubicación' }).click();
  await expect(page.locator('.field-row .map-preview-label')).toHaveText('Calle Mayor 12, Madrid');
  await page.locator('.quick-chip', { hasText: 'Etiqueta' }).click();
  await page.getByPlaceholder('Escribe una etiqueta y pulsa enter...').fill('Mediterránea');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tag-selected', { hasText: 'Mediterránea' })).toBeVisible();

  // Reorder fields: move Número up above Texto, then remove nothing else.
  await page.getByLabel('Mover Número arriba').click();
  await expect(page.locator('.field-label-input').first()).toHaveValue('Número');
  await page.getByLabel('Etiqueta del campo Número').fill('Precio medio');

  // Card color: page background changes live, text adapts.
  await page.getByLabel('Mostrar Color de la card').click();
  await page.getByLabel('Color #bcd4f0').click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(188, 212, 240)');

  await page.getByRole('button', { name: 'Guardar puntuación' }).click();

  // Detalle replaces Crear in history.
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await expect(page.getByText('El arroz estaba en su punto.')).toBeVisible();
  await expect(page.getByText('PRECIO MEDIO', { exact: false })).toBeVisible();
  await expect(page.getByText('24.50')).toBeVisible();
  await expect(page.getByText('— Paella de marisco')).toBeVisible();
  await expect(page.getByText('— Croquetas de jamón')).toBeVisible();
  await expect(page.getByText('14 de junio de 2026')).toBeVisible();
  await expect(page.getByText('Calle Mayor 12, Madrid')).toBeVisible();
  await expect(page.getByText('Mediterránea')).toBeVisible();
  await expect(page.getByText('Marta', { exact: true })).toBeVisible();
  await expect(page.locator('.detail-person .score-badge')).toHaveText(['6']);
  await expect(page.locator('.detail-owner .score-badge')).toHaveText('9');
  await expect(page.getByText('Favoritos 2026')).toBeVisible();
  await expect(page.getByText('Restaurantes', { exact: true })).toBeVisible();
  await expect(page.locator('.detail-field-thumb')).toHaveCount(1);
  await expect(page.locator('.detail-field-label').first()).toHaveText('Precio medio');

  await page.getByLabel('Volver').click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  await expect(page.locator('.score-card')).toHaveCount(1);
});

test('persona con nombre vacío se guarda como Invitado', async ({ page }) => {
  await signedInViaApi(page);
  await page.goto('/nueva');
  await page.getByPlaceholder('Título *').fill('Peli');
  await page.locator('.create-body > .editor-section').nth(2).getByRole('radio', { name: '7' }).click();
  await page.getByLabel('Añadir persona').click();
  await page.getByLabel('Nombre de la persona').fill('   ');
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();
  await expect(page.getByText('Invitado', { exact: true })).toBeVisible();
});
