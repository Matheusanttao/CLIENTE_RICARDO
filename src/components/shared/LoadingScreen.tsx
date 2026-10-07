import { BrandMark } from '@/components/brand/BrandMark'

export function LoadingScreen({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-6">
      <BrandMark />
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {label}
      </p>
    </div>
  )
}
