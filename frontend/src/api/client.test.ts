import { describe, expect, it } from 'vitest'

import { mockFetchJson } from '@/test/fetch'

import { ApiError, buildUrl, request } from './client'

describe('buildUrl', () => {
  it('prefixes /api and drops empty query values', () => {
    expect(buildUrl('/recordings/', { date: '2025-01-02', search: '', camera: undefined })).toBe(
      '/api/recordings/?date=2025-01-02',
    )
  })

  it('returns the bare path without a query', () => {
    expect(buildUrl('cameras/')).toBe('/api/cameras/')
  })
})

describe('request', () => {
  it('sends the CSRF cookie as a header on unsafe methods', async () => {
    document.cookie = 'csrftoken=abc123'
    const fetchSpy = mockFetchJson({ ok: true })

    await request('/config/', { method: 'PATCH', body: { recording_crf: 22 } })

    const [, init] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers(init?.headers)
    expect(headers.get('X-CSRFToken')).toBe('abc123')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init?.credentials).toBe('same-origin')
    expect(init?.body).toBe('{"recording_crf":22}')
  })

  it('omits the CSRF header on GET', async () => {
    document.cookie = 'csrftoken=abc123'
    const fetchSpy = mockFetchJson([])

    await request('/cameras/')

    const [, init] = fetchSpy.mock.calls[0] ?? []
    expect(new Headers(init?.headers).has('X-CSRFToken')).toBe(false)
  })

  it('throws ApiError carrying DRF detail on non-2xx', async () => {
    mockFetchJson({ detail: 'Credenciais inválidas' }, { status: 403 })

    const error: unknown = await request('/auth/login/', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, message: 'Credenciais inválidas' })
  })
})
