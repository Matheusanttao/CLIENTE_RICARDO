import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { requireSupabase } from '@/lib/supabase/client'
import { GOALS } from '@/lib/constants'

export function StudentsPage() {
  const { staffMembership, user } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'archived' | 'pending'>('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', primary_goal: '' })

  const students = useQuery({
    queryKey: ['personal', 'students', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('students')
        .select('id, full_name, email, phone, status, primary_goal, level')
        .eq('organization_id', orgId!)
        .order('full_name')
      if (error) throw error
      return data
    },
  })

  const requests = useQuery({
    queryKey: ['personal', 'access_requests', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('access_requests')
        .select('id, full_name, email, phone, message, status, created_at')
        .eq('organization_id', orgId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const createStudent = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const { error } = await sb.from('students').insert({
        organization_id: orgId!,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        primary_goal: form.primary_goal || null,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Aluno cadastrado')
      setOpen(false)
      setForm({ full_name: '', email: '', phone: '', primary_goal: '' })
      qc.invalidateQueries({ queryKey: ['personal', 'students'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const invite = useMutation({
    mutationFn: async (email: string) => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('student_invitations')
        .insert({
          organization_id: orgId!,
          email,
          invited_by: user?.id,
        })
        .select('token')
        .single()
      if (error) throw error
      return data.token as string
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/aluno/convite?token=${token}`
      void navigator.clipboard.writeText(url)
      toast.success('Convite criado e link copiado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const sb = requireSupabase()
      const { error } = await sb.rpc('approve_access_request', { p_request_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Solicitação aprovada')
      qc.invalidateQueries({ queryKey: ['personal'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filtered = useMemo(() => {
    return (students.data || []).filter((s) => {
      if (status !== 'all' && s.status !== status) return false
      const hay = `${s.full_name} ${s.email || ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
  }, [students.data, q, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Alunos</h1>
          <p className="text-sm text-muted-foreground">Cadastro, convites e solicitações.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Novo aluno</Button>
      </div>

      {(requests.data?.length || 0) > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h2 className="font-semibold">Solicitações pendentes</h2>
            {requests.data!.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-sm text-muted-foreground">{r.email}</p>
                </div>
                <Button size="sm" onClick={() => approve.mutate(r.id)}>
                  Aprovar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="h-11 rounded-md border border-border bg-card px-3"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="pending">Pendentes</option>
          <option value="archived">Arquivados</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado"
          description="Cadastre um aluno ou envie um convite."
          actionLabel="Cadastrar"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link to={`/personal/alunos/${s.id}`} className="font-medium hover:underline">
                      {s.full_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{s.email || 'Sem e-mail'}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="secondary">{s.status}</Badge>
                      {s.primary_goal && <Badge variant="outline">{s.primary_goal}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {s.email && (
                      <Button variant="outline" size="sm" onClick={() => invite.mutate(s.email!)}>
                        Convidar
                      </Button>
                    )}
                    <Button asChild size="sm">
                      <Link to={`/personal/alunos/${s.id}`}>Abrir</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <select
                className="h-11 w-full rounded-md border border-border bg-card px-3"
                value={form.primary_goal}
                onChange={(e) => setForm((f) => ({ ...f, primary_goal: e.target.value }))}
              >
                <option value="">Selecione</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={!form.full_name || createStudent.isPending}
              onClick={() => createStudent.mutate()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
