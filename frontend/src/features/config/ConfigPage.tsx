import { useState, type SubmitEvent, type ReactNode } from 'react'

import type { FFmpegConfig } from '@/api/types'
import { Button, Card, ErrorState, PageHeader, Spinner } from '@/components/ui'
import { useCameras } from '@/features/cameras/queries'

import {
  CRF_OPTIONS,
  crfLabel,
  DEFAULT_CONFIG,
  DURATION_OPTIONS,
  FORMAT_OPTIONS,
  PRESET_OPTIONS,
  RESOLUTION_OPTIONS,
  resolutionLabel,
} from './options'
import { useConfig, useUpdateConfig } from './queries'

export function ConfigPage() {
  const config = useConfig()

  return (
    <>
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Personalize as configurações de gravação e monitoramento do DidiLanches"
      />
      {config.isPending ? (
        <Spinner />
      ) : config.isError ? (
        <ErrorState
          message="Não foi possível carregar as configurações."
          onRetry={() => void config.refetch()}
        />
      ) : (
        <ConfigForm saved={config.data} />
      )}
    </>
  )
}

type Feedback = { kind: 'success' | 'error'; message: string } | null

function ConfigForm({ saved }: { saved: FFmpegConfig }) {
  const [draft, setDraft] = useState<FFmpegConfig>(saved)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const update = useUpdateConfig()
  const cameras = useCameras()

  const set = <K extends keyof FFmpegConfig>(key: K, value: FFmpegConfig[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setFeedback(null)
  }

  const save = (values: FFmpegConfig, successMessage: string) => {
    update.mutate(values, {
      onSuccess: (stored) => {
        // The backend normalises values (rounding, CRF floor), so show what it actually stored.
        setDraft(stored)
        setFeedback({ kind: 'success', message: successMessage })
      },
      onError: () => {
        setFeedback({ kind: 'error', message: 'Não foi possível salvar. Tente novamente.' })
      },
    })
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    save(draft, 'Configurações salvas.')
  }

  const activeCameras = cameras.data?.filter((c) => c.is_active).length

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold">Configurações de Gravação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duração" htmlFor="duration">
            <select
              id="duration"
              value={draft.recording_duration}
              onChange={(e) => {
                set('recording_duration', Number(e.target.value))
              }}
              className={selectClasses}
            >
              {withCurrent(
                DURATION_OPTIONS.map((m) => ({ value: m, label: minutes(m) })),
                draft.recording_duration,
                minutes,
              ).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Resolução" htmlFor="resolution">
            <select
              id="resolution"
              value={draft.recording_resolution}
              onChange={(e) => {
                set('recording_resolution', e.target.value)
              }}
              className={selectClasses}
            >
              {withCurrent(RESOLUTION_OPTIONS, draft.recording_resolution, resolutionLabel).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Formato" htmlFor="format">
            <select
              id="format"
              value={draft.recording_format}
              onChange={(e) => {
                set('recording_format', e.target.value)
              }}
              className={selectClasses}
            >
              {withCurrent(FORMAT_OPTIONS, draft.recording_format, (v) => v.toUpperCase()).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Qualidade (CRF)" htmlFor="crf">
            <select
              id="crf"
              value={draft.recording_crf}
              onChange={(e) => {
                set('recording_crf', Number(e.target.value))
              }}
              className={selectClasses}
            >
              {withCurrent(CRF_OPTIONS, draft.recording_crf, (v) => `${crfLabel(v)} (${v})`).map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Compressão" htmlFor="preset">
            <select
              id="preset"
              value={draft.recording_preset}
              onChange={(e) => {
                set('recording_preset', e.target.value)
              }}
              className={selectClasses}
            >
              {withCurrent(PRESET_OPTIONS, draft.recording_preset, (v) => v).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="bg-ink text-white">
          <h2 className="mb-2 font-bold">Resumo</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
            <SummaryRow term="Resolução" value={resolutionLabel(draft.recording_resolution)} />
            <SummaryRow term="Duração" value={minutes(draft.recording_duration)} />
            <SummaryRow term="Qualidade" value={crfLabel(draft.recording_crf)} />
            <SummaryRow term="Formato" value={`.${draft.recording_format}`} />
            <SummaryRow
              term="Câmeras ativas"
              value={
                cameras.data && activeCameras !== undefined
                  ? `${activeCameras}/${cameras.data.length}`
                  : '—'
              }
            />
          </dl>
        </Card>

        {feedback && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={feedback.kind === 'error' ? 'text-red-700' : 'text-green-700'}
          >
            {feedback.message}
          </p>
        )}

        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Salvando…' : 'Salvar Configurações'}
        </Button>
        <Button
          variant="secondary"
          disabled={update.isPending}
          onClick={() => {
            save(DEFAULT_CONFIG, 'Configurações restauradas para o padrão.')
          }}
        >
          Restaurar Padrão
        </Button>
      </div>
    </form>
  )
}

const selectClasses =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-brand focus:outline-none'

const minutes = (m: number) => `${m} ${m === 1 ? 'minuto' : 'minutos'}`

/** Keep a stored value selectable even when it isn't one of the preset options (e.g. CRF 24). */
function withCurrent<V extends string | number>(
  options: readonly { value: V; label: string }[],
  current: V,
  label: (value: V) => string,
): readonly { value: V; label: string }[] {
  return options.some((o) => o.value === current)
    ? options
    : [...options, { value: current, label: label(current) }]
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  )
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <>
      <dt className="text-ink-muted">{term}:</dt>
      <dd className="text-brand font-bold">{value}</dd>
    </>
  )
}
