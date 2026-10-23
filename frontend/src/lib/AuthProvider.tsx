import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'

import { AuthContext, type AuthContextValue, type AuthState } from './authContext'

const isUnauthenticated = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403)

/** Session auth against Django: `/auth/me/` decides the initial state; login/logout update it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  useEffect(() => {
    const controller = new AbortController()
    authApi
      .me(controller.signal)
      .then((user) => {
        setState({ status: 'authenticated', user })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (!isUnauthenticated(error)) console.error('Failed to load session', error)
        setState({ status: 'anonymous', user: null })
      })
    return () => {
      controller.abort()
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await authApi.ensureCsrf()
    const user = await authApi.login(username, password)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      queryClient.clear()
      setState({ status: 'anonymous', user: null })
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
