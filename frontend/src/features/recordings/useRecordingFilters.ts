import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { RecordingFilters } from '@/api/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Recording filters live in the URL (`?date=&search=&camera=&page=`), like the old GET form,
 * so filtered views can be bookmarked and the back button works.
 */
export function useRecordingFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<RecordingFilters>(() => {
    const result: RecordingFilters = {}
    const date = params.get('date')
    const search = params.get('search')?.trim()
    const camera = params.get('camera')
    const page = Number(params.get('page'))
    // Invalid dates were silently ignored server-side; do the same here.
    if (date && DATE_RE.test(date)) result.date = date
    if (search) result.search = search
    if (camera) result.camera = camera
    if (Number.isInteger(page) && page > 1) result.page = page
    return result
  }, [params])

  /** Merge a change into the filters; any change other than `page` resets to page 1. */
  const update = useCallback(
    (change: Partial<Record<keyof RecordingFilters, string | number | undefined>>) => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(change)) {
          if (value === undefined || value === '') next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in change)) next.delete('page')
        if (next.get('page') === '1') next.delete('page')
        return next
      })
    },
    [setParams],
  )

  return { filters, update }
}
