import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { CHARGE_STATUS_LABEL } from '@/features/shared/statusLabels'
import { formatBRL } from '@/lib/money'
import { requireSupabase } from '@/lib/supabase/client'
import type { ChargeStatus } from '@/types/database'

function chargeVariant(status: ChargeStatus): 'default' | 'secondary' | 'danger' | 'outline' {
  if (status === 'paid') return 'secondary'
  if (status === 'overdue') return 'danger'
  if (status === 'cancelled') return 'outline'
  return 'default'
}

export function PaymentsPage() {
  const { activeStudent } = useAuth()

  const charges = useQuery({
    queryKey: ['student', 'charges', activeStudent?.id],
    enabled: Boolean(activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('charges')
        .select('id, description, amount_cents, due_date, status, paid_at')
        .eq('student_id', activeStudent!.id)
        .order('due_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  if (!activeStudent) {
    return <EmptyState title="Sem vínculo" description="Cadastro necessário." />
  }

  if (charges.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (charges.isError) {
    return (
      <EmptyState
        title="Erro ao carregar cobranças"
        description={charges.error instanceof Error ? charges.error.message : 'Tente novamente.'}
        actionLabel="Recarregar"
        onAction={() => charges.refetch()}
      />
    )
  }

  const list = charges.data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Suas cobranças e status. Pagamentos são confirmados pelo personal.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Nenhuma cobrança" description="Você não possui cobranças registradas." />
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base">{c.description}</CardTitle>
                  <Badge variant={chargeVariant(c.status)}>{CHARGE_STATUS_LABEL[c.status]}</Badge>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="font-medium">{formatBRL(c.amount_cents)}</p>
                  <p className="text-muted-foreground">
                    Vencimento: {format(new Date(c.due_date), 'd/MM/yyyy', { locale: ptBR })}
                  </p>
                  {c.paid_at && (
                    <p className="text-muted-foreground">
                      Pago em {format(new Date(c.paid_at), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
