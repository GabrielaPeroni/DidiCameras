import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCameras } from '@/api/cameras'
import { getConfig, updateConfig } from '@/api/config'
import type { FFmpegConfig } from '@/api/types'
import { renderRoutes } from '@/test/render'

import { ConfigPage } from './ConfigPage'
import { DEFAULT_CONFIG } from './options'

vi.mock('@/api/config')
vi.mock('@/api/cameras')

const stored: FFmpegConfig = {
  recording_duration: 10,
  recording_resolution: '1920:1080',
  recording_format: 'mkv',
  recording_preset: 'slow',
  recording_crf: 22,
}

const renderPage = () => renderRoutes([{ path: '/', element: <ConfigPage /> }])

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue(stored)
    vi.mocked(updateConfig).mockImplementation((patch) => Promise.resolve({ ...stored, ...patch }))
    vi.mocked(listCameras).mockResolvedValue([
      { id: 1, name: 'cam1', location: 'Entrada', is_active: true, live_url: '' },
      { id: 2, name: 'cam2', location: 'Cozinha', is_active: false, live_url: '' },
    ])
  })

  it('shows the stored config and a summary', async () => {
    renderPage()

    expect(await screen.findByLabelText('Resolução')).toHaveValue('1920:1080')
    expect(screen.getByLabelText('Duração')).toHaveValue('10')
    expect(screen.getByLabelText('Qualidade (CRF)')).toHaveValue('22')
    expect(screen.getByText('.mkv')).toBeInTheDocument()
    expect(await screen.findByText('1/2')).toBeInTheDocument()
  })

  it('updates the summary live and PATCHes the edited config', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Qualidade (CRF)'), '32')
    expect(screen.getByText('Muito Baixa', { selector: 'dd' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Salvar Configurações' }))

    expect(updateConfig).toHaveBeenCalledWith({ ...stored, recording_crf: 32 })
    expect(await screen.findByRole('status')).toHaveTextContent('Configurações salvas.')
  })

  it('restores the defaults', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Restaurar Padrão' }))

    expect(updateConfig).toHaveBeenCalledWith(DEFAULT_CONFIG)
    expect(await screen.findByLabelText('Resolução')).toHaveValue('')
  })

  it('keeps an off-preset stored value selectable', async () => {
    vi.mocked(getConfig).mockResolvedValue({ ...stored, recording_crf: 24 })
    renderPage()

    expect(await screen.findByLabelText('Qualidade (CRF)')).toHaveValue('24')
    expect(screen.getByRole('option', { name: 'Média (24)' })).toBeInTheDocument()
  })

  it('reports save failures', async () => {
    vi.mocked(updateConfig).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Salvar Configurações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  })
})
