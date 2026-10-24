import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { db } from './msw/backend'
import { server } from './msw/server'

// Unit tests mock `@/api/*` or stub fetch; integration tests talk to the MSW fake backend.
// Anything else hitting the network is a bug in the test, so fail loudly.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  server.resetHandlers()
  db.reset()
})

afterAll(() => {
  server.close()
})

// jsdom has no media pipeline; `load()` otherwise logs "Not implemented" on every unmount.
HTMLMediaElement.prototype.load = () => undefined
