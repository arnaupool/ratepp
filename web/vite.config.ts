import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// In development the API runs separately on :4000; proxying keeps every
// request same-origin, exactly like production where Express serves both.
const API = process.env.API_URL || 'http://localhost:4000';
const BG_LIGHT = '#fbf4eb'; // --bg (light), oklch(0.97 0.014 75)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A new version is offered with "Hay una versión nueva" (see
      // UpdateBanner) instead of reloading the page under the user.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png', 'theme-init.js'],
      manifest: {
        name: 'Puntuaciones',
        short_name: 'Puntuaciones',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: BG_LIGHT,
        background_color: BG_LIGHT,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the app shell is precached. The API is never cached: data
        // always comes from the server.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/health$/],
        cleanupOutdatedCaches: true,
        // Notifications: the push and notificationclick handlers.
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // Uploaded photos never change (random names), so they can be
            // served from the cache.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/health': API,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
