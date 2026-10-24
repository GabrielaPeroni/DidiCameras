import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

import { ApiError } from '@/api/client'
import { Button, EmptyState, ErrorState, Spinner } from '@/components/ui'
import { useCameras } from '@/features/cameras/queries'

import { RecordingCard } from './RecordingCard'
import { RecordingFilters } from './RecordingFilters'
import { useRecordings } from './queries'
import { useRecordingFilters } from './useRecordingFilters'

/**
 * Filterable, paginated recordings grid. One component instead of the copy-pasted
 * `camera_view`/`history_view` pair; filters are read from and written to the URL.
 */
export function RecordingsList() {
  const { filters, update } = useRecordingFilters()
  const recordings = useRecordings(filters)
  const cameras = useCameras()
  const page = filters.page ?? 1

  // DRF answers 404 "Invalid page" past the last page (stale bookmark, or the last item on the
  // final page was deleted). Fall back to page 1 instead of a Retry that can never succeed.
  const pageOutOfRange =
    page > 1 && recordings.error instanceof ApiError && recordings.error.status === 404
  useEffect(() => {
    if (pageOutOfRange) update({ page: undefined })
  }, [pageOutOfRange, update])

  return (
    <section aria-label="Gravações">
      <RecordingFilters
        // Re-seed the search box when the URL changes underneath it (back/forward).
        key={filters.search ?? ''}
        filters={filters}
        cameras={cameras.data ?? []}
        onChange={update}
      />

      {recordings.isPending ? (
        <Spinner label="Carregando gravações…" />
      ) : recordings.isError ? (
        <ErrorState
          message="Não foi possível carregar as gravações."
          onRetry={() => void recordings.refetch()}
        />
      ) : recordings.data.results.length === 0 ? (
        <EmptyState>Nenhuma gravação encontrada.</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500" aria-live="polite">
            {recordings.data.count} {recordings.data.count === 1 ? 'gravação' : 'gravações'}
          </p>
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-5"
            aria-busy={recordings.isPlaceholderData}
          >
            {recordings.data.results.map((recording) => (
              <li key={recording.id}>
                <RecordingCard recording={recording} />
              </li>
            ))}
          </ul>

          {(recordings.data.previous !== null || recordings.data.next !== null) && (
            <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                disabled={!recordings.data.previous || recordings.isPlaceholderData}
                onClick={() => {
                  update({ page: page - 1 })
                }}
              >
                <ChevronLeft size={18} aria-hidden /> Anterior
              </Button>
              <span className="text-sm text-neutral-600">Página {page}</span>
              <Button
                variant="secondary"
                disabled={!recordings.data.next || recordings.isPlaceholderData}
                onClick={() => {
                  update({ page: page + 1 })
                }}
              >
                Próxima <ChevronRight size={18} aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
