// Renders the app icons (white Poppins 900 "P" on the accent color) with a
// headless browser so the glyph matches the in-app logo exactly.
//   node dev/make-icons.cjs     (needs e2e/ and web/ dependencies installed)
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../e2e/node_modules/playwright'));

const ACCENT = '#d75a21'; // --accent, oklch(0.62 0.17 42)
const font = fs.readFileSync(path.join(__dirname, '../web/node_modules/@fontsource/poppins/files/poppins-latin-900-normal.woff2')).toString('base64');
const outDir = path.join(__dirname, '../web/public/icons');

// rounded: corners like the login logo (radius 18/60); full-bleed variants
// are for iOS (which masks its own corners) and Android maskable icons.
const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, letter: 0.45 },
  { file: 'icon-512.png', size: 512, rounded: true, letter: 0.45 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, letter: 0.36 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, letter: 0.45 },
  { file: 'favicon-32.png', size: 32, rounded: true, letter: 0.5 },
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const icon of ICONS) {
    const s = icon.size;
    await page.setViewportSize({ width: s, height: s });
    await page.setContent(`<!doctype html><html><head><style>
      @font-face { font-family: P; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 900; }
      html, body { margin: 0; background: transparent; }
      div { width: ${s}px; height: ${s}px; background: ${ACCENT}; border-radius: ${icon.rounded ? (s * 18) / 60 : 0}px;
            display: flex; align-items: center; justify-content: center;
            font: 900 ${Math.round(s * icon.letter)}px P; color: #fff; line-height: 1; padding-top: ${Math.round(s * 0.03)}px; box-sizing: border-box; }
    </style></head><body><div>P</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('div').screenshot({ path: path.join(outDir, icon.file), omitBackground: true });
    console.log('wrote', icon.file);
  }
  await browser.close();
})();
