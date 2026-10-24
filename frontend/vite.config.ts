import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Django dev server; override with DJANGO_URL when it runs elsewhere.
const djangoUrl = process.env.DJANGO_URL ?? 'http://127.0.0.1:8000'

export default defineConfig(({ command }) => ({
  // Production assets are served by Django/WhiteNoise under STATIC_URL; the dev server uses `/`.
  base: command === 'build' ? '/static/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Same-origin in dev so Django's session + CSRF cookies just work.
    proxy: {
      '/api': { target: djangoUrl, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Playwright specs (e2e/) run against the real mock stack, not in jsdom.
    exclude: ['e2e/**', 'node_modules/**'],
  },
}))
