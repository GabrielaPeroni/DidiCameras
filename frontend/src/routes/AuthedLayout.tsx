import { useNavigate } from 'react-router'

import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/lib/authContext'

import { paths } from './paths'

export function AuthedLayout() {
  const { state, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    // logout() never rejects (it always signs out locally), so there's nothing to catch here.
    void logout().then(() => navigate(paths.login, { replace: true }))
  }

  return (
    <AppLayout
      username={state.user?.username}
      role={state.user?.is_staff ? 'Administrador' : 'Visitante'}
      onLogout={handleLogout}
    />
  )
}
