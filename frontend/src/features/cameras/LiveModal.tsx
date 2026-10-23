import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { Camera } from '@/api/types'

export interface LiveModalProps {
  camera: Camera
  href: string
  onClose: () => void
}

/** Embeds the camera's WebRTC page; unmounting drops the iframe, which ends the stream. */
export function LiveModal({ camera, href, onClose }: LiveModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  const title = `Ao vivo: ${camera.name} — ${camera.location}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onClose}
      />
      <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl">
        <iframe
          src={href}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="size-full border-0"
        />
        <button
          ref={closeRef}
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
    </div>
  )
}
