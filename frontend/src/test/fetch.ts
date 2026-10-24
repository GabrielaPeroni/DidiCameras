import { vi } from 'vitest'

/** Stubs `fetch` with a single JSON response and returns the spy for assertions. */
export function mockFetchJson(body: unknown, init: ResponseInit = {}) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}
