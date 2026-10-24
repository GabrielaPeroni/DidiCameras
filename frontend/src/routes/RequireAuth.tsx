import { Navigate, Outlet, useLocation } from 'react-router'

import { Spinner } from '@/components/ui'
import { useAuth } from '@/lib/authContext'

import { paths } from './paths'

export interface LoginRedirectState {
  from?: string
}

/** Gate for authenticated routes, replacing Django's `@login_required`. */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'anonymous') {
    const redirect: LoginRedirectState = { from: location.pathname + location.search }
    return <Navigate to={paths.login} replace state={redirect} />
  }
  return <Outlet />
}
