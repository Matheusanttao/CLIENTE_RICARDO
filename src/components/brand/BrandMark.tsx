import logoMark from '@/assets/logo-mark.png'
import { cn } from '@/lib/utils'

/** Marca do Ricardo (R + halter) num bloco escuro — legível no tema claro e escuro. */
export function BrandMark({
  className,
  size = 'md',
  showName = true,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}) {
  const tile = size === 'lg' ? 'h-16 w-16 rounded-2xl p-2' : size === 'sm' ? 'h-9 w-9 rounded-lg p-1' : 'h-11 w-11 rounded-xl p-1.5'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex shrink-0 items-center justify-center bg-[var(--graphite)] ring-1 ring-white/5', tile)} aria-hidden>
        <img src={logoMark} alt="" className="h-full w-full object-contain" />
      </div>
      {showName && (
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold tracking-tight sm:text-base">Ricardo Neves</p>
          <p className="text-xs text-muted-foreground">Personal Trainer</p>
        </div>
      )}
    </div>
  )
}
