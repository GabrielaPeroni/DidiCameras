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
    coverage: {
      provider: 'v8',
      // Count every source file, not only the ones some test happened to import.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/api/schema.gen.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'text', 'json-summary'],
      thresholds: { statements: 90, branches: 80, functions: 85, lines: 90 },
    },
  },
}))
