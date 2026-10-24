import { expect, type Page, test } from '@playwright/test'

// Demo accounts created by `seed_demo_data` in the mock stack.
async function logIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(username)
  await page.getByPlaceholder('Senha').fill(username)
  await page.getByRole('button', { name: 'ENTRAR' }).click()
}

test('viewer: camera grid, live view, history filter, playback, logout', async ({ page }) => {
  await logIn(page, 'viewer')

  // Camera grid: three seeded cameras, cam3 offline.
  await expect(page).toHaveURL(/\/camera$/)
  await expect(page.getByRole('button', { name: /^Abrir Live de cam/ })).toHaveCount(3)
  await expect(page.getByText('Visitante')).toBeVisible()

  // Live view embeds the camera's WebRTC page from the fake camera host.
  await page.getByRole('button', { name: 'Abrir Live de cam1' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('iframe')).toHaveAttribute('src', 'http://localhost:8889/cam1')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // History, filtered by camera through the URL.
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: /Histórico/ })
    .click()
  await page.getByLabel('Câmera').selectOption('cam2')
  await expect(page).toHaveURL(/camera=cam2/)
  const cards = page.getByRole('link', { name: /Assistir gravação de/ })
  await expect(cards).toHaveCount(4)
  await expect(page.getByRole('link', { name: /Assistir gravação de cam1/ })).toHaveCount(0)

  // Playback: the seeded clip actually loads from the fake S3 bucket.
  await cards.first().click()
  const video = page.locator('video')
  await expect(video).toHaveAttribute(
    'src',
    /localhost:8333\/bucket-recordings\/recordings\/cam2\//,
  )
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(1) // HAVE_METADATA: the mp4 was fetched and parsed

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/history')
  await expect(page).toHaveURL(/\/login$/)
})

test('admin: edit and reset the recording config', async ({ page }) => {
  await logIn(page, 'admin')
  await expect(page.getByText('Administrador')).toBeVisible()
  await page.goto('/config')

  const format = page.getByLabel('Formato')
  await format.selectOption('mkv')
  await page.getByRole('button', { name: 'Salvar Configurações' }).click()
  await expect(page.getByRole('status')).toHaveText('Configurações salvas.')

  // Persisted server-side, not just in the form state.
  await page.reload()
  await expect(page.getByLabel('Formato')).toHaveValue('mkv')

  await page.getByRole('button', { name: 'Restaurar Padrão' }).click()
  await expect(page.getByRole('status')).toHaveText('Configurações restauradas para o padrão.')
  await expect(page.getByLabel('Formato')).toHaveValue('mp4')
})

test('live HLS flows through the authenticated stream proxy', async ({ page }) => {
  await logIn(page, 'viewer')
  await expect(page).toHaveURL(/\/camera$/)

  // Same session cookie the SPA's hls.js player would use.
  const master = await page.request.get('/api/stream/cam1/index.m3u8')
  expect(master.ok()).toBe(true)
  const variant = (await master.text()).split('\n').find((l) => l && !l.startsWith('#'))
  expect(variant).toBeTruthy()

  // The camera starts on demand, so the first variant playlist may not list segments yet.
  let segment: string | undefined
  await expect
    .poll(
      async () => {
        const body = await (await page.request.get(`/api/stream/cam1/${variant ?? ''}`)).text()
        segment = body.split('\n').findLast((l) => l && !l.startsWith('#'))
        return segment
      },
      { timeout: 20_000 },
    )
    .toBeTruthy()

  const ts = await page.request.get(`/api/stream/cam1/${segment ?? ''}`)
  expect(ts.ok()).toBe(true)
  expect(ts.headers()['content-type']).toBe('video/mp2t')
  expect((await ts.body()).length).toBeGreaterThan(1000)

  await page.context().clearCookies()
  expect((await page.request.get('/api/stream/cam1/index.m3u8')).status()).toBe(403)
})
