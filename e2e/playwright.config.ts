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
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
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
            PUBLIC_URL: `http://localhost:${PORT}`,
            WEB_DIST_DIR: '../web/dist',
          },
        },
      ],
});
