import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'
import { AuthProvider } from '@/lib/AuthProvider'
import { RequireAuth } from '@/routes/RequireAuth'
import { renderRoutes, testUser } from '@/test/render'

import { LoginPage } from './LoginPage'

vi.mock('@/api/auth')

const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [{ path: '/history', element: <p>history page</p> }],
  },
]

const renderApp = (initialEntries: string[]) =>
  renderRoutes(routes, {
    auth: null,
    wrapper: (children) => <AuthProvider>{children}</AuthProvider>,
    initialEntries,
  })

describe('login flow', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(403, { detail: 'not logged in' }))
    vi.mocked(authApi.ensureCsrf).mockResolvedValue(undefined)
  })

  it('redirects anonymous users to /login, then back after signing in', async () => {
    vi.mocked(authApi.login).mockResolvedValue(testUser)
    const user = userEvent.setup()
    const { router } = renderApp(['/history?date=2025-01-01'])

    await user.type(await screen.findByPlaceholderText('Email'), 'didi')
    await user.type(screen.getByPlaceholderText('Senha'), 'secret')
    await user.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(await screen.findByText('history page')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?date=2025-01-01')
    expect(authApi.ensureCsrf).toHaveBeenCalled()
    expect(authApi.login).toHaveBeenCalledWith('didi', 'secret')
  })

  it('shows an error for bad credentials', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(400, {}))
    const user = userEvent.setup()
    renderApp(['/login'])

    await user.type(await screen.findByPlaceholderText('Email'), 'didi')
    await user.type(screen.getByPlaceholderText('Senha'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas')
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderApp(['/login'])

    const password = await screen.findByPlaceholderText('Senha')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('lets an existing session straight through', async () => {
    vi.mocked(authApi.me).mockResolvedValue(testUser)
    renderApp(['/history'])

    expect(await screen.findByText('history page')).toBeInTheDocument()
  })
})
