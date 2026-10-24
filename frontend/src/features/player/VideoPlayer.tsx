import { useEffect, useRef, useState } from 'react'

import { isHlsUrl } from './hls'

export interface VideoPlayerProps {
  src: string
  /** Shown over the top-left of the video, like the old `video-overlay`. */
  overlay?: string
  autoPlay?: boolean
  onError?: () => void
}

/**
 * Plays MP4s natively and HLS (`.m3u8`, e.g. the `/api/stream/<cam>/...` proxy) through hls.js,
 * which is only loaded when needed. Safari plays HLS natively, so it skips hls.js entirely.
 */
export function VideoPlayer({ src, overlay, autoPlay = true, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setFailed(false)

    const fail = () => {
      setFailed(true)
      onErrorRef.current?.()
    }

    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== ''
    if (!isHlsUrl(src) || nativeHls) {
      video.src = src
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    let cancelled = false
    let destroy: (() => void) | undefined
    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return
      if (!Hls.isSupported()) {
        fail()
        return
      }
      const hls = new Hls()
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) fail()
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      destroy = () => {
        hls.destroy()
      }
    })

    return () => {
      cancelled = true
      destroy?.()
    }
  }, [src])

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        onError={() => {
          setFailed(true)
          onErrorRef.current?.()
        }}
        className="aspect-video w-full"
      >
        Seu navegador não suporta vídeos HTML5.
      </video>
      {overlay && (
        <div className="pointer-events-none absolute top-3 left-3 rounded bg-black/60 px-2 py-1 text-sm text-white">
          {overlay}
        </div>
      )}
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-white"
        >
          Não foi possível reproduzir este vídeo.
        </div>
      )}
    </div>
  )
}
