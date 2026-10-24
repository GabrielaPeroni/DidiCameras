/**
 * Domain types for the DRF API (Plan 1, Phase 3).
 *
 * Hand-written against the planned contract until the drf-spectacular schema exists.
 * Once it does, run `npm run gen:api` and re-point these aliases at
 * `components['schemas'][...]` in `./schema.gen.ts` so the backend stays the source of truth.
 */

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface User {
  id: number
  username: string
  is_staff: boolean
}

export interface Camera {
  id: number
  /** Short id such as `cam1`; keys `Camera.CAMERA_LOCATIONS` on the backend. */
  name: string
  location: string
  is_active: boolean
  /** Host + path without scheme, e.g. `rtc.didicameras.live/cam1`. */
  live_url: string
}

export type CameraSummary = Pick<Camera, 'id' | 'name' | 'location'>

export interface Recording {
  id: number
  camera: CameraSummary
  s3_url: string
  /** ISO-8601 datetime. */
  timestamp: string
  /** Seconds. */
  duration: number | null
  /** Bytes. */
  size: number | null
  filename: string
  /** Direct public file URL; empty string when the S3 path can't be mapped. */
  public_direct_url: string
}

export interface RecordingFilters {
  /** `YYYY-MM-DD`. */
  date?: string
  search?: string
  camera?: string
  page?: number
}

export interface FFmpegConfig {
  /** Minutes, >= 1. */
  recording_duration: number
  /** `width:height`, or `''` for the source's native resolution. */
  recording_resolution: string
  /** Extension without the dot, e.g. `mp4`. */
  recording_format: string
  recording_preset: string
  /** 18..32. */
  recording_crf: number
}
