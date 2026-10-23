/**
 * Domain types for the DRF API, derived from the drf-spectacular schema.
 *
 * `openapi/schema.yml` is a snapshot of `python manage.py spectacular`; regenerate
 * `schema.gen.ts` from it with `npm run gen:api` (CI fails if the two drift).
 */
import type { components, operations } from './schema.gen'

type Schemas = components['schemas']

/**
 * drf-spectacular marks model fields that have a default (`is_active`, `duration`, ...) as optional,
 * even in responses. The serializers always emit them, so response types make every key present.
 */
type Serialized<T> = Required<T>

export type User = Schemas['User']
export type Camera = Serialized<Schemas['Camera']>
export type RecordingCamera = Schemas['RecordingCamera']
export type Recording = Serialized<Schemas['Recording']>

/** Writable config fields (what the form edits and PATCH accepts). */
export type FFmpegSettings = Serialized<Schemas['PatchedFFmpegConfigRequest']>
export type FFmpegConfigPatch = Schemas['PatchedFFmpegConfigRequest']
/** Config as returned by the API, including the server-computed display labels. */
export type FFmpegConfig = Serialized<Schemas['FFmpegConfig']>

export type RecordingFilters = NonNullable<operations['recordings_list']['parameters']['query']>

/** DRF `PageNumberPagination` envelope; `next`/`previous` are always serialised (null at the ends). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
