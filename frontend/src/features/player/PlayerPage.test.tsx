import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { getRecording } from '@/api/recordings'
import { makeRecording } from '@/test/fixtures'
import { renderRoutes } from '@/test/render'

import { PlayerPage } from './PlayerPage'

vi.mock('@/api/recordings')

const renderPlayer = (url: string) =>
  renderRoutes([{ path: '/:cameraId/:recordingId', element: <PlayerPage /> }], {
    initialEntries: [url],
  })

describe('PlayerPage', () => {
  beforeEach(() => {
    vi.mocked(getRecording).mockResolvedValue(makeRecording())
  })

  it('plays the direct URL and shows recording details', async () => {
    const { container } = renderPlayer('/cam1/17')

    expect(await screen.findByRole('heading', { name: 'Câmera: cam1' })).toBeInTheDocument()
    expect(getRecording).toHaveBeenCalledWith(17, expect.any(AbortSignal))
    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'https://recordings.didicameras.live/cam1/2025-01-02_10-30.mp4',
    )
    expect(screen.getByText('5:00')).toBeInTheDocument()
    expect(screen.getByText('50 MB')).toBeInTheDocument()
    expect(screen.getByText('MP4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Baixar Vídeo/ })).toHaveAttribute('download')
  })

  it('treats a camera/recording mismatch as not found', async () => {
    renderPlayer('/cam3/17')

    expect(await screen.findByText('Gravação não encontrada.')).toBeInTheDocument()
  })

  it('shows not found for a 404', async () => {
    vi.mocked(getRecording).mockRejectedValue(new ApiError(404, { detail: 'Not found.' }))
    renderPlayer('/cam1/999')

    expect(await screen.findByText('Gravação não encontrada.')).toBeInTheDocument()
  })

  it('does not fetch for a non-numeric id', () => {
    renderPlayer('/cam1/abc')

    expect(screen.getByText('Gravação não encontrada.')).toBeInTheDocument()
    expect(getRecording).not.toHaveBeenCalled()
  })

  it('explains when the file is no longer available', async () => {
    vi.mocked(getRecording).mockResolvedValue(makeRecording({ public_direct_url: '' }))
    renderPlayer('/cam1/17')

    expect(await screen.findByText('Este vídeo não está mais disponível.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument()
  })
})
