import { Calendar, Search } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import type { Camera, RecordingFilters as Filters } from '@/api/types'

export interface RecordingFiltersProps {
  filters: Filters
  cameras: readonly Camera[]
  onChange: (change: Partial<Record<keyof Filters, string | undefined>>) => void
}

const inputClasses =
  'w-full rounded-lg border border-neutral-300 bg-white py-2.5 pr-3 focus:ring-2 focus:ring-brand focus:outline-none'

export function RecordingFilters({ filters, cameras, onChange }: RecordingFiltersProps) {
  // Search commits on Enter (as in history.js) rather than on every keystroke.
  const [search, setSearch] = useState(filters.search ?? '')

  const submitSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    onChange({ search: search.trim() || undefined })
  }

  return (
    <form
      role="search"
      onSubmit={submitSearch}
      className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-neutral-200 bg-white p-5"
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="search" className="mb-1 block text-sm text-neutral-700">
          Pesquisar
        </label>
        <div className="relative">
          <Search
            size={18}
            aria-hidden
            className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="search"
            type="search"
            placeholder="Buscar por câmera ou arquivo…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            className={`${inputClasses} pl-9`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="camera" className="mb-1 block text-sm text-neutral-700">
          Câmera
        </label>
        <select
          id="camera"
          value={filters.camera ?? ''}
          onChange={(e) => {
            onChange({ camera: e.target.value || undefined })
          }}
          className={`${inputClasses} pl-3`}
        >
          <option value="">Todas</option>
          {cameras.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} — {c.location}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date" className="mb-1 block text-sm text-neutral-700">
          Data
        </label>
        <div className="relative">
          <Calendar
            size={18}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="date"
            type="date"
            value={filters.date ?? ''}
            onChange={(e) => {
              onChange({ date: e.target.value || undefined })
            }}
            className={`${inputClasses} pl-9`}
          />
        </div>
      </div>

      {/* Lets keyboard and screen-reader users submit the search without knowing Enter does it. */}
      <button type="submit" className="sr-only">
        Buscar
      </button>
    </form>
  )
}
