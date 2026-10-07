import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { calcFatFreeMass, calcFatMass, calcIMC } from '@/lib/assessment'
import { requireSupabase } from '@/lib/supabase/client'

export function AssessmentsPage() {
  const { activeStudent } = useAuth()

  const assessments = useQuery({
    queryKey: ['student', 'assessments', activeStudent?.id],
    enabled: Boolean(activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('physical_assessments')
        .select('*')
        .eq('student_id', activeStudent!.id)
        .order('assessed_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  if (!activeStudent) {
    return <EmptyState title="Sem vínculo" description="Cadastro necessário." />
  }

  if (assessments.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (assessments.isError) {
    return (
      <EmptyState
        title="Erro ao carregar"
        description={assessments.error instanceof Error ? assessments.error.message : 'Tente novamente.'}
        actionLabel="Recarregar"
        onAction={() => assessments.refetch()}
      />
    )
  }

  const list = assessments.data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Avaliações físicas</h1>
        <p className="text-sm text-muted-foreground">Registros liberados pelo seu personal (somente leitura).</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação"
          description="Quando seu personal registrar uma avaliação, ela aparecerá aqui."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const imc = calcIMC(a.weight_kg, a.height_cm)
            const fatMass =
              a.fat_mass_kg != null
                ? { ok: true as const, value: a.fat_mass_kg }
                : calcFatMass(a.weight_kg, a.body_fat_percent)
            const ffm =
              a.fat_free_mass_kg != null
                ? { ok: true as const, value: a.fat_free_mass_kg }
                : fatMass.ok
                  ? calcFatFreeMass(a.weight_kg, fatMass.value)
                  : { ok: false as const, error: '' }

            return (
              <li key={a.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {format(new Date(a.assessed_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {a.weight_kg != null && (
                      <Metric label="Peso" value={`${a.weight_kg} kg`} />
                    )}
                    {a.height_cm != null && (
                      <Metric label="Altura" value={`${a.height_cm} cm`} />
                    )}
                    {imc.ok && <Metric label="IMC" value={imc.value.toString()} />}
                    {a.body_fat_percent != null && (
                      <Metric label="% Gordura" value={`${a.body_fat_percent}%`} />
                    )}
                    {fatMass.ok && <Metric label="Massa gorda" value={`${fatMass.value} kg`} />}
                    {ffm.ok && <Metric label="Massa magra" value={`${ffm.value} kg`} />}
                    {a.muscle_mass_kg != null && (
                      <Metric label="Massa muscular" value={`${a.muscle_mass_kg} kg`} />
                    )}
                    {a.notes && (
                      <p className="col-span-2 mt-2 text-muted-foreground">{a.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
