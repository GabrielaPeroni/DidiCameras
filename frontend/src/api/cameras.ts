import { request } from './client'
import type { Camera } from './types'

export const listCameras = (signal?: AbortSignal) =>
  request<Camera[]>('/cameras/', signal ? { signal } : {})
