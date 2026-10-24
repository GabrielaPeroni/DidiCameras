import { request } from './client'
import type { FFmpegConfig } from './types'

export const getConfig = (signal?: AbortSignal) =>
  request<FFmpegConfig>('/config/', signal ? { signal } : {})

export const updateConfig = (patch: Partial<FFmpegConfig>) =>
  request<FFmpegConfig>('/config/', { method: 'PATCH', body: patch })
