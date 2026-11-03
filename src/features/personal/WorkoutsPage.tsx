import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Copy, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PROGRAM_STATUS_LABEL, PROGRAM_STATUS_TONE } from '@/features/shared/statusLabels'
import { requireSupabase } from '@/lib/supabase/client'

export function WorkoutsPage() {
  const { staffMembership, user } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [form, setForm] = useState({
    student_id: '',
    title: '',
    objective: '',
    frequency_per_week: '3',
    valid_from: '',
    valid_until: '',
  })
  const [sessionLabel, setSessionLabel] = useState('A')
  const [exerciseForm, setExerciseForm] = useState({
    exercise_id: '',
    sets: '3',
    reps: '8-12',
    suggested_load: '',
    rest_seconds: '90',
  })

  const programs = useQuery({
    queryKey: ['personal', 'programs', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('workout_programs')
        .select('id, title, status, version, valid_until, student_id, students(full_name)')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const students = useQuery({
    queryKey: ['personal', 'students-mini', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('students')
        .select('id, full_name')
        .eq('organization_id', orgId!)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data
    },
  })

  const exercises = useQuery({
    queryKey: ['personal', 'exercises-mini', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('exercises')
        .select('id, name, instructions, video_url, image_path')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const detail = useQuery({
    queryKey: ['personal', 'program-detail', selectedProgramId],
    enabled: Boolean(selectedProgramId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data: sessions, error } = await sb
        .from('workout_sessions')
        .select('*, workout_exercises(*)')
        .eq('program_id', selectedProgramId!)
        .order('sort_order')
      if (error) throw error
      return sessions
    },
  })

  const createProgram = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('workout_programs')
        .insert({
          organization_id: orgId!,
          student_id: form.student_id,
          title: form.title,
          objective: form.objective || null,
          frequency_per_week: Number(form.frequency_per_week) || null,
          valid_from: form.valid_from || null,
          valid_until: form.valid_until || null,
          status: 'draft',
          created_by: user?.id,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (id) => {
      toast.success('Programa criado (rascunho)')
      setCreateOpen(false)
      setSelectedProgramId(id)
      qc.invalidateQueries({ queryKey: ['personal', 'programs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addSession = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const order = detail.data?.length || 0
      const { error } = await sb.from('workout_sessions').insert({
        organization_id: orgId!,
        program_id: selectedProgramId!,
        label: sessionLabel,
        sort_order: order,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Sessão adicionada')
      qc.invalidateQueries({ queryKey: ['personal', 'program-detail', selectedProgramId] })
    },
  })

  const duplicateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const sb = requireSupabase()
      const session = detail.data?.find((s) => s.id === sessionId)
      if (!session) throw new Error('Sessão não encontrada')
      const { data: created, error } = await sb
        .from('workout_sessions')
        .insert({
          organization_id: orgId!,
          program_id: selectedProgramId!,
          label: `${session.label} (cópia)`,
          sort_order: (detail.data?.length || 0),
          estimated_minutes: session.estimated_minutes,
          notes: session.notes,
        })
        .select('id')
        .single()
      if (error) throw error
      const exercisesRows = (session.workout_exercises || []) as Array<Record<string, unknown>>
      if (exercisesRows.length) {
        const { error: exErr } = await sb.from('workout_exercises').insert(
          exercisesRows.map((ex, idx) => ({
            organization_id: orgId!,
            session_id: created.id,
            exercise_id: ex.exercise_id as string | null,
            sort_order: idx,
            exercise_name: ex.exercise_name as string,
            exercise_instructions: ex.exercise_instructions as string | null,
            exercise_video_url: ex.exercise_video_url as string | null,
            exercise_image_path: ex.exercise_image_path as string | null,
            sets: ex.sets as number | null,
            reps: ex.reps as string | null,
            suggested_load: ex.suggested_load as number | null,
            load_unit: ex.load_unit as string | null,
            rest_seconds: ex.rest_seconds as number | null,
            notes: ex.notes as string | null,
          })),
        )
        if (exErr) throw exErr
      }
    },
    onSuccess: () => {
      toast.success('Sessão duplicada')
      qc.invalidateQueries({ queryKey: ['personal', 'program-detail', selectedProgramId] })
    },
  })

  const addExercise = useMutation({
    mutationFn: async (sessionId: string) => {
      const ex = exercises.data?.find((e) => e.id === exerciseForm.exercise_id)
      if (!ex) throw new Error('Selecione um exercício da biblioteca')
      const sb = requireSupabase()
      const session = detail.data?.find((s) => s.id === sessionId)
      const order = ((session?.workout_exercises as unknown[]) || []).length
      const { error } = await sb.from('workout_exercises').insert({
        organization_id: orgId!,
        session_id: sessionId,
        exercise_id: ex.id,
        sort_order: order,
        exercise_name: ex.name,
        exercise_instructions: ex.instructions,
        exercise_video_url: ex.video_url,
        exercise_image_path: ex.image_path,
        sets: Number(exerciseForm.sets) || null,
        reps: exerciseForm.reps || null,
        suggested_load: exerciseForm.suggested_load ? Number(exerciseForm.suggested_load) : null,
        load_unit: 'kg',
        rest_seconds: Number(exerciseForm.rest_seconds) || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Exercício adicionado')
      qc.invalidateQueries({ queryKey: ['personal', 'program-detail', selectedProgramId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeExercise = useMutation({
    mutationFn: async (workoutExerciseId: string) => {
      const { error } = await requireSupabase().from('workout_exercises').delete().eq('id', workoutExerciseId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Exercício removido')
      qc.invalidateQueries({ queryKey: ['personal', 'program-detail', selectedProgramId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const publish = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const { error } = await sb
        .from('workout_programs')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', selectedProgramId!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Programa publicado para o aluno')
      qc.invalidateQueries({ queryKey: ['personal', 'programs'] })
    },
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const sb = requireSupabase()
      const { error } = await sb.from('workout_programs').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Programa arquivado')
      qc.invalidateQueries({ queryKey: ['personal', 'programs'] })
    },
  })

  const duplicateProgram = useMutation({
    mutationFn: async (programId: string) => {
      const sb = requireSupabase()
      const prog = programs.data?.find((p) => p.id === programId)
      if (!prog) throw new Error('Programa não encontrado')
      const { data: created, error } = await sb
        .from('workout_programs')
        .insert({
          organization_id: orgId!,
          student_id: prog.student_id,
          title: `${prog.title} (cópia)`,
          status: 'draft',
          version: (prog.version || 1) + 1,
          parent_program_id: prog.id,
          created_by: user?.id,
        })
        .select('id')
        .single()
      if (error) throw error

      const { data: sessions } = await sb
        .from('workout_sessions')
        .select('*, workout_exercises(*)')
        .eq('program_id', programId)
        .order('sort_order')

      for (const session of sessions || []) {
        const { data: newSession, error: sErr } = await sb
          .from('workout_sessions')
          .insert({
            organization_id: orgId!,
            program_id: created.id,
            label: session.label,
            sort_order: session.sort_order,
            estimated_minutes: session.estimated_minutes,
            notes: session.notes,
          })
          .select('id')
          .single()
        if (sErr) throw sErr
        const rows = (session.workout_exercises || []) as Array<Record<string, unknown>>
        if (rows.length) {
          await sb.from('workout_exercises').insert(
            rows.map((ex, idx) => ({
              organization_id: orgId!,
              session_id: newSession.id,
              exercise_id: ex.exercise_id as string | null,
              sort_order: idx,
              exercise_name: ex.exercise_name as string,
              exercise_instructions: ex.exercise_instructions as string | null,
              exercise_video_url: ex.exercise_video_url as string | null,
              exercise_image_path: ex.exercise_image_path as string | null,
              sets: ex.sets as number | null,
              reps: ex.reps as string | null,
              suggested_load: ex.suggested_load as number | null,
              load_unit: ex.load_unit as string | null,
              rest_seconds: ex.rest_seconds as number | null,
              notes: ex.notes as string | null,
            })),
          )
        }
      }
      return created.id as string
    },
    onSuccess: (id) => {
      toast.success('Programa duplicado como rascunho')
      setSelectedProgramId(id)
      qc.invalidateQueries({ queryKey: ['personal', 'programs'] })
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Treinos"
        description="Monte o programa, confira e publique para o aluno."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Novo
          </Button>
        }
      />

      {(programs.data?.length || 0) === 0 ? (
        <EmptyState title="Nenhum programa" actionLabel="Criar" onAction={() => setCreateOpen(true)} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {programs.data!.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <button type="button" className="block w-full text-left" onClick={() => setSelectedProgramId(p.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{p.title}</p>
                      <Badge variant={PROGRAM_STATUS_TONE[p.status]}>{PROGRAM_STATUS_LABEL[p.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(p.students as { full_name?: string } | null)?.full_name} · versão {p.version}
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 sm:flex-none sm:px-6" variant={selectedProgramId === p.id ? 'default' : 'outline'} onClick={() => setSelectedProgramId(p.id)}>
                      {selectedProgramId === p.id ? 'Editando' : 'Editar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicateProgram.mutate(p.id)} aria-label="Duplicar">
                      <Copy className="h-4 w-4" aria-hidden />
                    </Button>
                    {p.status !== 'archived' && (
                      <Button size="sm" variant="ghost" onClick={() => archive.mutate(p.id)}>
                        Arquivar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {selectedProgramId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Montar treino</CardTitle>
            <Button size="sm" onClick={() => publish.mutate()}>
              Publicar para o aluno
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                className="w-24"
                aria-label="Nome do treino (ex.: A, B, C)"
                placeholder="A"
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
              />
              <Button variant="outline" className="flex-1" onClick={() => addSession.mutate()}>
                <Plus className="h-4 w-4" aria-hidden />
                Adicionar treino {sessionLabel || ''}
              </Button>
            </div>

            {(detail.data || []).map((session) => (
              <div key={session.id} className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h3 className="font-display font-semibold">Treino {session.label}</h3>
                  <Button size="sm" variant="ghost" onClick={() => duplicateSession.mutate(session.id)}>
                    <Copy className="h-4 w-4" aria-hidden />
                    Duplicar
                  </Button>
                </div>
                <ul className="divide-y divide-border text-sm">
                  {(
                    (session.workout_exercises as Array<{
                      id: string
                      exercise_name: string
                      sets: number | null
                      reps: string | null
                      suggested_load: number | null
                      rest_seconds: number | null
                    }>) || []
                  ).map((ex, idx) => (
                    <li key={ex.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ex.exercise_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets ?? '—'} × {ex.reps ?? '—'}
                          {ex.suggested_load != null ? ` · ${ex.suggested_load} kg` : ''}
                          {ex.rest_seconds ? ` · descanso ${ex.rest_seconds}s` : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover ${ex.exercise_name}`}
                        onClick={() => removeExercise.mutate(ex.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 border-t border-border bg-muted/30 p-3">
                  <select
                    className="h-12 w-full rounded-xl border border-border bg-muted/40 px-3.5"
                    value={exerciseForm.exercise_id}
                    onChange={(e) => setExerciseForm((f) => ({ ...f, exercise_id: e.target.value }))}
                  >
                    <option value="">+ Escolher exercício</option>
                    {(exercises.data || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-4 gap-2">
                    <MiniField label="Séries">
                      <Input inputMode="numeric" value={exerciseForm.sets} onChange={(e) => setExerciseForm((f) => ({ ...f, sets: e.target.value }))} />
                    </MiniField>
                    <MiniField label="Reps">
                      <Input value={exerciseForm.reps} onChange={(e) => setExerciseForm((f) => ({ ...f, reps: e.target.value }))} />
                    </MiniField>
                    <MiniField label="Carga (kg)">
                      <Input
                        inputMode="decimal"
                        value={exerciseForm.suggested_load}
                        onChange={(e) => setExerciseForm((f) => ({ ...f, suggested_load: e.target.value }))}
                      />
                    </MiniField>
                    <MiniField label="Descanso (s)">
                      <Input
                        inputMode="numeric"
                        value={exerciseForm.rest_seconds}
                        onChange={(e) => setExerciseForm((f) => ({ ...f, rest_seconds: e.target.value }))}
                      />
                    </MiniField>
                  </div>
                  <Button className="w-full" disabled={addExercise.isPending} onClick={() => addExercise.mutate(session.id)}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar ao treino {session.label}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo programa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Aluno</Label>
              <select
                className="h-12 w-full rounded-xl border border-border bg-muted/40 px-3.5"
                value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {(students.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Frequência semanal</Label>
              <Input
                value={form.frequency_per_week}
                onChange={(e) => setForm((f) => ({ ...f, frequency_per_week: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Válido de</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!form.student_id || !form.title}
              onClick={() => createProgram.mutate()}
            >
              Criar rascunho
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
