import { Home, Dumbbell, UserRound, CreditCard } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import { prefetchStudentRoutes } from '@/lib/prefetchRoutes'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/aluno/inicio', label: 'Início', icon: Home },
  { to: '/aluno/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/aluno/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/aluno/perfil', label: 'Perfil', icon: UserRound },
]

export function StudentLayout() {
  useEffect(() => prefetchStudentRoutes(), [])
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* computador: menu lateral */}
      <aside className="hidden border-r border-border bg-card/40 md:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-6 p-5">
          <BrandMark />
          <nav className="flex flex-col gap-1" aria-label="Menu do aluno">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary',
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-lg px-4 pb-nav pt-[calc(1rem+var(--safe-top))] md:max-w-3xl md:px-8 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      {/* celular: menu de baixo */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-safe md:hidden"
        aria-label="Menu do aluno"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors',
                    isActive && 'text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary/15',
                      )}
                    >
                      <Icon className={cn('h-5 w-5', isActive && 'text-primary')} aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
