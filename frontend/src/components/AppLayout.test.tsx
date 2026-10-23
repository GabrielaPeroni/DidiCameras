import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AppLayout } from './AppLayout'

function renderLayout(props: Parameters<typeof AppLayout>[0] = {}) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout {...props} />,
        children: [{ path: '/history', element: <p>history page</p> }],
      },
    ],
    { initialEntries: ['/history'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AppLayout', () => {
  it('renders the routed page and marks the active nav link', () => {
    renderLayout()

    expect(screen.getByText('history page')).toBeInTheDocument()
    const [desktopNav] = screen.getAllByRole('navigation', { name: 'Principal' })
    expect(desktopNav).toBeDefined()
    const active = screen.getAllByRole('link', { name: /Histórico/ })[0]
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('greets the user and wires logout', async () => {
    const onLogout = vi.fn()
    renderLayout({ username: 'didi', onLogout })

    expect(screen.getAllByText('Olá, didi!')[0]).toBeInTheDocument()
    const [logout] = screen.getAllByRole('button', { name: 'Sair' })
    if (!logout) throw new Error('logout button missing')
    await userEvent.click(logout)

    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('opens and closes the mobile drawer', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
