import { request } from './client'
import type { FFmpegConfig, FFmpegConfigPatch } from './types'

export const getConfig = (signal?: AbortSignal) =>
  request<FFmpegConfig>('/config/', signal ? { signal } : {})

export const updateConfig = (patch: FFmpegConfigPatch) =>
  request<FFmpegConfig>('/config/', { method: 'PATCH', body: patch })

/** Server-side `FFmpegConfig.reset_to_default()`. */
export const resetConfig = () => request<FFmpegConfig>('/config/reset/', { method: 'POST' })
