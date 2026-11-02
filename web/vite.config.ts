import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs separately on :4000; proxying keeps every
// request same-origin, exactly like production where Express serves both.
const API = process.env.API_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
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
