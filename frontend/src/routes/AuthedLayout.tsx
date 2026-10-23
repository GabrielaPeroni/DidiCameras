import { useNavigate } from 'react-router'

import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/lib/authContext'

import { paths } from './paths'

export function AuthedLayout() {
  const { state, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
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
