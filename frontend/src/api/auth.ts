import { request } from './client'
import type { User } from './types'

/** Sets the `csrftoken` cookie so the login POST can carry it. */
export const ensureCsrf = () => request<undefined>('/auth/csrf/')

export const login = (username: string, password: string) =>
  request<User>('/auth/login/', { method: 'POST', body: { username, password } })

export const logout = () => request<undefined>('/auth/logout/', { method: 'POST' })

export const me = (signal?: AbortSignal) => request<User>('/auth/me/', signal ? { signal } : {})
