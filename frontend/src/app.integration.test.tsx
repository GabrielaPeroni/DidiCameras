/**
 * Whole-app flows: the real router, AuthProvider, react-query and API client, talking to the
 * MSW fake backend (src/test/msw/backend.ts) instead of mocking `@/api/*`.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AuthProvider } from '@/lib/AuthProvider'
import { routes } from '@/routes/router'
import { db } from '@/test/msw/backend'
import { createTestQueryClient } from '@/test/render'

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return router
}

async function logIn(user: UserEvent, username: string, password = username) {
  await user.type(await screen.findByPlaceholderText('Email'), username)
  await user.type(screen.getByPlaceholderText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'ENTRAR' }))
}

const lastRequest = (path: string) => {
  const match = db.requests.filter((r) => new URL(r.url).pathname === path).at(-1)
  if (!match) throw new Error(`no request to ${path}`)
  return match
}

describe('app', () => {
  it('sends anonymous users to login and back to the page they wanted', async () => {
    const user = userEvent.setup()
    const router = renderApp('/history?camera=cam2')

    await logIn(user, 'viewer')

    expect(await screen.findByRole('heading', { name: 'Histórico de Gravações' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/history')
    expect(router.state.location.search).toBe('?camera=cam2')
    await waitFor(() => {
      expect(new URL(lastRequest('/api/recordings/').url).searchParams.get('camera')).toBe('cam2')
    })
  })

  it('shows the API error for bad credentials and stays on login', async () => {
    const user = userEvent.setup()
    renderApp('/camera')

    await logIn(user, 'viewer', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas')
    expect(db.session).toBeNull()
  })

  it('lists cameras with live status once logged in', async () => {
    const user = userEvent.setup()
    renderApp('/camera')

    await logIn(user, 'viewer')

    expect(await screen.findByRole('button', { name: 'Abrir Live de cam1' })).toBeVisible()
    expect(screen.getByText('Interior da Loja')).toBeVisible()
  })

  it('filters and paginates recordings through the URL and the API', async () => {
    db.session = { id: 2, username: 'viewer', is_staff: false }
    const user = userEvent.setup()
    const router = renderApp('/history')

    expect(await screen.findAllByRole('link', { name: /Assistir gravação/ })).toHaveLength(20)

    await user.selectOptions(screen.getByLabelText('Câmera'), 'cam1')

    await waitFor(() => {
      expect(router.state.location.search).toContain('camera=cam1')
    })
    const links = await screen.findAllByRole('link', { name: /Assistir gravação de cam1/ })
    expect(links).toHaveLength(13)
    expect(screen.queryByRole('link', { name: /Assistir gravação de cam2/ })).toBeNull()
  })

  it('lets staff save the recording config, with CSRF', async () => {
    const user = userEvent.setup()
    renderApp('/config')
    await logIn(user, 'admin')

    await user.selectOptions(await screen.findByLabelText('Formato'), 'mkv')
    await user.click(screen.getByRole('button', { name: 'Salvar Configurações' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Configurações salvas.')
    expect(db.config.recording_format).toBe('mkv')
    expect(lastRequest('/api/config/').headers.get('X-CSRFToken')).toBe('test-csrf-token')
  })

  it('keeps the config read-only for viewers', async () => {
    const user = userEvent.setup()
    renderApp('/config')
    await logIn(user, 'viewer')

    expect(await screen.findByRole('note')).toHaveTextContent('Somente administradores')
    expect(screen.getByRole('button', { name: 'Salvar Configurações' })).toBeDisabled()
  })

  it('returns to login when the server session expires mid-use', async () => {
    const user = userEvent.setup()
    const router = renderApp('/camera')
    await logIn(user, 'viewer')
    await screen.findByRole('button', { name: 'Abrir Live de cam1' })

    db.expireSession()
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    await user.click(within(nav).getByRole('link', { name: /Histórico/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
    expect(await screen.findByPlaceholderText('Email')).toBeVisible()
  })

  it('logs out on the server and locally', async () => {
    const user = userEvent.setup()
    const router = renderApp('/camera')
    await logIn(user, 'admin')
    await screen.findByText('Administrador')

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
    expect(db.session).toBeNull()
  })
})
