import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCameras } from '@/api/cameras'
import { getConfig, resetConfig, updateConfig } from '@/api/config'
import type { FFmpegConfig, FFmpegSettings } from '@/api/types'
import { cameras } from '@/test/fixtures'
import { ApiError } from '@/api/client'
import { fakeAuth, renderRoutes, testUser } from '@/test/render'

import { ConfigPage } from './ConfigPage'

vi.mock('@/api/config')
vi.mock('@/api/cameras')

const settings: FFmpegSettings = {
  recording_duration: 10,
  recording_resolution: '1920:1080',
  recording_format: 'mkv',
  recording_preset: 'slow',
  recording_crf: 22,
}
const stored: FFmpegConfig = { ...settings, resolution_display: 'Alta', crf_display: 'Média' }

const staff = fakeAuth({
  state: { status: 'authenticated', user: { ...testUser, is_staff: true } },
})

const renderPage = (auth = staff) =>
  renderRoutes([{ path: '/', element: <ConfigPage /> }], { auth })

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue(stored)
    vi.mocked(updateConfig).mockImplementation((patch) => Promise.resolve({ ...stored, ...patch }))
    vi.mocked(resetConfig).mockResolvedValue({
      recording_duration: 5,
      recording_resolution: '',
      recording_format: 'mp4',
      recording_preset: 'veryfast',
      recording_crf: 28,
      resolution_display: 'Nativa',
      crf_display: 'Baixa',
    })
    vi.mocked(listCameras).mockResolvedValue(cameras)
  })

  it('shows the stored config and a summary', async () => {
    renderPage()

    expect(await screen.findByLabelText('Resolução')).toHaveValue('1920:1080')
    expect(screen.getByLabelText('Duração')).toHaveValue('10')
    expect(screen.getByLabelText('Qualidade (CRF)')).toHaveValue('22')
    expect(screen.getByText('.mkv')).toBeInTheDocument()
    expect(await screen.findByText('1/2')).toBeInTheDocument()
  })

  it('updates the summary live and PATCHes only the writable fields', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Qualidade (CRF)'), '32')
    expect(screen.getByText('Muito Baixa', { selector: 'dd' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Salvar Configurações' }))

    expect(updateConfig).toHaveBeenCalledWith({ ...settings, recording_crf: 32 })
    expect(await screen.findByRole('status')).toHaveTextContent('Configurações salvas.')
  })

  it('restores the defaults through the reset endpoint', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Restaurar Padrão' }))

    expect(resetConfig).toHaveBeenCalledOnce()
    expect(updateConfig).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('restauradas')
    expect(screen.getByLabelText('Resolução')).toHaveValue('')
    expect(screen.getByLabelText('Formato')).toHaveValue('mp4')
  })

  it('keeps an off-preset stored value selectable', async () => {
    vi.mocked(getConfig).mockResolvedValue({ ...stored, recording_crf: 24 })
    renderPage()

    expect(await screen.findByLabelText('Qualidade (CRF)')).toHaveValue('24')
    expect(screen.getByRole('option', { name: 'Média (24)' })).toBeInTheDocument()
  })

  it('treats a blank stored format as mp4', async () => {
    vi.mocked(getConfig).mockResolvedValue({ ...stored, recording_format: '' })
    renderPage()

    expect(await screen.findByLabelText('Formato')).toHaveValue('mp4')
    expect(screen.getByText('.mp4')).toBeInTheDocument()
  })

  it('reports save failures', async () => {
    vi.mocked(updateConfig).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Salvar Configurações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  })

  it('explains a 403 instead of a generic failure', async () => {
    vi.mocked(updateConfig).mockRejectedValue(new ApiError(403, { detail: 'nope' }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Salvar Configurações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('não tem permissão')
  })

  it('is read-only for non-staff users', async () => {
    renderPage(fakeAuth())

    expect(await screen.findByRole('note')).toHaveTextContent('Somente administradores')
    expect(screen.getByLabelText('Resolução')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar Configurações' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Restaurar Padrão' })).toBeDisabled()
    // The stored values are still shown.
    expect(screen.getByLabelText('Resolução')).toHaveValue('1920:1080')
  })
})
