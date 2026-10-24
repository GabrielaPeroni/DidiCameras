import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getRecording, listRecordings } from '@/api/recordings'
import type { RecordingFilters } from '@/api/types'

export const recordingKeys = {
  all: ['recordings'] as const,
  list: (filters: RecordingFilters) => [...recordingKeys.all, 'list', filters] as const,
  detail: (id: number) => [...recordingKeys.all, 'detail', id] as const,
}

export const useRecordings = (filters: RecordingFilters) =>
  useQuery({
    queryKey: recordingKeys.list(filters),
    queryFn: ({ signal }) => listRecordings(filters, signal),
    // Keep the current page on screen while the next filter/page loads.
    placeholderData: keepPreviousData,
  })

export const useRecording = (id: number) =>
  useQuery({
    queryKey: recordingKeys.detail(id),
    queryFn: ({ signal }) => getRecording(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
