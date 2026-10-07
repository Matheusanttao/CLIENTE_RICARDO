import { useQuery } from '@tanstack/react-query'
import { addDays, format, startOfMonth } from 'date-fns'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    { label: 'Total de alunos', value: String(d.total), to: '/personal/alunos' },
    { label: 'Alunos ativos', value: String(d.active), to: '/personal/alunos' },
    { label: 'Cobranças vencidas', value: String(d.overdue), to: '/personal/financeiro' },
    { label: 'Anamneses pendentes', value: String(d.anamnesis), to: '/personal/avaliacoes' },
    { label: 'Treinos próximos do vencimento', value: String(d.expiring), to: '/personal/treinos' },
    {
      label: 'Recebido no mês',
      value: formatBRL(d.receivedCents),
      to: '/personal/financeiro',
      hint: 'Soma de pagamentos registrados no mês corrente',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Indicadores calculados com dados reais da organização.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{c.value}</p>
                {'hint' in c && c.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                )}
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
