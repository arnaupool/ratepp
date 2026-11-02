import { defineConfig, devices } from '@playwright/test';

// E2E for the web app (web/), run in Chromium and in WebKit with an iPhone
// profile: the user runs the PWA in Safari on iOS, where keyboard, date
// picker and standalone-mode issues show up.
//
// By default it starts its own throwaway stack: embedded Postgres (dev/) and
// the API serving web/dist on :4100. Build the web app first
// (cd web && npm run build). Set E2E_BASE_URL to test a running server instead.
const PORT = 4100;
const external = process.env.E2E_BASE_URL;
const baseURL = external || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './web',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Request stubs (page.route) don't see requests that go through a service
    // worker in WebKit, so it's off everywhere except the PWA suite.
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
      testIgnore: /10-desktop/,
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
      testIgnore: /10-desktop/,
    },
    {
      // Computer browser: the wide layout, plus the whole journey on it.
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testMatch: /(09-full-flow|10-desktop)\.spec\.ts/,
    },
  ],
  webServer: external
    ? undefined
    : [
        {
          command: 'node ../dev/db.mjs',
          port: 5433,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'node stub-geocoder.mjs',
          port: 4199,
          reuseExistingServer: true,
        },
        {
          command: 'node src/migrate.js && node src/index.js',
          cwd: '../backend',
          url: `${baseURL}/health`,
          reuseExistingServer: true,
          timeout: 60_000,
          env: {
            PORT: String(PORT),
            DATABASE_URL: 'postgres://puntuaciones:puntuaciones@localhost:5433/puntuaciones',
            JWT_SECRET: 'e2e-only-secret-0123456789abcdef',
            UPLOADS_DIR: '../dev/uploads-e2e',
            WEB_DIST_DIR: '../web/dist',
            // The suite registers a fresh user per test.
            AUTH_RATE_LIMIT_MAX: '10000',
            GEOCODER_URL: 'http://localhost:4199',
          },
        },
      ],
});
