import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCameras } from '@/api/cameras'
import { cameras } from '@/test/fixtures'
import { renderRoutes } from '@/test/render'

import { CamerasPage } from './CamerasPage'
import { toLiveHref } from './liveUrl'

vi.mock('@/api/cameras')

const renderPage = () => renderRoutes([{ path: '/', element: <CamerasPage /> }])

describe('toLiveHref', () => {
  it.each([
    ['rtc.didicameras.live/cam1', 'https://rtc.didicameras.live/cam1'],
    ['https://rtc.didicameras.live/cam1', 'https://rtc.didicameras.live/cam1'],
    ['  ', null],
  ])('%j -> %j', (input, expected) => {
    expect(toLiveHref(input)).toBe(expected)
  })
})

describe('CamerasPage', () => {
  beforeEach(() => {
    vi.mocked(listCameras).mockResolvedValue([
      ...cameras,
      { id: 3, name: 'cam3', location: 'Cozinha', is_active: true, live_url: '' },
    ])
  })

  it('renders a tile per camera with live status', async () => {
    renderPage()

    const tiles = await screen.findAllByRole('listitem')
    expect(tiles).toHaveLength(3)
    const [cam1, cam2, cam3] = tiles
    if (!cam1 || !cam2 || !cam3) throw new Error('expected three tiles')

    expect(within(cam1).getByRole('img', { name: 'Online' })).toBeInTheDocument()
    expect(within(cam2).getByRole('img', { name: 'Offline' })).toBeInTheDocument()
    expect(within(cam3).getByText('Nenhum Link')).toBeInTheDocument()
    expect(within(cam3).queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens the live stream in a modal and tears it down on close', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Abrir Live de cam1' }))

    const dialog = screen.getByRole('dialog', { name: 'Ao vivo: cam1 — Entrada' })
    expect(within(dialog).getByTitle('Ao vivo: cam1 — Entrada')).toHaveAttribute(
      'src',
      'https://rtc.didicameras.live/cam1',
    )
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir Live de cam1' })).toHaveFocus()
  })

  it('closes from the close button', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Abrir Live de cam2' }))
    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    vi.mocked(listCameras).mockRejectedValueOnce(new Error('down'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findAllByRole('listitem')).toHaveLength(3)
  })
})
