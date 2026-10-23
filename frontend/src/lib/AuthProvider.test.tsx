import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/routes/RequireAuth'
import { renderRoutes, testUser } from '@/test/render'

import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'

vi.mock('@/api/auth')

const loadData = vi.fn<() => Promise<string>>()

function DataPage() {
  const { state, logout } = useAuth()
  const data = useQuery({ queryKey: ['data'], queryFn: loadData, retry: false })
  return (
    <>
      <p>{data.isError ? 'load failed' : (data.data ?? 'loading')}</p>
      <p>user: {state.user?.username}</p>
      <button type="button" onClick={() => void logout()}>
        sair
      </button>
    </>
  )
}

const renderApp = () =>
  renderRoutes(
    [
      { path: '/login', element: <LoginPage /> },
      { element: <RequireAuth />, children: [{ path: '/history', element: <DataPage /> }] },
    ],
    {
      auth: null,
      wrapper: (children) => <AuthProvider>{children}</AuthProvider>,
      initialEntries: ['/history'],
    },
  )

const forbidden = () => new ApiError(403, { detail: 'not logged in' })

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockResolvedValue(testUser)
    vi.mocked(authApi.ensureCsrf).mockResolvedValue(undefined)
    vi.mocked(authApi.logout).mockResolvedValue(undefined)
  })

  it('sends the user to /login when the session has expired', async () => {
    loadData.mockRejectedValue(forbidden())
    // First /me/ (on mount) succeeds; the re-check after the 403 finds no session.
    vi.mocked(authApi.me).mockResolvedValueOnce(testUser).mockRejectedValue(forbidden())
    const { router } = renderApp()

    expect(await screen.findByPlaceholderText('Senha')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('keeps the session when a 403 is a permission error, not an expired login', async () => {
    loadData.mockRejectedValue(forbidden())
    renderApp()

    expect(await screen.findByText('load failed')).toBeInTheDocument()
    expect(screen.getByText('user: didi')).toBeInTheDocument()
    expect(authApi.me).toHaveBeenCalledTimes(2)
  })

  it('signs out locally even if the logout request fails', async () => {
    loadData.mockResolvedValue('ok')
    vi.mocked(authApi.logout).mockRejectedValue(forbidden())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const { router } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'sair' }))

    expect(authApi.ensureCsrf).toHaveBeenCalled()
    expect(await screen.findByPlaceholderText('Senha')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})
