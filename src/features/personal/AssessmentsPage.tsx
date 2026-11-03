import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { calcIMC } from '@/lib/assessment'
import { formatDateBR } from '@/lib/utils'
import { ANAMNESIS_STATUS_LABEL, ANAMNESIS_STATUS_TONE } from '@/features/shared/statusLabels'
import { requireSupabase } from '@/lib/supabase/client'

export function AssessmentsPage() {
  const { staffMembership } = useAuth()
  const orgId = staffMembership?.organization_id

  const data = useQuery({
    queryKey: ['personal', 'assessments-board', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const [assessments, pendingAnamnesis] = await Promise.all([
        sb
          .from('physical_assessments')
          .select('id, assessed_at, weight_kg, height_cm, student_id, students(full_name)')
          .eq('organization_id', orgId!)
          .order('assessed_at', { ascending: false })
          .limit(50),
        sb
          .from('anamnesis_records')
          .select('id, status, updated_at, student_id, students(full_name)')
          .eq('organization_id', orgId!)
          .in('status', ['submitted', 'under_review'])
          .order('updated_at', { ascending: false }),
      ])
      if (assessments.error) throw assessments.error
      if (pendingAnamnesis.error) throw pendingAnamnesis.error
      return { assessments: assessments.data || [], pending: pendingAnamnesis.data || [] }
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Avaliações</h1>
        <p className="text-sm text-muted-foreground">Avaliações físicas e anamneses pendentes de revisão.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Anamneses pendentes</h2>
        {(data.data?.pending.length || 0) === 0 ? (
          <EmptyState title="Nenhuma anamnese pendente" />
        ) : (
          data.data!.pending.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {(a.students as { full_name?: string } | null)?.full_name || 'Aluno'}
                  </p>
                  <Badge className="mt-1" variant={ANAMNESIS_STATUS_TONE[a.status]}>{ANAMNESIS_STATUS_LABEL[a.status]}</Badge>
                </div>
                <Link className="text-sm underline" to={`/personal/alunos/${a.student_id}`}>
                  Revisar
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Avaliações recentes</h2>
        {(data.data?.assessments.length || 0) === 0 ? (
          <EmptyState
            title="Nenhuma avaliação"
            description="Registre pela ficha do aluno."
            actionLabel="Alunos"
            onAction={() => {
              window.location.href = '/personal/alunos'
            }}
          />
        ) : (
          data.data!.assessments.map((a) => {
            const imc = calcIMC(a.weight_kg, a.height_cm)
            return (
              <Card key={a.id}>
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">
                    {(a.students as { full_name?: string } | null)?.full_name || 'Aluno'}
                  </p>
                  <p>
                    {formatDateBR(a.assessed_at)} · IMC{' '}
                    {imc.ok ? imc.value : '—'}
                  </p>
                  <Link className="underline" to={`/personal/alunos/${a.student_id}`}>
                    Abrir ficha
                  </Link>
                </CardContent>
              </Card>
            )
          })
        )}
      </section>
    </div>
  )
}
