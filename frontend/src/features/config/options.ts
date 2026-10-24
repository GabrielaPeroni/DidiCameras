import type { FFmpegConfig, FFmpegSettings } from '@/api/types'

/**
 * Select options and display labels for the FFmpeg config form. Mirrors
 * `FFmpegConfig.get_resolution_display` / `get_crf_display` and the options in `config.html`.
 */

export const DURATION_OPTIONS = [1, 5, 10, 15, 30] as const

export const RESOLUTION_OPTIONS = [
  { value: '480:360', label: 'Baixa' },
  { value: '1080:720', label: 'Média' },
  { value: '1920:1080', label: 'Alta' },
  { value: '', label: 'Nativa' },
] as const
export type Resolution = (typeof RESOLUTION_OPTIONS)[number]['value']

export const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'avi', label: 'AVI' },
  { value: 'mkv', label: 'MKV' },
] as const
export type VideoFormat = (typeof FORMAT_OPTIONS)[number]['value']

/** One representative CRF per quality band; the backend accepts any 18..32. */
export const CRF_OPTIONS = [
  { value: 18, label: 'Alta' },
  { value: 22, label: 'Média' },
  { value: 28, label: 'Baixa' },
  { value: 32, label: 'Muito Baixa' },
] as const

export const PRESET_OPTIONS = [
  { value: 'slow', label: 'Lenta' },
  { value: 'medium', label: 'Média' },
  { value: 'veryfast', label: 'Rápida' },
  { value: 'ultrafast', label: 'Muito Rápida' },
] as const
export type Preset = (typeof PRESET_OPTIONS)[number]['value']

/** The editable subset of a config response (drops the server-computed `*_display` labels). */
export function toSettings(config: FFmpegConfig): FFmpegSettings {
  const {
    recording_duration,
    recording_resolution,
    recording_format,
    recording_preset,
    recording_crf,
  } = config
  return {
    recording_duration,
    recording_resolution,
    recording_format,
    recording_preset,
    recording_crf,
  }
}

export function resolutionLabel(resolution: string): string {
  return RESOLUTION_OPTIONS.find((o) => o.value === resolution)?.label ?? (resolution || 'Nativa')
}

/** Half-open bands, exactly like the backend: [18,22) Alta, [22,26) Média, [26,30) Baixa, [30,33) Muito Baixa. */
const CRF_BANDS = [
  { min: 18, max: 22, label: 'Alta' },
  { min: 22, max: 26, label: 'Média' },
  { min: 26, max: 30, label: 'Baixa' },
  { min: 30, max: 33, label: 'Muito Baixa' },
] as const

export function crfLabel(crf: number): string {
  return CRF_BANDS.find(({ min, max }) => crf >= min && crf < max)?.label ?? 'Indefinido'
}
