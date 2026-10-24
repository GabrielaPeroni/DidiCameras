import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'

import { AuthContext, type AuthContextValue, type AuthState } from './authContext'

const isUnauthenticated = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403)

/**
 * Session auth against Django: `/auth/me/` decides the initial state; login/logout update it.
 * A 401/403 from any query or mutation re-checks the session, so an expired Django session
 * (SESSION_COOKIE_AGE) sends the user back to /login instead of leaving dead error screens.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  const checkingSession = useRef(false)

  const signOutLocally = useCallback(() => {
    queryClient.clear()
    setState({ status: 'anonymous', user: null })
  }, [queryClient])

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

  useEffect(() => {
    // A 403 can also mean "logged in but not allowed", so confirm with /auth/me/ before acting.
    const recheck = (error: unknown) => {
      if (!isUnauthenticated(error) || checkingSession.current) return
      checkingSession.current = true
      authApi
        .me()
        .catch((meError: unknown) => {
          if (isUnauthenticated(meError)) signOutLocally()
        })
        .finally(() => {
          checkingSession.current = false
        })
    }
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') recheck(event.action.error)
    })
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') recheck(event.action.error)
    })
    return () => {
      unsubscribeQueries()
      unsubscribeMutations()
    }
  }, [queryClient, signOutLocally])

  const login = useCallback(async (username: string, password: string) => {
    await authApi.ensureCsrf()
    const user = await authApi.login(username, password)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      // Refresh the CSRF cookie first so an old/rotated token can't make the POST fail.
      await authApi.ensureCsrf()
      await authApi.logout()
    } catch (error) {
      // Still sign out locally (the user asked to leave), but don't hide that the server refused.
      console.error('Logout request failed; the server session may still be active', error)
    } finally {
      signOutLocally()
    }
  }, [signOutLocally])

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
