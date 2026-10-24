import { http, HttpResponse, type JsonBodyType } from 'msw'

import type { Camera, FFmpegConfig, Paginated, Recording, User } from '@/api/types'
import { cameras as fixtureCameras, makeRecording } from '@/test/fixtures'

/**
 * A small in-memory stand-in for the Django API, enforcing the same rules the integration
 * tests care about: session auth (403 when logged out), CSRF on unsafe methods, staff-only
 * config writes, and the recordings filters/pagination. Types come from the OpenAPI schema.
 */

const CSRF_TOKEN = 'test-csrf-token'
const PAGE_SIZE = 20

const accounts: Record<string, { password: string; user: User }> = {
  admin: { password: 'admin', user: { id: 1, username: 'admin', is_staff: true } },
  viewer: { password: 'viewer', user: { id: 2, username: 'viewer', is_staff: false } },
}

const defaultConfig: FFmpegConfig = {
  recording_duration: 5,
  recording_resolution: '',
  recording_format: 'mp4',
  recording_preset: 'veryfast',
  recording_crf: 28,
  resolution_display: 'Nativa',
  crf_display: 'Baixa',
}

function seedRecordings(): Recording[] {
  return Array.from({ length: 25 }, (_, i) => {
    const camera = fixtureCameras[i % 2] ?? fixtureCameras[0]
    const day = String(1 + (i % 3)).padStart(2, '0')
    return makeRecording({
      id: 100 + i,
      camera: {
        id: camera?.id ?? 1,
        name: camera?.name ?? 'cam1',
        location: camera?.location ?? '',
      },
      filename: `clip_${String(i).padStart(2, '0')}.mp4`,
      timestamp: `2025-01-${day}T10:${String(i).padStart(2, '0')}:00`,
      friendly_url: `/${camera?.name ?? 'cam1'}/${String(100 + i)}/`,
    })
  }).reverse() // newest first, like the API
}

export const db = {
  session: null as User | null,
  cameras: [] as Camera[],
  recordings: [] as Recording[],
  config: { ...defaultConfig },
  /** Every API request the app made, for assertions on query params and headers. */
  requests: [] as Request[],
  reset() {
    this.session = null
    this.cameras = structuredClone(fixtureCameras)
    this.recordings = seedRecordings()
    this.config = { ...defaultConfig }
    this.requests = []
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  },
  /** Simulate the Django session expiring (SESSION_COOKIE_AGE) while the app is open. */
  expireSession() {
    this.session = null
  },
}
db.reset()

const forbidden = (detail = 'As credenciais de autenticação não foram fornecidas.') =>
  HttpResponse.json({ detail }, { status: 403 })

const csrfOk = (request: Request) => request.headers.get('X-CSRFToken') === CSRF_TOKEN

/** Wraps a handler with the auth and CSRF checks DRF's SessionAuthentication does. */
function authed<T extends JsonBodyType>(
  resolve: (request: Request, user: User) => Promise<HttpResponse<T>> | HttpResponse<T>,
) {
  return ({ request }: { request: Request }) => {
    db.requests.push(request.clone())
    if (!db.session) return forbidden()
    if (request.method !== 'GET' && !csrfOk(request))
      return forbidden('CSRF Failed: CSRF token missing.')
    return resolve(request, db.session)
  }
}

function filterRecordings(url: URL): Paginated<Recording> {
  const date = url.searchParams.get('date')
  const search = url.searchParams.get('search')?.toLowerCase()
  const camera = url.searchParams.get('camera')?.toLowerCase()
  const page = Number(url.searchParams.get('page') ?? '1')

  const matching = db.recordings.filter(
    (r) =>
      (!date || r.timestamp.startsWith(date)) &&
      (!camera || r.camera.name.toLowerCase() === camera) &&
      (!search ||
        r.filename.toLowerCase().includes(search) ||
        r.camera.name.toLowerCase().includes(search)),
  )
  const start = (page - 1) * PAGE_SIZE
  const next = start + PAGE_SIZE < matching.length ? `?page=${String(page + 1)}` : null
  return {
    count: matching.length,
    next,
    previous: page > 1 ? `?page=${String(page - 1)}` : null,
    results: matching.slice(start, start + PAGE_SIZE),
  }
}

export const handlers = [
  http.get('/api/auth/csrf/', () => {
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    return HttpResponse.json({ csrf_token: CSRF_TOKEN })
  }),

  http.post('/api/auth/login/', async ({ request }) => {
    if (!csrfOk(request)) return forbidden('CSRF Failed: CSRF token missing.')
    const { username, password } = (await request.json()) as Record<string, string>
    const account = accounts[username ?? '']
    if (!account || account.password !== password)
      return HttpResponse.json({ detail: 'Credenciais inválidas' }, { status: 400 })
    db.session = account.user
    return HttpResponse.json(account.user)
  }),

  http.post(
    '/api/auth/logout/',
    authed(() => {
      db.session = null
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    '/api/auth/me/',
    authed((_request, user) => HttpResponse.json(user)),
  ),

  http.get(
    '/api/cameras/',
    authed(() => HttpResponse.json(db.cameras)),
  ),

  http.get(
    '/api/recordings/',
    authed((request) => HttpResponse.json(filterRecordings(new URL(request.url)))),
  ),

  http.get(
    '/api/recordings/:id/',
    authed((request) => {
      const id = Number(new URL(request.url).pathname.split('/').at(-2))
      const recording = db.recordings.find((r) => r.id === id)
      return recording
        ? HttpResponse.json(recording)
        : HttpResponse.json({ detail: 'Não encontrado.' }, { status: 404 })
    }),
  ),

  http.get(
    '/api/config/',
    authed(() => HttpResponse.json(db.config)),
  ),

  http.patch(
    '/api/config/',
    authed(async (request, user) => {
      if (!user.is_staff) return forbidden('Você não tem permissão para executar essa ação.')
      const patch = (await request.json()) as Partial<FFmpegConfig>
      db.config = { ...db.config, ...patch }
      return HttpResponse.json(db.config)
    }),
  ),

  http.post(
    '/api/config/reset/',
    authed((_request, user) => {
      if (!user.is_staff) return forbidden('Você não tem permissão para executar essa ação.')
      db.config = { ...defaultConfig }
      return HttpResponse.json(db.config)
    }),
  ),
]
