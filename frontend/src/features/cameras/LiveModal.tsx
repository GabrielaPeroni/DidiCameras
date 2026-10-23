import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { Camera } from '@/api/types'

export interface LiveModalProps {
  camera: Camera
  href: string
  onClose: () => void
}

/**
 * Embeds the camera's WebRTC page; unmounting drops the iframe, which ends the stream.
 *
 * Rendered into `document.body` with every other top-level element made `inert`, so Tab can't
 * reach the page behind it and screen readers only see the dialog. Escape can't be caught while
 * focus is inside the cross-origin iframe, so the close button stays visible over the stream.
 */
export function LiveModal({ camera, href, onClose }: LiveModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const background = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== dialogRef.current,
    )
    // Attribute rather than the `inert` property: same effect, and it's what jsdom understands.
    const wasInert = background.map((el) => el.hasAttribute('inert'))
    background.forEach((el) => {
      el.setAttribute('inert', '')
    })
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
      background.forEach((el, i) => {
        el.toggleAttribute('inert', wasInert[i] ?? false)
      })
      previouslyFocused?.focus()
    }
  }, [onClose])

  const title = `Ao vivo: ${camera.name} — ${camera.location}`

  return createPortal(
    <div
      ref={dialogRef}
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
          referrerPolicy="no-referrer"
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
    </div>,
    document.body,
  )
}
