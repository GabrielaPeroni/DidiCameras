import { ArrowLeft, Calendar, Camera as CameraIcon, Download, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { ApiError } from '@/api/client'
import type { Recording } from '@/api/types'
import { buttonClasses } from '@/components/buttonClasses'
import { Card, EmptyState, ErrorState, Spinner } from '@/components/ui'
import { useRecording } from '@/features/recordings/queries'
import { fileExtension, formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { paths } from '@/routes/paths'

import { VideoPlayer } from './VideoPlayer'

export function PlayerPage() {
  const { cameraId = '', recordingId = '' } = useParams()
  const id = Number(recordingId)
  const recording = useRecording(id)

  // Same lookup as `recording_detail`: the id must exist *and* belong to the camera in the URL.
  const notFound =
    !Number.isInteger(id) ||
    id <= 0 ||
    (recording.error instanceof ApiError && recording.error.status === 404) ||
    (recording.data !== undefined &&
      recording.data.camera.name.toLowerCase() !== cameraId.toLowerCase())

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={paths.history}
        className="mb-4 inline-flex items-center gap-1 text-neutral-600 hover:text-black"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar para lista
      </Link>

      {notFound ? (
        <EmptyState>Gravação não encontrada.</EmptyState>
      ) : recording.isPending ? (
        <Spinner label="Carregando gravação…" />
      ) : recording.isError ? (
        <ErrorState
          message="Não foi possível carregar a gravação."
          onRetry={() => void recording.refetch()}
        />
      ) : (
        <RecordingView recording={recording.data} />
      )}
    </div>
  )
}

function RecordingView({ recording }: { recording: Recording }) {
  const { camera } = recording
  const videoUrl = recording.public_direct_url
  const format = fileExtension(recording.filename) || fileExtension(videoUrl)

  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <div className="bg-brand rounded-xl p-2.5 text-black">
          <CameraIcon size={24} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold">Câmera: {camera.name}</h1>
          <p className="flex flex-wrap gap-x-4 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden /> Local: {camera.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} aria-hidden />
              <time dateTime={recording.timestamp}>{formatDateTime(recording.timestamp)}</time>
            </span>
          </p>
        </div>
      </header>

      {/* An S3 URL that doesn't map to the public bucket gives no playable URL (video_error.html). */}
      {videoUrl ? (
        <VideoPlayer src={videoUrl} overlay={`Câmera: ${camera.name}`} />
      ) : (
        <ErrorState message="Este vídeo não está mais disponível." />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">Informações do Vídeo</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <InfoRow term="Duração">{formatDuration(recording.duration)}</InfoRow>
            <InfoRow term="Tamanho">{formatBytes(recording.size)}</InfoRow>
            <InfoRow term="Formato">{format || '—'}</InfoRow>
            <InfoRow term="Arquivo">
              <span className="break-all">{recording.filename || '—'}</span>
            </InfoRow>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 font-bold">Ações Rápidas</h2>
          {videoUrl ? (
            // `download` is ignored for cross-origin URLs (the recordings CDN), so open the file in
            // a new tab rather than navigating away from the player.
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('primary', 'w-full')}
            >
              <Download size={20} aria-hidden /> Baixar Vídeo
            </a>
          ) : (
            <p className="text-sm text-neutral-500">Nenhum arquivo disponível para download.</p>
          )}
        </Card>
      </div>
    </>
  )
}

function InfoRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-500">{term}:</dt>
      <dd className="text-right">{children}</dd>
    </>
  )
}
