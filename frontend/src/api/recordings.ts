import { request } from './client'
import type { Paginated, Recording, RecordingFilters } from './types'

export const listRecordings = (filters: RecordingFilters = {}, signal?: AbortSignal) =>
  request<Paginated<Recording>>('/recordings/', {
    query: { ...filters },
    ...(signal && { signal }),
  })

export const getRecording = (id: number, signal?: AbortSignal) =>
  request<Recording>(`/recordings/${id}/`, signal ? { signal } : {})
