import type { Page } from '@playwright/test';
import { test, expect, registerViaUi } from './fixtures';
import { PNG_BASE64 } from './seed';

// Port of e2e/test.js (the Expo suite) to the web app: one user, the whole
// journey through the UI only, in the same order.
test.use({ permissions: ['geolocation'], geolocation: { latitude: 40.4155, longitude: -3.7074 } });
test.setTimeout(180_000);

const photo = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') };

async function pick(page: Page, trigger: () => Promise<void>) {
  const chooser = page.waitForEvent('filechooser');
  await trigger();
  await (await chooser).setFiles(photo);
}

test('flujo completo de la app', async ({ page }) => {
  // Register and empty home.
  await registerViaUi(page);
  await expect(page.getByText('Todavía no hay puntuaciones')).toBeVisible();

  // Create a score with everything.
  await page.getByLabel('Crear puntuación').click();
  await page.getByPlaceholder('Título *').fill('Casa Pepa');
  await pick(page, () => page.getByLabel('Añadir foto a la galería').click());
  await expect(page.getByText('PORTADA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar carátula' }).click();
  await expect(page.getByRole('tab', { name: 'Película' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.getByLabel('Ver todas las categorías').click();
  await page.getByRole('button', { name: 'Restaurantes', exact: true }).click();
  await page.getByRole('button', { name: 'Películas', exact: true }).click();
  await page.getByPlaceholder('Escribe y pulsa enter para añadir...').fill('Favoritos 2026');
  await page.keyboard.press('Enter');
  await page.locator('.create-body > .editor-section').nth(2).getByRole('radio', { name: '9' }).click();
  await page.getByLabel('Añadir persona').click();
  await page.getByLabel('Nombre de la persona').fill('Marta');
  await page.locator('.people-editing').getByRole('radio', { name: '6' }).click();
  await page.locator('.quick-chip', { hasText: 'Texto' }).click();
  await page.getByPlaceholder('Escribe tus notas...').fill('El arroz estaba en su punto.');
  await page.locator('.quick-chip', { hasText: 'Lista de ítems' }).click();
  await page.getByPlaceholder('Añade un ítem...').fill('Paella de marisco');
  await page.getByRole('button', { name: '+ Añadir ítem' }).click();
  await page.getByPlaceholder('Añade un ítem...').nth(1).fill('Croquetas de jamón');
  await page.locator('.quick-chip', { hasText: 'Galería' }).click();
  await pick(page, () => page.getByLabel('Añadir foto', { exact: true }).click());
  await expect(page.locator('.field-gallery-item img')).toHaveCount(1);
  await page.locator('.quick-chip', { hasText: 'Fecha' }).click();
  await page.getByRole('button', { name: 'Toca para elegir una fecha' }).click();
  await page.getByLabel('Mes', { exact: true }).selectOption({ label: 'junio' });
  await page.getByLabel('Año', { exact: true }).selectOption('2026');
  await page.getByRole('button', { name: '14 de junio de 2026', exact: true }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.locator('.quick-chip', { hasText: 'Ubicación' }).click();
  await page.getByRole('button', { name: '📍 Elegir ubicación en el mapa' }).click();
  await page.getByPlaceholder('Buscar dirección...').fill('Calle Mayor 12, Madrid');
  await page.getByLabel('Buscar dirección', { exact: true }).click();
  await expect(page.locator('.location-label')).toHaveText('Calle Mayor 12, Madrid');
  await page.getByRole('button', { name: 'Confirmar ubicación' }).click();
  await page.locator('.quick-chip', { hasText: 'Etiqueta' }).click();
  await page.getByPlaceholder('Escribe una etiqueta y pulsa enter...').fill('Mediterránea');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Guardar puntuación' }).click();

  // Detail in read mode.
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await expect(page.getByText('— Paella de marisco')).toBeVisible();
  await expect(page.getByText('— Croquetas de jamón')).toBeVisible();
  await expect(page.getByText('El arroz estaba en su punto.')).toBeVisible();
  await expect(page.getByText('14 de junio de 2026')).toBeVisible();
  await expect(page.getByText('Calle Mayor 12, Madrid')).toBeVisible();
  await expect(page.getByText('Mediterránea')).toBeVisible();
  await expect(page.getByText('Marta', { exact: true })).toBeVisible();
  await expect(page.locator('input, textarea')).toHaveCount(0);
  await page.getByLabel('Ampliar foto').click();
  await page.getByLabel('Cerrar foto').click();
  await expect(page.getByLabel('Cerrar foto')).toHaveCount(0);

  // Edit mode.
  await page.getByLabel('Editar puntuación').click();
  await page.locator('.detail-owner-pills').getByRole('radio', { name: '10' }).click();
  await page.getByRole('button', { name: 'Restaurantes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restaurantes', exact: true })).toHaveCount(0);
  await page.getByLabel('Quitar campo Texto').click();
  await page.locator('.quick-chip', { hasText: 'Número' }).click();
  await expect(page.getByLabel('Quitar campo Número')).toBeVisible();
  await page.getByLabel('Añadir persona').click();
  await page.getByLabel('Nombre de la persona').nth(1).fill('Ana');
  await expect(page.getByText('Editando puntuación de Ana')).toBeVisible();
  await page.locator('.people-editing').getByRole('radio', { name: '8' }).click();
  await page.getByLabel('Añadir persona').click();
  await page.getByLabel('Quitar persona').last().click();
  await expect(page.getByLabel('Nombre de la persona')).toHaveCount(2);
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByText('El arroz estaba en su punto.')).toHaveCount(0);

  // Home: stacked badges with +1.
  await page.getByLabel('Volver').click();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();
  const card = page.getByLabel('Ver Casa Pepa');
  await expect(card.locator('.score-badge.mini')).toHaveCount(3);
  await expect(card.getByText('+1', { exact: true })).toBeVisible();

  // Chips keep their height; search matches title, tags and list items.
  await expect(page.getByRole('button', { name: 'Todas', exact: true })).toHaveCSS('height', '32px');
  const search = page.getByPlaceholder('Buscar por título, texto, fecha, categoría o etiqueta...');
  await search.fill('zzz');
  await expect(page.getByText('No hay notas')).toBeVisible();
  await search.fill('mediterr');
  await expect(card).toBeVisible();
  await search.fill('croquetas');
  await expect(card).toBeVisible();
  await page.getByLabel('Borrar búsqueda').click();
  await page.getByRole('button', { name: 'Películas', exact: true }).click();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Todas', exact: true }).click();

  // Session survives a reload.
  await page.reload();
  await expect(page.getByText('Tus puntuaciones')).toBeVisible();

  // Settings: dark mode on and off.
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Ajustes').click();
  await page.getByRole('switch', { name: 'Modo oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('switch', { name: 'Modo oscuro' }).click();
  await page.getByLabel('Volver').click();

  // Global category delete.
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Categorías y etiquetas').click();
  await page.getByLabel('Eliminar categoría Películas').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.locator('.labels-item-name', { hasText: 'Películas' })).toHaveCount(0);
  await page.getByLabel('Volver').click();

  // Locations map -> Detail.
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Mapa de ubicaciones').click();
  await page.locator('.locations-map .map-pin-icon').first().click();
  await page.getByLabel('Abrir Casa Pepa').click();
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();

  // Delete: cancel first, then confirm.
  await page.getByLabel('Eliminar puntuación').click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { name: 'Casa Pepa' })).toBeVisible();
  await page.getByLabel('Eliminar puntuación').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  // Back to where Detalle was opened from (the map), now without the pin.
  await expect(page.getByRole('heading', { name: 'Mapa de ubicaciones' })).toBeVisible();
  await expect(page.getByText('Todavía no has guardado ninguna ubicación en tus puntuaciones.')).toBeVisible();
  await page.getByLabel('Volver').click();
  await expect(page.getByText('Todavía no hay puntuaciones')).toBeVisible();

  // Log out.
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Cerrar sesión').click();
  await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
});
