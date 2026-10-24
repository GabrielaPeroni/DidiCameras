import { setupServer } from 'msw/node'

import { handlers } from './backend'

/** Node-side MSW server; started in `src/test/setup.ts` for every test file. */
export const server = setupServer(...handlers)
