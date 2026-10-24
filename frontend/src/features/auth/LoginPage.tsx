import { Eye, EyeOff } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { ApiError } from '@/api/client'
import { useAuth } from '@/lib/authContext'
import { paths } from '@/routes/paths'
import type { LoginRedirectState } from '@/routes/RequireAuth'

/** Only same-app paths: `//host` or absolute URLs fall back to the live view. */
function safeRedirect(from: string | undefined): string {
  return from?.startsWith('/') && !from.startsWith('//') ? from : paths.cameras
}

/** 400 is the API's "bad credentials"; lockouts (django-axes) and CSRF failures say something else. */
function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError) || err.status >= 500)
    return 'Não foi possível entrar. Tente novamente.'
  if (err.status === 400) return 'Credenciais inválidas'
  if (err.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  return 'Não foi possível entrar. Recarregue a página e tente novamente.'
}

const inputClasses =
  'w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-brown'

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = safeRedirect((location.state as LoginRedirectState | null)?.from)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'authenticated') return <Navigate to={from} replace />

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      await navigate(from, { replace: true })
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-brand-login flex min-h-dvh items-start justify-center">
      <div className="w-full max-w-xs px-5 py-8 text-center">
        <img
          src={`${import.meta.env.BASE_URL}Didi.png`}
          alt="Didi Lanches"
          className="mb-5 w-full"
        />

        {error && (
          <p role="alert" className="my-2.5 text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <label className="sr-only" htmlFor="username">
            Usuário
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="Email"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
            }}
            className={inputClasses}
          />

          <div className="relative">
            <label className="sr-only" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Senha"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              className={`${inputClasses} pr-10`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              onClick={() => {
                setShowPassword((v) => !v)
              }}
              className="text-brand-brown absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#4a1e00] p-3 font-bold text-white transition-colors hover:bg-[#3b1800] disabled:opacity-60"
          >
            {submitting ? 'ENTRANDO…' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
