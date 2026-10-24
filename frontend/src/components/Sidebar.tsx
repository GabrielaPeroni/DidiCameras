import clsx from 'clsx'
import { History, LogOut, Settings, User, Video, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'

import { paths } from '@/routes/paths'

import { Logo } from './Logo'

const NAV_ITEMS: readonly { to: string; label: string; icon: LucideIcon }[] = [
  { to: paths.cameras, label: 'Câmeras', icon: Video },
  { to: paths.history, label: 'Histórico', icon: History },
  { to: paths.config, label: 'Configurações', icon: Settings },
]

export interface SidebarProps {
  username?: string | undefined
  role?: string | undefined
  onLogout?: (() => void) | undefined
  onNavigate?: (() => void) | undefined
}

export function Sidebar({ username, role = 'Visitante', onLogout, onNavigate }: SidebarProps) {
  return (
    <aside className="bg-ink flex h-full w-64 flex-col justify-between text-white">
      <div>
        <div className="p-5">
          <Logo />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-2 px-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-xl px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-brand font-bold text-black'
                    : 'hover:bg-brand text-white hover:text-black',
                )
              }
            >
              <Icon size={22} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-neutral-800 p-4 text-sm">
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="bg-brand flex items-center justify-center rounded-full p-2 text-black">
            <User size={20} aria-hidden />
          </div>
          <div>
            <div>Olá, {username ?? 'visitante'}!</div>
            <small className="text-ink-muted">{role}</small>
          </div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
          >
            <LogOut size={20} aria-hidden />
            <span>Sair</span>
          </button>
        )}
      </div>
    </aside>
  )
}
