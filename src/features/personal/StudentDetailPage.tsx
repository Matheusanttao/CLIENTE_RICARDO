import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { calcFatFreeMass, calcFatMass, calcIMC } from '@/lib/assessment'
import { GOALS, WEEKDAYS } from '@/lib/constants'
import { requireSupabase } from '@/lib/supabase/client'
import { formatDateBR } from '@/lib/utils'
import { ANAMNESIS_STATUS_LABEL, ANAMNESIS_STATUS_TONE, STUDENT_STATUS_LABEL, STUDENT_STATUS_TONE } from '@/features/shared/statusLabels'
import { StudentAccessCard } from '@/features/personal/StudentAccess'

export function StudentDetailPage() {
  const { id } = useParams()
  const { staffMembership, user } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [tab, setTab] = useState<'dados' | 'anamnese' | 'avaliacoes'>('dados')

  const student = useQuery({
    queryKey: ['personal', 'student', id],
    enabled: Boolean(id && orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb.from('students').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })

  const anamnesis = useQuery({
    queryKey: ['personal', 'student-anamnesis', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('anamnesis_records')
        .select('*')
        .eq('student_id', id!)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const assessments = useQuery({
    queryKey: ['personal', 'student-assessments', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('physical_assessments')
        .select('*')
        .eq('student_id', id!)
        .order('assessed_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const archive = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const { error } = await sb.from('students').update({ status: 'archived' }).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Aluno arquivado')
      qc.invalidateQueries({ queryKey: ['personal', 'student', id] })
    },
  })

  const saveStudent = useMutation({
    mutationFn: async (payload: {
      full_name?: string
      email?: string | null
      phone?: string | null
      primary_goal?: string | null
      level?: 'beginner' | 'intermediate' | 'advanced' | null
    }) => {
      const sb = requireSupabase()
      const { error } = await sb.from('students').update(payload).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Dados salvos')
      qc.invalidateQueries({ queryKey: ['personal', 'student', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reviewAnamnesis = useMutation({
    mutationFn: async (anamnesisId: string) => {
      const sb = requireSupabase()
      const { error } = await sb
        .from('anamnesis_records')
        .update({
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', anamnesisId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Anamnese marcada como revisada')
      qc.invalidateQueries({ queryKey: ['personal', 'student-anamnesis', id] })
    },
  })

  const [assessmentForm, setAssessmentForm] = useState({
    weight_kg: '',
    height_cm: '',
    body_fat_percent: '',
    body_fat_method: '',
    body_fat_source: '',
    notes: '',
  })

  const createAssessment = useMutation({
    mutationFn: async () => {
      const weight = Number(assessmentForm.weight_kg)
      const height = Number(assessmentForm.height_cm)
      const bf = assessmentForm.body_fat_percent ? Number(assessmentForm.body_fat_percent) : null
      const fat = bf != null ? calcFatMass(weight, bf) : null
      const ffm = fat?.ok ? calcFatFreeMass(weight, fat.value) : null

      const sb = requireSupabase()
      const { error } = await sb.from('physical_assessments').insert({
        organization_id: orgId!,
        student_id: id!,
        assessed_by: user?.id,
        weight_kg: weight || null,
        height_cm: height || null,
        body_fat_percent: bf,
        body_fat_method: assessmentForm.body_fat_method || null,
        body_fat_source: assessmentForm.body_fat_source || null,
        fat_mass_kg: fat?.ok ? fat.value : null,
        fat_free_mass_kg: ffm?.ok ? ffm.value : null,
        notes: assessmentForm.notes || null,
        perimetry: {},
        skinfolds_mm: {},
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Avaliação registrada')
      qc.invalidateQueries({ queryKey: ['personal', 'student-assessments', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!student.data) {
    return <p className="text-sm text-muted-foreground">Carregando ficha…</p>
  }

  const s = student.data
  const imcPreview = calcIMC(
    Number(assessmentForm.weight_kg) || null,
    Number(assessmentForm.height_cm) || null,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{s.full_name}</h1>
          <div className="mt-1 flex gap-2">
            <Badge variant={STUDENT_STATUS_TONE[s.status]}>{STUDENT_STATUS_LABEL[s.status]}</Badge>
            {s.primary_goal && <Badge variant="outline">{s.primary_goal}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/personal/treinos">Montar treino</Link>
          </Button>
          {s.status !== 'archived' && (
            <Button variant="secondary" onClick={() => archive.mutate()}>
              Arquivar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {(['dados', 'anamnese', 'avaliacoes'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'h-10 rounded-md bg-card text-sm font-semibold shadow-sm'
                : 'h-10 rounded-md text-sm font-medium text-muted-foreground'
            }
          >
            {t === 'dados' ? 'Dados' : t === 'anamnese' ? 'Anamnese' : 'Avaliações'}
          </button>
        ))}
      </div>

      {tab === 'dados' && <StudentAccessCard student={s} />}

      {tab === 'dados' && (
        <Card>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input
                defaultValue={s.full_name}
                onBlur={(e) => saveStudent.mutate({ full_name: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <Input defaultValue={s.email || ''} onBlur={(e) => saveStudent.mutate({ email: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input defaultValue={s.phone || ''} onBlur={(e) => saveStudent.mutate({ phone: e.target.value })} />
            </Field>
            <Field label="Objetivo principal">
              <select
                className="h-12 w-full rounded-xl border border-border bg-muted/40 px-3.5"
                defaultValue={s.primary_goal || ''}
                onChange={(e) => saveStudent.mutate({ primary_goal: e.target.value })}
              >
                <option value="">—</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nível">
              <select
                className="h-12 w-full rounded-xl border border-border bg-muted/40 px-3.5"
                defaultValue={s.level || ''}
                onChange={(e) =>
                  saveStudent.mutate({
                    level: (e.target.value || null) as 'beginner' | 'intermediate' | 'advanced' | null,
                  })
                }
              >
                <option value="">—</option>
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </Field>
            <Field label="Dias disponíveis">
              <p className="text-sm text-muted-foreground">
                {(s.available_days || [])
                  .map((d) => WEEKDAYS.find((w) => w.value === d)?.label || d)
                  .join(', ') || 'Não informado'}
              </p>
            </Field>
          </CardContent>
        </Card>
      )}

      {tab === 'anamnese' && (
        <div className="space-y-3">
          {(anamnesis.data || []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma anamnese registrada.</p>
          )}
          {(anamnesis.data || []).map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Versão {a.form_version}</CardTitle>
                <Badge variant={ANAMNESIS_STATUS_TONE[a.status]}>{ANAMNESIS_STATUS_LABEL[a.status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(
                    { saude: a.health_history, habitos: a.habits, esportes: a.sports_history },
                    null,
                    2,
                  )}
                </pre>
                {a.truthfulness_declared && (
                  <p>Declaração de veracidade em {a.declared_at ? new Date(a.declared_at).toLocaleString('pt-BR') : '—'}</p>
                )}
                {a.status !== 'reviewed' && (
                  <Button size="sm" onClick={() => reviewAnamnesis.mutate(a.id)}>
                    Marcar como revisada
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'avaliacoes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova avaliação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Peso (kg)">
                <Input
                  value={assessmentForm.weight_kg}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, weight_kg: e.target.value }))}
                />
              </Field>
              <Field label="Altura (cm)">
                <Input
                  value={assessmentForm.height_cm}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, height_cm: e.target.value }))}
                />
              </Field>
              <Field label="Gordura (%)">
                <Input
                  value={assessmentForm.body_fat_percent}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, body_fat_percent: e.target.value }))}
                />
              </Field>
              <Field label="Método do % gordura">
                <Input
                  value={assessmentForm.body_fat_method}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, body_fat_method: e.target.value }))}
                />
              </Field>
              <Field label="Origem do % gordura">
                <Input
                  value={assessmentForm.body_fat_source}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, body_fat_source: e.target.value }))}
                />
              </Field>
              <div className="sm:col-span-2 text-sm text-muted-foreground">
                IMC:{' '}
                {imcPreview.ok ? imcPreview.value : 'informe peso e altura válidos'}
              </div>
              <Field label="Observações">
                <Textarea
                  value={assessmentForm.notes}
                  onChange={(e) => setAssessmentForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
              <Button className="sm:col-span-2" onClick={() => createAssessment.mutate()}>
                Salvar avaliação
              </Button>
            </CardContent>
          </Card>

          {(assessments.data || []).map((a) => {
            const imc = calcIMC(a.weight_kg, a.height_cm)
            return (
              <Card key={a.id}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <p className="font-medium">{formatDateBR(a.assessed_at)}</p>
                  <p>Peso: {a.weight_kg ?? '—'} kg · Altura: {a.height_cm ?? '—'} cm</p>
                  <p>IMC: {imc.ok ? imc.value : '—'}</p>
                  <p>
                    Gordura: {a.body_fat_percent ?? '—'}% · Massa gordura: {a.fat_mass_kg ?? '—'} kg ·
                    Livre de gordura: {a.fat_free_mass_kg ?? '—'} kg
                  </p>
                  <p className="text-muted-foreground">
                    Massa livre de gordura não é tratada como massa muscular.
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
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
