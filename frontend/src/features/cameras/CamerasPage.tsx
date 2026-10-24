import { Camera as CameraIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import type { Camera } from '@/api/types'
import { buttonClasses } from '@/components/buttonClasses'
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatusDot } from '@/components/ui'

import { LiveModal } from './LiveModal'
import { toLiveHref } from './liveUrl'
import { useCameras } from './queries'

export function CamerasPage() {
  const cameras = useCameras()
  const [live, setLive] = useState<{ camera: Camera; href: string } | null>(null)
  const close = useCallback(() => {
    setLive(null)
  }, [])

  return (
    <>
      <PageHeader title="LiveView" subtitle="Monitore as câmeras ativas" />

      {cameras.isPending ? (
        <Spinner label="Carregando câmeras…" />
      ) : cameras.isError ? (
        <ErrorState
          message="Não foi possível carregar as câmeras."
          onRetry={() => void cameras.refetch()}
        />
      ) : cameras.data.length === 0 ? (
        <EmptyState>Nenhuma câmera cadastrada.</EmptyState>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-5">
          {cameras.data.map((camera) => (
            <li key={camera.id}>
              <CameraTile
                camera={camera}
                onOpen={(href) => {
                  setLive({ camera, href })
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {live && <LiveModal camera={live.camera} href={live.href} onClose={close} />}
    </>
  )
}

function CameraTile({ camera, onOpen }: { camera: Camera; onOpen: (href: string) => void }) {
  const href = toLiveHref(camera.live_url)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CameraIcon size={22} aria-hidden />
          <div>
            <div className="font-bold">{camera.name}</div>
            <div className="text-sm text-neutral-500">{camera.location}</div>
          </div>
        </div>
        <StatusDot online={camera.is_active} />
      </div>

      {href ? (
        <button
          type="button"
          onClick={() => {
            onOpen(href)
          }}
          aria-label={`Abrir Live de ${camera.name}`}
          className={buttonClasses('primary', 'w-full')}
        >
          Abrir Live
        </button>
      ) : (
        <span
          aria-disabled="true"
          className={buttonClasses('secondary', 'w-full cursor-not-allowed opacity-50')}
        >
          Nenhum Link
        </span>
      )}
    </Card>
  )
}
