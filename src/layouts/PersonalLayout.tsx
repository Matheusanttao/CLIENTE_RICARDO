import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Dumbbell,
  Layers3,
  Wallet,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/personal/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/personal/alunos', label: 'Alunos', icon: Users },
  { to: '/personal/avaliacoes', label: 'Avaliações', icon: ClipboardList },
  { to: '/personal/exercicios', label: 'Exercícios', icon: Dumbbell },
  { to: '/personal/treinos', label: 'Treinos', icon: Layers3 },
  { to: '/personal/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/personal/configuracoes', label: 'Configurações', icon: Settings },
]

export function PersonalLayout() {
  const [open, setOpen] = useState(false)

  const Nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Menu administrativo">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
              isActive && 'bg-accent text-accent-foreground',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-card lg:block">
        <div className="sticky top-0">
          <div className="border-b border-border p-4">
            <Link to="/personal/dashboard">
              <BrandMark />
            </Link>
          </div>
          {Nav}
        </div>
      </aside>

      <div>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <BrandMark size="sm" />
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </Button>
        </header>
        {open && <div className="border-b border-border bg-card lg:hidden">{Nav}</div>}
        <main className="mx-auto max-w-6xl p-4 pb-safe sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
