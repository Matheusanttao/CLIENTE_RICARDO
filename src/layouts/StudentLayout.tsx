import { Home, Dumbbell, UserRound, CreditCard } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/aluno/inicio', label: 'Início', icon: Home },
  { to: '/aluno/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/aluno/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/aluno/perfil', label: 'Perfil', icon: UserRound },
]

export function StudentLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background">
      <main className="pb-nav px-4 pt-4">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-safe"
        aria-label="Menu do aluno"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground',
                    isActive && 'text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-5 w-5', isActive && 'text-primary')} aria-hidden />
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
