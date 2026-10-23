import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'

import type { User } from '@/api/types'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

export const testUser: User = { id: 1, username: 'didi', is_staff: false }

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function fakeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    state: { status: 'authenticated', user: testUser },
    login: () => Promise.resolve(testUser),
    logout: () => Promise.resolve(),
    ...overrides,
  }
}

interface RenderRouteOptions {
  /** Pass `null` to render without an AuthContext (e.g. when using the real AuthProvider). */
  auth?: AuthContextValue | null
  wrapper?: (children: ReactNode) => ReactNode
  initialEntries?: string[]
}

/** Renders routes inside a memory router with a fresh QueryClient and (by default) a fake signed-in user. */
export function renderRoutes(routes: RouteObject[], options: RenderRouteOptions = {}) {
  const { auth = fakeAuth(), wrapper = (c) => c, initialEntries = ['/'] } = options
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(routes, { initialEntries })

  const tree = wrapper(<RouterProvider router={router} />)
  const result = render(
    <QueryClientProvider client={queryClient}>
      {auth ? <AuthContext value={auth}>{tree}</AuthContext> : tree}
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}
