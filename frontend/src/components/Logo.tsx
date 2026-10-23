import { Camera } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-brand flex items-center justify-center rounded-xl p-2.5 text-black">
        <Camera size={22} aria-hidden />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-bold">
          Didi<span className="text-brand">Cameras</span>
        </span>
        <span className="text-ink-muted text-sm">Monitoramento</span>
      </div>
    </div>
  )
}
