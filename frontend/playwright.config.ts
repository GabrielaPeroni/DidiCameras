import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the full mock stack (docker-compose.mock.yml, `--profile app`):
 * the production image serving the built SPA, Postgres, fake cameras and fake S3. Start it
 * first; nothing here builds or launches servers:
 *
 *   docker compose -f docker-compose.mock.yml --profile app up -d --build --wait
 *   npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared, seeded database
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video needs Playwright's own ffmpeg download; traces already include a screencast.
    video: process.env.CI ? 'off' : 'retain-on-failure',
  },
  // Installed Google Chrome, not Playwright's Chromium: recordings are H.264 MP4 and the bundled
  // Chromium has no proprietary codecs. GitHub's Ubuntu runners ship Chrome, so CI downloads nothing.
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
