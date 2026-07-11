// End-to-end regression suite. Drives the app's web build (react-native-web)
// against a running backend, exercising the full user flow.
//
// Setup:
//   1. Backend up (docker compose up) with a fresh or disposable database.
//   2. cd mobile && EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo start --web --port 8082
//   3. cd e2e && npm install && node test.js
//
// Env vars: E2E_BASE_URL (default http://localhost:8082),
//           CHROMIUM_PATH (optional explicit browser binary).
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('playwright-core'));
}

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8082';
const SHOTS = __dirname + '/shots';

// Minimal valid 1x1 JPEG used for the photo-upload step.
const TEST_JPG = __dirname + '/test-photo.jpg';
require('fs').writeFileSync(
  TEST_JPG,
  Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    'base64'
  )
);
const consoleErrors = [];
let step = 0;

function log(msg) { console.log(`[${++step}] ${msg}`); }

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

// Playwright has no getByDisplayValue; find the <input> whose current
// value matches (React controlled inputs update the property, not the attr).
async function inputWithValue(page, val) {
  const inputs = page.locator('input');
  for (let i = 0; i < (await inputs.count()); i++) {
    if ((await inputs.nth(i).inputValue()) === val) return inputs.nth(i);
  }
  throw new Error(`no input with value "${val}"`);
}

(async () => {
  require('fs').mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  // iPhone-ish viewport so the layout matches the mobile design
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

  // ---------- login screen ----------
  log('Loading app (first Metro bundle can take a while)...');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByText('Bienvenido de nuevo').waitFor({ timeout: 180000 });
  log('Login screen rendered');
  await shot(page, '01-login');

  // ---------- register ----------
  await page.getByText('Regístrate').click();
  await page.getByText('Crea tu cuenta').waitFor();
  log('Toggled to register mode');
  const email = `e2e-${Date.now()}@test.com`;
  await page.getByPlaceholder('tucorreo@email.com').fill(email);
  const pwFields = page.getByPlaceholder('••••••••');
  await pwFields.nth(0).fill('secret123');
  await pwFields.nth(1).fill('secret123');
  await shot(page, '02-register-filled');
  await page.getByText('Crear cuenta', { exact: true }).click();

  // ---------- home (empty state) ----------
  await page.getByText('Tus puntuaciones').waitFor({ timeout: 30000 });
  await page.getByText('Todavía no hay puntuaciones').waitFor();
  log('Registered and landed on Home with empty state');
  await shot(page, '03-home-empty');

  // ---------- create ----------
  await page.getByLabel('Crear puntuación').click();
  await page.getByPlaceholder('Título de tu puntuación').waitFor();
  log('Create screen opened via FAB');

  await page.getByPlaceholder('Título de tu puntuación').fill('Casa Pepa');
  // multi-category: toggle two suggestion chips + type a custom one
  await page.getByText('Restaurantes', { exact: true }).click();
  await page.getByText('Películas', { exact: true }).click();
  await page.getByPlaceholder('Ej. Restaurantes').fill('Favoritos 2026');
  await page.getByLabel('Añadir categoría').click();
  await page.getByText('Favoritos 2026', { exact: true }).waitFor();
  log('Multiple categories selected (2 chips + 1 custom)');

  // main score: pick 9
  await page.getByText('9', { exact: true }).first().click();
  log('Own score 9 selected');

  // extra person: add, rename to Marta, score 6
  await page.getByLabel('Añadir persona').click();
  await page.getByText('Editando puntuación de Nuevo').waitFor();
  await (await inputWithValue(page, 'Nuevo')).fill('Marta');
  await page.getByText('Editando puntuación de Marta').waitFor();
  log('Extra person added and renamed to Marta (edit context follows rename)');
  await page.getByText('6', { exact: true }).last().click();
  // edit row should close after selecting
  await page.getByText('Editando puntuación de Marta').waitFor({ state: 'detached' });
  log('Marta scored 6, selector closed');

  // quick field: texto largo
  await page.getByText('Texto largo').click();
  await page.getByPlaceholder('Escribe tus notas...').fill('El arroz estaba en su punto.');
  log('Long-text field added and filled');

  // sheet field: lista de ítems
  await page.getByText('Más campos', { exact: true }).first().click();
  await page.getByText('Lista de ítems').waitFor();
  await shot(page, '04-more-fields-sheet');
  await page.getByText('Lista de ítems').click();
  await page.getByPlaceholder('Añade un ítem...').fill('Paella de marisco');
  await page.getByText('+ Añadir ítem').click();
  await page.getByPlaceholder('Añade un ítem...').nth(1).fill('Croquetas de jamón');
  log('List field added with two items');

  // sheet field: galería + real photo upload through the file picker
  await page.getByText('Más campos', { exact: true }).first().click();
  await page.getByText('Galería', { exact: true }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByLabel('Añadir foto').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(TEST_JPG);
  // uploaded thumbnail appears as an img with the API's /uploads/ URL
  await page.waitForSelector('img[src*="/uploads/"]', { timeout: 20000 });
  log('Gallery photo uploaded through the picker and rendered');

  // quick field: fecha (native date input on web)
  await page.getByText('Fecha', { exact: true }).click();
  await page.locator('input[type="date"]').fill('2026-06-14');
  log('Date field added via native date input');

  // quick field: ubicación (map picker; web fallback is a plain address form)
  await page.getByText('Ubicación', { exact: true }).click();
  await page.getByText('📍 Elegir ubicación en el mapa').click();
  await page.getByText('Elegir ubicación', { exact: true }).waitFor();
  await page.getByPlaceholder('Ej. Calle Mayor 12, Madrid').fill('Calle Mayor 12, Madrid');
  await page.getByText('Confirmar ubicación').click();
  await page.getByText('Calle Mayor 12, Madrid').waitFor();
  log('Location field set through the picker overlay');

  // sheet field: selector/etiqueta with autocomplete
  await page.getByText('Más campos', { exact: true }).first().click();
  await page.getByText('Selector / etiqueta').click();
  await page.getByPlaceholder('Ej. Mediterránea').fill('Mediterránea');
  log('Tag field added and filled');

  // cover: open the search sheet (no network assertions — external API keys
  // aren't configured in this environment), then close it and upload a
  // cover photo from device instead, exercising the dedicated cover flow.
  await page.getByText('Buscar carátula').click();
  await page.getByText('Película', { exact: true }).waitFor();
  await page.getByText('Cerrar', { exact: true }).click();
  const coverChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Subir foto', { exact: true }).click();
  const coverChooser = await coverChooserPromise;
  await coverChooser.setFiles(TEST_JPG);
  // wait for the second /uploads/ image (gallery photo + now the cover) so
  // the cover upload finishes before we hit save
  await page.waitForFunction(
    () => document.querySelectorAll('img[src*="/uploads/"]').length >= 2,
    { timeout: 20000 }
  );
  log('Cover: search sheet opened/closed, then uploaded from device');
  await shot(page, '05-create-filled');

  // save
  await page.getByText('Guardar puntuación').click();

  // ---------- detail ----------
  await page.getByText('Casa Pepa').waitFor({ timeout: 30000 });
  await page.getByText('TEXTO LARGO').waitFor();
  await page.getByText('— Paella de marisco').waitFor();
  await page.getByText('— Croquetas de jamón').waitFor();
  await page.getByText('El arroz estaba en su punto.').waitFor();
  await page.getByText('14 de junio de 2026').waitFor();
  await page.getByText('Calle Mayor 12, Madrid').waitFor();
  await page.getByText('Mediterránea').waitFor();
  await inputWithValue(page, 'Marta'); // extra people render as editable name inputs
  log('Detail shows title, fields (date/location/tag included) and both people');

  // categories: both toggled chips + the custom one, and no owner ("Tú")
  // bubble mixed into "Puntuaciones de otras personas"
  await page.getByText('Restaurantes', { exact: true }).waitFor();
  await page.getByText('Películas', { exact: true }).waitFor();
  await page.getByText('Favoritos 2026', { exact: true }).waitFor();
  const detailTuCount = await page.getByText('Tú', { exact: true }).count();
  if (detailTuCount !== 0) throw new Error(`expected no "Tú" bubble in the other-people editor, found ${detailTuCount}`);
  log('Detail shows all 3 categories and no owner bubble in the other-people list');
  await shot(page, '06-detail');

  // edit own score 9 -> 10 (owner's pill row is always visible now, no tap-to-reveal)
  await page.getByText('Tu puntuación', { exact: true }).waitFor();
  await page.getByText('10', { exact: true }).first().click();
  await page.getByText('10', { exact: true }).first().waitFor();
  log('Own score edited 9 -> 10 in Detail');

  // add + rename person in detail (the focus-loss bug from the design chat)
  await page.getByLabel('Añadir persona').click();
  await page.getByText('Editando puntuación de Nuevo').waitFor();
  const nameInput = await inputWithValue(page, 'Nuevo');
  await nameInput.click();
  await page.keyboard.press('ControlOrMeta+a');
  await nameInput.pressSequentially('Ana', { delay: 60 }); // keystroke-by-keystroke: catches the remount/focus-loss bug from the design chat
  const typedValue = await nameInput.inputValue();
  if (typedValue !== 'Ana') throw new Error(`rename input lost focus/content while typing: "${typedValue}"`);
  await page.getByText('Editando puntuación de Ana').waitFor();
  await page.keyboard.press('Tab'); // blur -> PATCH rename
  await page.getByText('8', { exact: true }).last().click();
  log('Ana added in Detail, renamed while typing (focus kept), scored 8');
  await shot(page, '07-detail-three-people');

  // remove a person: add one more then remove it
  await page.getByLabel('Añadir persona').click();
  await page.getByText('Editando puntuación de Nuevo').waitFor();
  await page.getByLabel('Quitar persona').last().click();
  await page.getByText('Editando puntuación de Nuevo').waitFor({ state: 'detached' });
  log('Fourth person added then removed');

  // ---------- back to home: card reflects state ----------
  await page.getByLabel('Volver').click();
  await page.getByText('Tus puntuaciones').waitFor();
  await page.getByText('Casa Pepa').waitFor();
  // 3 ratings -> stacked badges "10", "6" + extra "+1"
  await page.getByText('+1', { exact: true }).waitFor();
  log('Home card shows stacked scores with +1 overflow');
  await shot(page, '08-home-card');

  // search filtering
  await page.getByPlaceholder('Buscar por título...').fill('zzz');
  await page.getByText('Todavía no hay puntuaciones').waitFor();
  await page.getByPlaceholder('Buscar por título...').fill('casa');
  await page.getByText('Casa Pepa').waitFor();
  await page.getByPlaceholder('Buscar por título...').fill('');
  log('Search filters and clears correctly');

  // category chips (first match = filter chip row, rendered above the grid)
  await page.getByText('Restaurantes', { exact: true }).first().click();
  await page.getByText('Casa Pepa').waitFor();
  log('Category filter chip works');

  // ---------- session persistence across reload ----------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Tus puntuaciones').waitFor({ timeout: 120000 });
  log('Session persisted across reload (straight to Home, no login)');
  await shot(page, '09-home-after-reload');

  // ---------- report ----------
  console.log('\n=== ALL STEPS PASSED ===');
  if (consoleErrors.length) {
    console.log(`\nConsole errors captured (${consoleErrors.length}):`);
    for (const e of [...new Set(consoleErrors)]) console.log(' -', e.slice(0, 300));
  } else {
    console.log('No console errors captured.');
  }

  await browser.close();
  process.exit(0);
})().catch(async (err) => {
  console.error(`\n=== FAILED at step ${step} ===`);
  console.error(err.message);
  if (consoleErrors.length) {
    console.log('\nConsole errors so far:');
    for (const e of [...new Set(consoleErrors)]) console.log(' -', e.slice(0, 300));
  }
  process.exit(1);
});
