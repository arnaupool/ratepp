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
let debugPage = null;

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
  // iPhone-ish viewport so the layout matches the mobile design. Geolocation
  // is granted so the location picker's "usar mi ubicación actual" button
  // can produce real lat/lng (the web fallback's typed-address path leaves
  // them null, which the locations-map endpoint deliberately excludes).
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 40.4155, longitude: -3.7074 },
  });
  const page = await ctx.newPage();
  debugPage = page;

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
  await page.getByPlaceholder('Título *').waitFor();
  log('Create screen opened via FAB');

  await page.getByPlaceholder('Título *').fill('Casa Pepa');

  // Fotos: upload one from device — it becomes the gallery's first photo
  // (the "portada") automatically.
  const galleryChooserPromise = page.waitForEvent('filechooser');
  await page.getByLabel('Añadir foto a la galería').click();
  const galleryChooser = await galleryChooserPromise;
  await galleryChooser.setFiles(TEST_JPG);
  await page.waitForSelector('img[src*="/uploads/"]', { timeout: 20000 });
  await page.getByText('PORTADA', { exact: true }).waitFor();
  log('First photo uploaded to score gallery, auto-marked as portada');

  // cover search: open/close only (no external API keys configured here)
  await page.getByText('Buscar carátula', { exact: true }).click();
  await page.getByText('Película', { exact: true }).waitFor();
  await page.getByText('Cerrar', { exact: true }).click();
  log('Cover search sheet opens and closes');

  // multi-category: collapsed by default — expand via the small chevron,
  // toggle two chips, add a custom one via Enter (no "+" button anymore)
  await page.getByLabel('Ver todas las categorías').click();
  await page.getByText('Restaurantes', { exact: true }).click();
  await page.getByText('Películas', { exact: true }).click();
  const catInput = page.getByPlaceholder('Escribe y pulsa enter para añadir...');
  await catInput.fill('Favoritos 2026');
  await catInput.press('Enter');
  await page.getByText('Favoritos 2026', { exact: true }).waitFor();
  log('Multiple categories selected (2 chips + 1 custom via enter)');

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

  // quick field: texto (all 7 field types now live in one merged "Añadir
  // campo" row — no more separate "Más campos" sheet)
  await page.getByText('Texto', { exact: true }).click();
  await page.getByPlaceholder('Escribe tus notas...').fill('El arroz estaba en su punto.');
  log('Text field added and filled');

  // quick field: lista de ítems
  await page.getByText('Lista de ítems', { exact: true }).click();
  await page.getByPlaceholder('Añade un ítem...').fill('Paella de marisco');
  await page.getByText('+ Añadir ítem').click();
  await page.getByPlaceholder('Añade un ítem...').nth(1).fill('Croquetas de jamón');
  log('List field added with two items');

  // quick field: galería + real photo upload through the file picker
  await page.getByText('Galería', { exact: true }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByLabel('Añadir foto', { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(TEST_JPG);
  // uploaded thumbnail appears as an img with the API's /uploads/ URL
  await page.waitForSelector('img[src*="/uploads/"]', { timeout: 20000 });
  log('Gallery photo uploaded through the picker and rendered');

  // quick field: fecha (native date input on web)
  await page.getByText('Fecha', { exact: true }).click();
  await page.locator('input[type="date"]').fill('2026-06-14');
  log('Date field added via native date input');

  // quick field: ubicación (map picker; web fallback is a plain address form).
  // Also grab real coordinates via "usar mi ubicación actual" so this score
  // shows up on the locations-map screen tested later.
  await page.getByText('Ubicación', { exact: true }).click();
  await page.getByText('📍 Elegir ubicación en el mapa').click();
  await page.getByText('Elegir ubicación', { exact: true }).waitFor();
  await page.getByPlaceholder('Ej. Calle Mayor 12, Madrid').fill('Calle Mayor 12, Madrid');
  await page.getByText('Usar mi ubicación actual', { exact: false }).click();
  await page.waitForTimeout(500);
  await page.getByText('Confirmar ubicación').click();
  await page.getByText('Calle Mayor 12, Madrid').waitFor();
  log('Location field set through the picker overlay (with real coordinates)');

  // quick field: etiqueta (multi-select tag autocomplete, commit via enter)
  await page.getByText('Etiqueta', { exact: true }).click();
  const tagInput = page.getByPlaceholder('Escribe una etiqueta y pulsa enter...');
  await tagInput.fill('Mediterránea');
  await tagInput.press('Enter');
  await page.getByText('Mediterránea', { exact: true }).waitFor();
  log('Tag field added, tag committed via enter (multi-select chip)');
  await shot(page, '04-create-filled');

  // save
  await page.getByText('Guardar puntuación').click();

  // ---------- detail (view mode: everything read-only) ----------
  await page.getByText('Casa Pepa').waitFor({ timeout: 60000 });
  // Note: getByText matches actual DOM textContent, not the CSS
  // text-transform:uppercase rendering, so field labels stay their
  // original case ("Texto") even though they display as "TEXTO".
  await page.getByText('Texto', { exact: true }).waitFor({ timeout: 60000 });
  await page.getByText('— Paella de marisco').waitFor();
  await page.getByText('— Croquetas de jamón').waitFor();
  await page.getByText('El arroz estaba en su punto.').waitFor();
  await page.getByText('14 de junio de 2026').waitFor();
  await page.getByText('Calle Mayor 12, Madrid').waitFor();
  await page.getByText('Mediterránea').waitFor();
  await page.getByText('Marta', { exact: true }).waitFor(); // read-only: plain text, not an input
  log('Detail (view mode) shows title, fields (date/location/tag included) and both people');

  // categories: both toggled chips + the custom one, and no owner ("Tú")
  // bubble mixed into "Nota adicional"
  await page.getByText('Restaurantes', { exact: true }).waitFor();
  await page.getByText('Películas', { exact: true }).waitFor();
  await page.getByText('Favoritos 2026', { exact: true }).waitFor();
  const detailTuCount = await page.getByText('Tú', { exact: true }).count();
  if (detailTuCount !== 0) throw new Error(`expected no "Tú" bubble in the other-people editor, found ${detailTuCount}`);
  log('Detail shows all 3 categories and no owner bubble in the other-people list');
  await shot(page, '06-detail');

  // score pills should NOT be present outside edit mode
  const pillsInViewMode = await page.getByText('10', { exact: true }).count();
  if (pillsInViewMode !== 0) throw new Error('score pill row visible outside edit mode');
  log('Score is read-only outside edit mode (no pill row rendered)');

  // photo lightbox: tap the hero photo, expect a full-screen viewer, close it
  await page.locator('img[src*="/uploads/"]').first().click();
  await page.getByLabel('Cerrar foto').waitFor({ timeout: 5000 });
  await shot(page, '06b-lightbox');
  await page.getByLabel('Cerrar foto').click();
  await page.getByLabel('Cerrar foto').waitFor({ state: 'detached' });
  log('Photo lightbox opens on tap and closes');

  // ---------- detail (edit mode: everything unlocked) ----------
  await page.getByLabel('Editar puntuación').click();
  await page.getByText('Listo', { exact: true }).waitFor();
  await page.getByLabel('Añadir foto a la galería').waitFor();
  log('Entered edit mode');

  // score 9 -> 10, now editable via the pill row
  await page.getByText('Tu puntuación', { exact: true }).waitFor();
  await page.getByText('10', { exact: true }).first().click();
  await page.getByText('10', { exact: true }).first().waitFor();
  log('Own score edited 9 -> 10 in edit mode');

  // categories: untoggle "Restaurantes"
  await page.getByText('Restaurantes', { exact: true }).click();
  await page.getByText('Restaurantes', { exact: true }).waitFor({ state: 'detached' });
  log('Edit mode: category removed');

  // fields: remove one, add another
  await page.getByLabel('Quitar campo Texto').click();
  await page.getByText('El arroz estaba en su punto.').waitFor({ state: 'detached' });
  await page.getByText('Número', { exact: true }).click();
  await page.getByLabel('Quitar campo Número', { exact: true }).waitFor();
  log('Edit mode: removed a field and added a new one (Número)');

  // people: add + rename to Ana (the focus-loss bug from the design chat), score 8
  await page.getByLabel('Añadir persona').click();
  await page.getByText('Editando puntuación de Nuevo').waitFor();
  const nameInput = await inputWithValue(page, 'Nuevo');
  await nameInput.click();
  // This TextInput is small (44x16px); Playwright's synthetic click on it
  // doesn't reliably move document.activeElement in headless Chromium, even
  // though the click lands on the right element (verified via
  // elementFromPoint) — an explicit focus() closes that gap.
  // Headless Chromium occasionally drops document.activeElement mid-sequence
  // for reasons unrelated to app behavior (reproduced even with an inert,
  // zero-effect wrapper elsewhere on the page) — retry by re-focusing and
  // re-selecting rather than treating one flaky attempt as a real failure.
  let typedValue = '';
  for (let attempt = 0; attempt < 3 && typedValue !== 'Ana'; attempt++) {
    await nameInput.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await nameInput.pressSequentially('Ana', { delay: 60 }); // keystroke-by-keystroke: catches the remount/focus-loss bug from the design chat
    typedValue = await nameInput.inputValue();
  }
  if (typedValue !== 'Ana') throw new Error(`rename input lost focus/content while typing: "${typedValue}"`);
  await page.getByText('Editando puntuación de Ana').waitFor();
  await page.keyboard.press('Tab'); // blur -> PATCH rename
  await page.getByText('8', { exact: true }).last().click();
  log('Ana added in edit mode, renamed while typing (focus kept), scored 8');
  await shot(page, '07-detail-edit-mode');

  // remove a person: add one more then remove it
  await page.getByLabel('Añadir persona').click();
  await page.getByText('Editando puntuación de Nuevo').waitFor();
  await page.getByLabel('Quitar persona').last().click();
  await page.getByText('Editando puntuación de Nuevo').waitFor({ state: 'detached' });
  log('Fourth person added then removed');

  // exit edit mode
  await page.getByText('Listo', { exact: true }).click();
  await page.getByLabel('Añadir foto a la galería').waitFor({ state: 'detached' });
  log('Exited edit mode, back to read-only view');

  // ---------- back to home: card reflects state ----------
  await page.getByLabel('Volver').click();
  await page.getByText('Tus puntuaciones').waitFor();
  await page.getByText('Casa Pepa').waitFor();
  // 3 ratings -> stacked badges "10", "6" + extra "+1"
  await page.getByText('+1', { exact: true }).waitFor();
  log('Home card shows stacked scores with +1 overflow');
  await shot(page, '08-home-card');

  // filter chips: "Todas" was reported squished only while selected as the
  // active filter — compare its rendered height against a sibling chip.
  const todasBox = await page.getByText('Todas', { exact: true }).first().boundingBox();
  const pelisBox = await page.getByText('Películas', { exact: true }).first().boundingBox();
  if (!todasBox || !pelisBox) throw new Error('could not measure filter chip bounding boxes');
  if (Math.abs(todasBox.height - pelisBox.height) > 2) {
    throw new Error(`"Todas" chip height (${todasBox.height}) differs from sibling chip (${pelisBox.height}) - looks squished`);
  }
  log(`Filter chips render at consistent height (Todas=${todasBox.height}px, Películas=${pelisBox.height}px)`);

  // search filtering — the search box is now server-side and debounced
  // (300ms) and matches title, categories, and field values, not just title.
  const searchBox = page.getByPlaceholder('Buscar por título, texto, fecha, categoría o etiqueta...');
  await searchBox.fill('zzz');
  await page.waitForTimeout(500);
  await page.getByText('No hay notas', { exact: true }).waitFor();
  await searchBox.fill('casa');
  await page.waitForTimeout(500);
  await page.getByText('Casa Pepa').waitFor();
  await searchBox.fill('');
  await page.waitForTimeout(500);
  log('Search filters and clears correctly by title');

  // broadened search: should also match a tag value and a list-item value
  // buried inside the score's fields, not just the title.
  await searchBox.fill('Mediterránea');
  await page.waitForTimeout(500);
  await page.getByText('Casa Pepa').waitFor();
  await searchBox.fill('paella');
  await page.waitForTimeout(500);
  await page.getByText('Casa Pepa').waitFor();
  await searchBox.fill('');
  await page.waitForTimeout(500);
  await page.getByText('Casa Pepa').waitFor();
  log('Search also matches tag and list-item text inside the score\'s fields');

  // category chips (first match = filter chip row, rendered above the grid)
  // "Restaurantes" was untoggled in edit mode, so filter on one that's still set
  await page.getByText('Películas', { exact: true }).first().click();
  await page.getByText('Casa Pepa').waitFor();
  log('Category filter chip works');

  // ---------- session persistence across reload ----------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Tus puntuaciones').waitFor({ timeout: 120000 });
  log('Session persisted across reload (straight to Home, no login)');
  await shot(page, '09-home-after-reload');

  // ---------- side menu: dark mode toggle ----------
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Ajustes', { exact: false }).waitFor();
  await shot(page, '10-side-menu');
  await page.getByText('Ajustes', { exact: false }).click();
  await page.getByText('Modo oscuro', { exact: true }).waitFor();
  log('Settings screen opened from side menu');
  // react-native-web's Switch renders as <input type="checkbox" role="switch">
  // without an aria-checked attribute — read state via the checkbox's
  // checked property instead.
  const darkSwitch = page.getByRole('switch');
  await darkSwitch.waitFor();
  const beforeChecked = await darkSwitch.isChecked();
  await darkSwitch.click();
  await page.waitForTimeout(300);
  const afterChecked = await darkSwitch.isChecked();
  if (beforeChecked === afterChecked) throw new Error(`dark mode switch did not toggle (stayed checked=${beforeChecked})`);
  log(`Dark mode toggle switched checked ${beforeChecked} -> ${afterChecked}`);
  await shot(page, '11-dark-mode-on');
  // toggle back off so the rest of the run stays in light mode
  await darkSwitch.click();
  await page.waitForTimeout(300);
  await page.getByLabel('Volver').click();
  await page.getByText('Tus puntuaciones').waitFor();
  log('Dark mode toggled back off, returned to Home');

  // ---------- side menu: manage categories & tags (global delete) ----------
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Categorías y etiquetas', { exact: false }).click();
  await page.getByText('Categorías', { exact: true }).waitFor();
  await shot(page, '12-manage-labels');
  await page.getByLabel('Eliminar categoría Películas').click();
  await page.getByText('¿Eliminar "Películas"?').waitFor();
  await page.getByText('Eliminar', { exact: true }).click();
  // React Navigation keeps prior screens (Home, Detail) mounted-but-hidden
  // in the stack, so a plain text match for "Películas" would still find
  // those background chips and never report "detached" — the delete
  // button's own accessibility label is unique to this screen's row.
  await page.getByLabel('Eliminar categoría Películas').waitFor({ state: 'detached' });
  log('Category "Películas" deleted globally from Manage Labels screen');
  await page.getByLabel('Volver').click();
  await page.getByText('Tus puntuaciones').waitFor();

  // ---------- side menu: locations map ----------
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Mapa de ubicaciones', { exact: false }).click();
  await page.getByText('Mapa de ubicaciones', { exact: true }).waitFor(); // screen header
  await page.getByText('Casa Pepa', { exact: true }).last().waitFor({ timeout: 10000 });
  // avg of ratings 10 (owner), 6 (Marta), 8 (Ana) = 8, shown as a score badge
  await page.getByText('8', { exact: true }).last().waitFor({ timeout: 10000 });
  await shot(page, '14-locations-map');
  await page.getByText('Casa Pepa', { exact: true }).last().click();
  await page.getByText('Calle Mayor 12, Madrid').last().waitFor({ timeout: 10000 });
  log('Locations map lists the saved location and navigates to its Detail screen on tap');
  // Tapping a pin pushed Detail on top of LocationsMapScreen (not Home), so
  // going back lands on the map screen first, then Home — and Detail's own
  // back button plus the map screen's hidden-behind one both share the
  // "Volver" label, with the topmost (Detail's) last in DOM order since it
  // was pushed most recently.
  await page.getByLabel('Volver').last().click();
  await page.getByText('Mapa de ubicaciones', { exact: true }).waitFor();
  await page.getByLabel('Volver').last().click();
  await page.getByText('Tus puntuaciones').waitFor();

  // ---------- delete note with confirmation ----------
  // React Navigation keeps Home mounted-but-hidden underneath Detail once
  // pushed (only a plain goBack() unmounts it), so a plain text match for
  // "Casa Pepa" becomes ambiguous once both screens have rendered it at
  // some point — use the card's own accessibility label instead.
  await page.getByLabel('Ver Casa Pepa').click();
  await page.getByLabel('Eliminar puntuación').waitFor();
  await page.getByLabel('Eliminar puntuación').click();
  await page.getByText('¿Eliminar esta puntuación?').waitFor();
  await shot(page, '13-delete-confirm');
  // cancel first to make sure cancel doesn't delete
  await page.getByText('Cancelar', { exact: true }).click();
  await page.getByText('¿Eliminar esta puntuación?').waitFor({ state: 'detached' });
  log('Delete confirmation dialog cancels without deleting');
  // now actually delete
  await page.getByLabel('Eliminar puntuación').click();
  await page.getByText('¿Eliminar esta puntuación?').waitFor();
  await page.getByText('Eliminar', { exact: true }).click();
  await page.getByText('Tus puntuaciones').waitFor({ timeout: 10000 });
  await page.getByText('Casa Pepa').waitFor({ state: 'detached' });
  await page.getByText('Todavía no hay puntuaciones').waitFor();
  log('Score deleted after confirming, back on Home with card gone');

  // ---------- side menu: logout ----------
  await page.getByLabel('Abrir menú').click();
  await page.getByText('Cerrar sesión', { exact: false }).click();
  await page.getByText('Bienvenido de nuevo').waitFor({ timeout: 10000 });
  log('Logged out via side menu, back on login screen');

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
  if (debugPage) {
    try {
      await debugPage.screenshot({ path: `${SHOTS}/FAILURE.png` });
      const bodyText = await debugPage.evaluate(() => document.body.innerText);
      require('fs').writeFileSync(`${SHOTS}/FAILURE.txt`, bodyText);
    } catch (e2) {
      console.error('(failed to capture debug screenshot)', e2.message);
    }
  }
  process.exit(1);
});
