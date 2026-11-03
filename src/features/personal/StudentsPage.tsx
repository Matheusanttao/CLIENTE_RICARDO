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
import { generatePassword, suggestUsername } from '@/lib/auth/username'
import { ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { STUDENT_STATUS_LABEL, STUDENT_STATUS_TONE } from '@/features/shared/statusLabels'
import {
  createStudentLogin,
  CredentialFields,
  CredentialsDialog,
  validateCredentials,
  type Credentials,
} from '@/features/personal/StudentAccess'

export function StudentsPage() {
  const { staffMembership } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'archived' | 'pending'>('all')
  const [open, setOpen] = useState(false)
  const emptyForm = { full_name: '', email: '', phone: '', primary_goal: '', username: '', password: '' }
  const [form, setForm] = useState(emptyForm)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  function openNew() {
    setForm({ ...emptyForm, password: generatePassword() })
    setUsernameTouched(false)
    setOpen(true)
  }

  const students = useQuery({
    queryKey: ['personal', 'students', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('students')
        .select('id, full_name, email, phone, status, primary_goal, level, login_username')
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
      const invalid = validateCredentials(form.username, form.password)
      if (invalid) throw new Error(invalid)
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('students')
        .insert({
          organization_id: orgId!,
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          primary_goal: form.primary_goal || null,
          status: 'active',
        })
        .select('id')
        .single()
      if (error) throw error
      try {
        await createStudentLogin(data.id, form.username, form.password)
      } catch (e) {
        // não deixa aluno "pela metade": desfaz o cadastro se o acesso falhar
        await sb.from('students').delete().eq('id', data.id)
        throw e
      }
      return { fullName: form.full_name, username: form.username, password: form.password }
    },
    onSuccess: (created) => {
      setOpen(false)
      setForm(emptyForm)
      setCredentials(created)
      qc.invalidateQueries({ queryKey: ['personal', 'students'] })
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
      const hay = `${s.full_name} ${s.email || ''} ${s.login_username || ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
  }, [students.data, q, status])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alunos"
        description={`${students.data?.length ?? 0} cadastrado(s)`}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden />
            Novo
          </Button>
        }
      />

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

      <div className="flex gap-2">
        <Input placeholder="Buscar aluno…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="h-12 w-32 shrink-0 rounded-xl border border-border bg-muted/40 px-3.5"
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
          description="Cadastre um aluno com usuário e senha."
          actionLabel="Cadastrar"
          onAction={openNew}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link to={`/personal/alunos/${s.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
                      {initials(s.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.login_username ? `@${s.login_username}` : 'Sem acesso ao app'}
                        {s.primary_goal ? ` · ${s.primary_goal}` : ''}
                      </p>
                    </div>
                    {s.status !== 'active' && (
                      <Badge variant={STUDENT_STATUS_TONE[s.status]}>{STUDENT_STATUS_LABEL[s.status]}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </CardContent>
                </Card>
              </Link>
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
              <Input
                value={form.full_name}
                onChange={(e) => {
                  const full_name = e.target.value
                  setForm((f) => ({ ...f, full_name, username: usernameTouched ? f.username : suggestUsername(full_name) }))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <select
                className="h-12 w-full rounded-xl border border-border bg-muted/40 px-3.5"
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
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Acesso ao app</p>
              <CredentialFields
                username={form.username}
                password={form.password}
                onUsername={(username) => {
                  setUsernameTouched(true)
                  setForm((f) => ({ ...f, username }))
                }}
                onPassword={(password) => setForm((f) => ({ ...f, password }))}
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.full_name || createStudent.isPending}
              onClick={() => createStudent.mutate()}
            >
              {createStudent.isPending ? 'Salvando…' : 'Salvar e criar acesso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase()
}
