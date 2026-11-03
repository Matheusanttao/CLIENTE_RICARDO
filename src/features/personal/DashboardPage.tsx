import { useQuery } from '@tanstack/react-query'
import { addDays, format, startOfMonth } from 'date-fns'
import { Link } from 'react-router-dom'
import { AlertCircle, CalendarClock, ChevronRight, FileHeart, UserCheck, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatBRL } from '@/lib/money'
import { requireSupabase } from '@/lib/supabase/client'

export function DashboardPage() {
  const { staffMembership } = useAuth()
  const orgId = staffMembership?.organization_id

  const stats = useQuery({
    queryKey: ['personal', 'dashboard', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const monthStart = startOfMonth(new Date()).toISOString()
      const in7 = format(addDays(new Date(), 7), 'yyyy-MM-dd')
      const today = format(new Date(), 'yyyy-MM-dd')

      const [
        totalStudents,
        activeStudents,
        overdueCharges,
        pendingAnamnesis,
        expiringPrograms,
        payments,
      ] = await Promise.all([
        sb.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!),
        sb
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('status', 'active'),
        sb
          .from('charges')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('status', 'overdue'),
        sb
          .from('anamnesis_records')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .in('status', ['submitted', 'under_review']),
        sb
          .from('workout_programs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('status', 'published')
          .gte('valid_until', today)
          .lte('valid_until', in7),
        sb
          .from('payment_records')
          .select('amount_cents')
          .eq('organization_id', orgId!)
          .gte('paid_at', monthStart),
      ])

      const receivedCents = (payments.data || []).reduce((sum, p) => sum + p.amount_cents, 0)

      return {
        total: totalStudents.count ?? 0,
        active: activeStudents.count ?? 0,
        overdue: overdueCharges.count ?? 0,
        anamnesis: pendingAnamnesis.count ?? 0,
        expiring: expiringPrograms.count ?? 0,
        receivedCents,
      }
    },
  })

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  const d = stats.data
  if (!d) {
    return <EmptyState title="Não foi possível carregar indicadores" description={stats.error?.message} />
  }

  const cards = [
    { label: 'Alunos', value: String(d.total), to: '/personal/alunos', icon: Users, alert: false },
    { label: 'Ativos', value: String(d.active), to: '/personal/alunos', icon: UserCheck, alert: false },
    { label: 'Cobranças atrasadas', value: String(d.overdue), to: '/personal/financeiro', icon: AlertCircle, alert: d.overdue > 0 },
    { label: 'Anamneses para revisar', value: String(d.anamnesis), to: '/personal/avaliacoes', icon: FileHeart, alert: d.anamnesis > 0 },
    { label: 'Treinos vencendo (7 dias)', value: String(d.expiring), to: '/personal/treinos', icon: CalendarClock, alert: d.expiring > 0 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Visão geral" description="Resumo dos seus alunos e do financeiro." />

      <Link to="/personal/financeiro" className="block">
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card">
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" aria-hidden />
                Recebido no mês
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">{formatBRL(d.receivedCents)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
                <span
                  className={
                    c.alert
                      ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500'
                      : 'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary'
                  }
                >
                  <c.icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-2xl font-semibold leading-none">{c.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {d.total === 0 && (
        <EmptyState
          title="Nenhum aluno ainda"
          description="Cadastre o primeiro aluno para começar."
          actionLabel="Ir para alunos"
          onAction={() => {
            window.location.href = '/personal/alunos'
          }}
        />
      )}
    </div>
  )
}
