import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-strong text-black hover:bg-brand',
  secondary: 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100',
  danger: 'bg-danger text-white hover:opacity-90',
}

/** Shared so links styled as buttons (e.g. `<Link>`, `<a download>`) match real buttons. */
export const buttonClasses = (variant: ButtonVariant = 'primary', className?: string) =>
  clsx(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    className,
  )
