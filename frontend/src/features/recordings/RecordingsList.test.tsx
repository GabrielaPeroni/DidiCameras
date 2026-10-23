import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCameras } from '@/api/cameras'
import { ApiError } from '@/api/client'
import { listRecordings } from '@/api/recordings'
import { cameras, makeRecording, page } from '@/test/fixtures'
import { renderRoutes } from '@/test/render'

import { RecordingsList } from './RecordingsList'

vi.mock('@/api/recordings')
vi.mock('@/api/cameras')

const renderList = (url = '/history') =>
  renderRoutes([{ path: '/history', element: <RecordingsList /> }], { initialEntries: [url] })

const lastFilters = () => vi.mocked(listRecordings).mock.lastCall?.[0]

describe('RecordingsList', () => {
  beforeEach(() => {
    vi.mocked(listCameras).mockResolvedValue(cameras)
    vi.mocked(listRecordings).mockResolvedValue(
      page([makeRecording(), makeRecording({ id: 18, s3_url: '' })]),
    )
  })

  it('renders a card per recording with a watch link only when there is a file', async () => {
    renderList()

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    const [first, second] = items
    if (!first || !second) throw new Error('expected two cards')

    expect(within(first).getByText('02/01/2025')).toBeInTheDocument()
    expect(within(first).getByText('10:30')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: /Assistir/ })).toHaveAttribute(
      'href',
      '/cam1/17',
    )
    expect(within(second).queryByRole('link')).not.toBeInTheDocument()
    expect(within(second).getByText('Nenhum arquivo')).toBeInTheDocument()
  })

  it('reads initial filters from the URL and ignores malformed dates', async () => {
    renderList('/history?search=cozinha&date=not-a-date&page=2')

    await screen.findAllByRole('listitem')
    expect(lastFilters()).toEqual({ search: 'cozinha', page: 2 })
    expect(screen.getByRole('searchbox')).toHaveValue('cozinha')
  })

  it('writes filter changes to the URL and resets to page 1', async () => {
    const user = userEvent.setup()
    const { router } = renderList('/history?page=3')
    await screen.findAllByRole('listitem')

    await user.selectOptions(screen.getByLabelText('Câmera'), 'cam2')
    expect(router.state.location.search).toBe('?camera=cam2')

    await user.type(screen.getByRole('searchbox'), 'entrada{Enter}')
    expect(router.state.location.search).toBe('?camera=cam2&search=entrada')
    expect(lastFilters()).toEqual({ camera: 'cam2', search: 'entrada' })
  })

  it('paginates with the next/previous links from DRF', async () => {
    vi.mocked(listRecordings).mockResolvedValue(
      page([makeRecording()], { count: 40, next: '/api/recordings/?page=2' }),
    )
    const user = userEvent.setup()
    const { router } = renderList()

    expect(await screen.findByRole('button', { name: /Anterior/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Próxima/ }))

    expect(router.state.location.search).toBe('?page=2')
    expect(lastFilters()).toEqual({ page: 2 })
  })

  it('shows the empty state', async () => {
    vi.mocked(listRecordings).mockResolvedValue(page([]))
    renderList()

    expect(await screen.findByText('Nenhuma gravação encontrada.')).toBeInTheDocument()
  })

  it('falls back to page 1 when the requested page no longer exists', async () => {
    vi.mocked(listRecordings).mockImplementation((filters = {}) =>
      filters.page
        ? Promise.reject(new ApiError(404, { detail: 'Invalid page.' }))
        : Promise.resolve(page([makeRecording()])),
    )
    const { router } = renderList('/history?camera=cam1&page=9')

    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
    expect(router.state.location.search).toBe('?camera=cam1')
  })
})
