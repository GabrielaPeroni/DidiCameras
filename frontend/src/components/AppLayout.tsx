import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'

import { Logo } from './Logo'
import { Sidebar, type SidebarProps } from './Sidebar'

/** Fixed sidebar on desktop; a top bar with a slide-over drawer on small screens. */
export function AppLayout(props: Omit<SidebarProps, 'onNavigate'>) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const close = () => {
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-dvh">
      <div className="fixed inset-y-0 left-0 hidden md:block">
        <Sidebar {...props} />
      </div>

      <header className="bg-ink flex items-center justify-between p-4 text-white md:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
          onClick={() => {
            setDrawerOpen(true)
          }}
        >
          <Menu aria-hidden />
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60"
            onClick={close}
          />
          <div className="relative h-full w-64">
            <Sidebar {...props} onNavigate={close} />
          </div>
        </div>
      )}

      <main className="p-5 md:ml-64 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
