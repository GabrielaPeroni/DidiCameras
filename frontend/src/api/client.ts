export type QueryValue = string | number | boolean | null | undefined
export type Query = Readonly<Record<string, QueryValue>>

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const API_BASE = '/api'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function getCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

/**
 * Thin fetch wrapper for the Django API: same-origin session cookies, Django's CSRF header on
 * unsafe methods, JSON in/out, and non-2xx responses surfaced as `ApiError`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })

  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (!SAFE_METHODS.has(method)) {
    const csrf = getCookie('csrftoken')
    if (csrf) headers.set('X-CSRFToken', csrf)
  }

  const init: RequestInit = { method, headers, credentials: 'same-origin' }
  if (options.body !== undefined) init.body = JSON.stringify(options.body)
  if (options.signal) init.signal = options.signal

  const response = await fetch(buildUrl(path, options.query), init)
  const body: unknown = await parseBody(response)

  if (!response.ok) throw new ApiError(response.status, body, extractDetail(body))
  return body as T
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const type = response.headers.get('Content-Type') ?? ''
  return type.includes('application/json') ? response.json() : response.text()
}

/** DRF puts human-readable errors in `detail`. */
function extractDetail(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const { detail } = body
    if (typeof detail === 'string') return detail
  }
  return undefined
}
