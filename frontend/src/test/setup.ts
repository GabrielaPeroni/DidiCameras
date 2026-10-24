import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom has no media pipeline; `load()` otherwise logs "Not implemented" on every unmount.
HTMLMediaElement.prototype.load = () => undefined
