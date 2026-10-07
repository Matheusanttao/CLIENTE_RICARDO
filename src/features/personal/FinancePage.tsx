import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, startOfMonth } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatBRL, parseBRLToCents } from '@/lib/money'
import { requireSupabase } from '@/lib/supabase/client'
import { createClientRequestId } from '@/lib/utils'

export function FinancePage() {
  const { staffMembership, user } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [planOpen, setPlanOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', amount: '', interval: 'monthly' })
  const [chargeForm, setChargeForm] = useState({
    student_id: '',
    description: '',
    amount: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
  })

  const board = useQuery({
    queryKey: ['personal', 'finance', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const monthStart = startOfMonth(new Date()).toISOString()
      const today = format(new Date(), 'yyyy-MM-dd')
      const upcomingLimit = format(addDays(new Date(), 14), 'yyyy-MM-dd')

      // Atualiza vencidas antes de agregar
      await sb
        .from('charges')
        .update({ status: 'overdue' })
        .eq('organization_id', orgId!)
        .eq('status', 'pending')
        .lt('due_date', today)

      const [plans, charges, payments, students] = await Promise.all([
        sb.from('billing_plans').select('*').eq('organization_id', orgId!).order('name'),
        sb
          .from('charges')
          .select('*, students(full_name)')
          .eq('organization_id', orgId!)
          .order('due_date', { ascending: false })
          .limit(100),
        sb
          .from('payment_records')
          .select('amount_cents')
          .eq('organization_id', orgId!)
          .gte('paid_at', monthStart),
        sb.from('students').select('id, full_name').eq('organization_id', orgId!).eq('status', 'active'),
      ])

      if (plans.error) throw plans.error
      if (charges.error) throw charges.error
      if (payments.error) throw payments.error
      if (students.error) throw students.error

      const received = (payments.data || []).reduce((s, p) => s + p.amount_cents, 0)
      const pending = (charges.data || [])
        .filter((c) => c.status === 'pending')
        .reduce((s, c) => s + c.amount_cents, 0)
      const overdue = (charges.data || [])
        .filter((c) => c.status === 'overdue')
        .reduce((s, c) => s + c.amount_cents, 0)
      const upcoming = (charges.data || []).filter(
        (c) => c.status === 'pending' && c.due_date >= today && c.due_date <= upcomingLimit,
      )

      return {
        plans: plans.data || [],
        charges: charges.data || [],
        students: students.data || [],
        received,
        pending,
        overdue,
        upcoming,
      }
    },
  })

  const createPlan = useMutation({
    mutationFn: async () => {
      const cents = parseBRLToCents(planForm.amount)
      if (cents == null) throw new Error('Valor inválido')
      const sb = requireSupabase()
      const { error } = await sb.from('billing_plans').insert({
        organization_id: orgId!,
        name: planForm.name,
        amount_cents: cents,
        interval: planForm.interval as 'monthly',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Plano criado')
      setPlanOpen(false)
      qc.invalidateQueries({ queryKey: ['personal', 'finance'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createCharge = useMutation({
    mutationFn: async () => {
      const cents = parseBRLToCents(chargeForm.amount)
      if (cents == null) throw new Error('Valor inválido')
      const sb = requireSupabase()
      const { error } = await sb.from('charges').insert({
        organization_id: orgId!,
        student_id: chargeForm.student_id,
        description: chargeForm.description,
        amount_cents: cents,
        due_date: chargeForm.due_date,
        status: 'pending',
        idempotency_key: createClientRequestId(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cobrança criada')
      setChargeOpen(false)
      qc.invalidateQueries({ queryKey: ['personal', 'finance'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const markPaid = useMutation({
    mutationFn: async (chargeId: string) => {
      const sb = requireSupabase()
      const charge = board.data?.charges.find((c) => c.id === chargeId)
      if (!charge) throw new Error('Cobrança não encontrada')
      const key = createClientRequestId()
      const { error: payErr } = await sb.from('payment_records').insert({
        organization_id: orgId!,
        charge_id: chargeId,
        amount_cents: charge.amount_cents,
        method: 'manual',
        recorded_by: user?.id,
        idempotency_key: key,
      })
      if (payErr) throw payErr
      const { error } = await sb
        .from('charges')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', chargeId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Pagamento registrado manualmente')
      qc.invalidateQueries({ queryKey: ['personal', 'finance'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const d = board.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Controle manual. Recebido = soma de pagamentos do mês. Pendente/vencido pelos status das cobranças.
            Integração Pix/cartão preparada na camada de gateway — sem botão Pagar falso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPlanOpen(true)}>
            Novo plano
          </Button>
          <Button onClick={() => setChargeOpen(true)}>Nova cobrança</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Recebido no mês" value={formatBRL(d?.received || 0)} />
        <Metric title="Pendente" value={formatBRL(d?.pending || 0)} />
        <Metric title="Vencido" value={formatBRL(d?.overdue || 0)} />
        <Metric title="Próximos vencimentos (14d)" value={String(d?.upcoming.length || 0)} />
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Planos</h2>
        {(d?.plans.length || 0) === 0 ? (
          <EmptyState title="Nenhum plano" actionLabel="Criar plano" onAction={() => setPlanOpen(true)} />
        ) : (
          d!.plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(p.amount_cents)} · {p.interval}
                  </p>
                </div>
                <Badge variant={p.is_active ? 'default' : 'secondary'}>
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Cobranças</h2>
        {(d?.charges.length || 0) === 0 ? (
          <EmptyState title="Nenhuma cobrança" />
        ) : (
          d!.charges.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{c.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {(c.students as { full_name?: string } | null)?.full_name} · venc.{' '}
                    {new Date(c.due_date).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Badge>{c.status}</Badge>
                    <span className="text-sm font-medium">{formatBRL(c.amount_cents)}</span>
                  </div>
                </div>
                {(c.status === 'pending' || c.status === 'overdue') && (
                  <Button size="sm" onClick={() => markPaid.mutate(c.id)}>
                    Registrar pagamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome">
              <Input value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Valor (R$)">
              <Input value={planForm.amount} onChange={(e) => setPlanForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Button className="w-full" onClick={() => createPlan.mutate()}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Aluno">
              <select
                className="h-11 w-full rounded-md border border-border bg-card px-3"
                value={chargeForm.student_id}
                onChange={(e) => setChargeForm((f) => ({ ...f, student_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {(d?.students || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição">
              <Input
                value={chargeForm.description}
                onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <Field label="Valor (R$)">
              <Input
                value={chargeForm.amount}
                onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </Field>
            <Field label="Vencimento">
              <Input
                type="date"
                value={chargeForm.due_date}
                onChange={(e) => setChargeForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </Field>
            <Button className="w-full" onClick={() => createCharge.mutate()}>
              Criar cobrança
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
