import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function BrandMark({
  className,
  size = 'md',
  showName = true,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}) {
  const mono =
    size === 'lg' ? 'h-14 w-14 text-xl' : size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-[var(--graphite)] font-display font-bold text-primary',
          mono,
        )}
        aria-hidden
      >
        {BRAND.monogram}
      </div>
      {showName && (
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold tracking-tight sm:text-base">
            Ricardo Neves
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">Personal</p>
        </div>
      )}
    </div>
  )
}
