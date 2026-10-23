/** `Camera.live_url` comes without a scheme (`rtc.didicameras.live/cam1`); the template prefixed https. */
export function toLiveHref(liveUrl: string): string | null {
  const trimmed = liveUrl.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
