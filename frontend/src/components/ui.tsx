import clsx from 'clsx'
import { LoaderCircle } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { buttonClasses, type ButtonVariant } from './buttonClasses'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
}

export function Button({ variant, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={clsx('rounded-xl bg-white p-4 shadow-sm', className)} {...props} />
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-neutral-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      role="img"
      aria-label={online ? 'Online' : 'Offline'}
      className={clsx('inline-block size-2.5 rounded-full', online ? 'bg-online' : 'bg-offline')}
    />
  )
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-neutral-500">
      <LoaderCircle className="animate-spin" size={20} aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="p-10 text-center text-neutral-500">{children}</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="mt-2 font-bold underline" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}
