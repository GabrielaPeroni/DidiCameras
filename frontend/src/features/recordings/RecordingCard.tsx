import { Camera as CameraIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { Recording } from '@/api/types'
import { buttonClasses } from '@/components/buttonClasses'
import { Card } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/format'
import { paths } from '@/routes/paths'

export function RecordingCard({ recording }: { recording: Recording }) {
  const { camera } = recording

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <CameraIcon size={22} aria-hidden />
        <div>
          <div className="font-bold">{camera.name}</div>
          <div className="text-sm text-neutral-500">{camera.location}</div>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-sm text-neutral-700">
        <dt>Data:</dt>
        <dd className="text-right">
          <time dateTime={recording.timestamp}>{formatDate(recording.timestamp)}</time>
        </dd>
        <dt>Horário:</dt>
        <dd className="text-right">{formatTime(recording.timestamp)}</dd>
      </dl>

      {recording.public_direct_url ? (
        <Link
          to={paths.recording(camera.name, recording.id)}
          aria-label={`Assistir gravação de ${camera.name} em ${formatDate(recording.timestamp)} ${formatTime(recording.timestamp)}`}
          className={buttonClasses('primary', 'mt-2 w-full')}
        >
          Assistir
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={buttonClasses('secondary', 'mt-2 w-full cursor-not-allowed opacity-50')}
        >
          Nenhum arquivo
        </span>
      )}
    </Card>
  )
}
