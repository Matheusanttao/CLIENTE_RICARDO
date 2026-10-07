import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/20 text-foreground',
        secondary: 'border-transparent bg-muted text-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-primary/25 text-primary-foreground',
        warning: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
        danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
