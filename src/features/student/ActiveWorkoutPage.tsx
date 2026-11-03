import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { isOnline, OFFLINE_SAVE_MESSAGE } from '@/lib/offline'
import { requireSupabase } from '@/lib/supabase/client'
import { cn, createClientRequestId } from '@/lib/utils'
import type { Json, TrainingLogStatus } from '@/types/database'
import { ExercisePhoto } from '@/features/student/ExerciseImage'

type SnapshotExercise = {
  workout_exercise_id: string
  exercise_name: string
  sets: number | null
  reps: string | null
  suggested_load: number | null
  load_unit: string | null
  rest_seconds: number | null
  notes: string | null
  image_path?: string | null
}

type SetDraft = {
  setNumber: number
  prescribed_reps: string | null
  prescribed_load: number | null
  prescribed_load_unit: string | null
  actual_reps: string
  actual_load: string
  completed: boolean
  logId?: string
}

function parseSnapshot(raw: Json): SnapshotExercise[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is SnapshotExercise => {
    return typeof item === 'object' && item !== null && 'exercise_name' in item
  }) as SnapshotExercise[]
}

function formatRestMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ActiveWorkoutPage() {
  const { id: logId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeStudent } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0)
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft[]>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const logQuery = useQuery({
    queryKey: ['student', 'training-log', logId],
    enabled: Boolean(logId && activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data: log, error } = await sb
        .from('training_logs')
        .select('*')
        .eq('id', logId!)
        .eq('student_id', activeStudent!.id)
        .maybeSingle()
      if (error) throw error
      if (!log) return null

      const { data: sets, error: sErr } = await sb
        .from('training_set_logs')
        .select('*')
        .eq('training_log_id', log.id)
        .order('set_number')
      if (sErr) throw sErr

      return { log, sets: sets ?? [] }
    },
  })

  const prescription = useMemo(() => {
    if (!logQuery.data) return []
    return parseSnapshot(logQuery.data.log.prescription_snapshot)
  }, [logQuery.data])

  useEffect(() => {
    const payload = logQuery.data
    if (!payload || prescription.length === 0) return
    setSetDrafts((prev) => {
      const next = { ...prev }
      for (const ex of prescription) {
        const key = ex.workout_exercise_id
        if (next[key]?.length) continue
        const existing = payload.sets.filter(
          (s) => s.workout_exercise_id === ex.workout_exercise_id,
        )
        const setCount = Math.max(ex.sets ?? 1, existing.length, 1)
        const rows: SetDraft[] = []
        for (let i = 1; i <= setCount; i++) {
          const saved = existing.find((s) => s.set_number === i)
          rows.push({
            setNumber: i,
            prescribed_reps: ex.reps,
            prescribed_load: ex.suggested_load,
            prescribed_load_unit: ex.load_unit,
            actual_reps: saved?.actual_reps?.toString() ?? '',
            actual_load: saved?.actual_load?.toString() ?? '',
            completed: saved?.completed ?? false,
            logId: saved?.id,
          })
        }
        next[key] = rows
      }
      return next
    })
  }, [logQuery.data, prescription])

  const restEndsAt = logQuery.data?.log.rest_ends_at
    ? new Date(logQuery.data.log.rest_ends_at).getTime()
    : null
  const restRemaining = restEndsAt ? restEndsAt - now : 0
  const isResting = restRemaining > 0

  const saveSet = useMutation({
    mutationFn: async (input: {
      exercise: SnapshotExercise
      draft: SetDraft
      markComplete: boolean
    }) => {
      if (!isOnline()) throw new Error(OFFLINE_SAVE_MESSAGE)
      const sb = requireSupabase()
      const log = logQuery.data?.log
      if (!log || !activeStudent) throw new Error('Treino não encontrado')

      const actualReps = input.draft.actual_reps.trim()
        ? Number.parseInt(input.draft.actual_reps, 10)
        : null
      const actualLoad = input.draft.actual_load.trim()
        ? Number.parseFloat(input.draft.actual_load.replace(',', '.'))
        : null

      const payload = {
        organization_id: log.organization_id,
        training_log_id: log.id,
        workout_exercise_id: input.exercise.workout_exercise_id,
        exercise_name: input.exercise.exercise_name,
        set_number: input.draft.setNumber,
        client_request_id: createClientRequestId(),
        prescribed_reps: input.draft.prescribed_reps,
        prescribed_load: input.draft.prescribed_load,
        prescribed_load_unit: input.draft.prescribed_load_unit,
        actual_reps: Number.isFinite(actualReps!) ? actualReps : null,
        actual_load: Number.isFinite(actualLoad!) ? actualLoad : null,
        load_unit: input.exercise.load_unit ?? 'kg',
        completed: input.markComplete,
        completed_at: input.markComplete ? new Date().toISOString() : null,
      }

      if (input.draft.logId) {
        const { error } = await sb.from('training_set_logs').update(payload).eq('id', input.draft.logId)
        if (error) throw error
        return input.draft.logId
      }

      const { data, error } = await sb.from('training_set_logs').insert(payload).select('id').single()
      if (error) throw error

      const restSec = input.exercise.rest_seconds
      if (input.markComplete && restSec && restSec > 0) {
        const restEnds = new Date(Date.now() + restSec * 1000).toISOString()
        await sb.from('training_logs').update({ rest_ends_at: restEnds }).eq('id', log.id)
      } else if (input.markComplete) {
        await sb.from('training_logs').update({ rest_ends_at: null }).eq('id', log.id)
      }

      return data.id
    },
    onSuccess: () => {
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['student', 'training-log', logId] })
    },
    onError: (e) => setSaveError(e instanceof Error ? e.message : OFFLINE_SAVE_MESSAGE),
  })

  const finishWorkout = useMutation({
    mutationFn: async (status: TrainingLogStatus) => {
      if (!isOnline()) throw new Error(OFFLINE_SAVE_MESSAGE)
      const sb = requireSupabase()
      const log = logQuery.data?.log
      if (!log) throw new Error('Treino não encontrado')
      const { error } = await sb
        .from('training_logs')
        .update({
          status,
          ended_at: new Date().toISOString(),
          rest_ends_at: null,
        })
        .eq('id', log.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'home'] })
      navigate('/aluno/inicio')
    },
    onError: (e) => setSaveError(e instanceof Error ? e.message : OFFLINE_SAVE_MESSAGE),
  })

  if (!logId) {
    return <EmptyState title="Treino inválido" description="Identificador ausente." />
  }

  if (logQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (logQuery.isError || !logQuery.data) {
    return (
      <EmptyState
        title="Treino não encontrado"
        description="Este registro não existe ou já foi encerrado."
        actionLabel="Voltar ao início"
        onAction={() => navigate('/aluno/inicio')}
      />
    )
  }

  const { log } = logQuery.data
  if (log.status !== 'in_progress') {
    return (
      <EmptyState
        title="Treino encerrado"
        description="Este treino já foi finalizado."
        actionLabel="Início"
        onAction={() => navigate('/aluno/inicio')}
      />
    )
  }

  const currentEx = prescription[activeExerciseIdx]
  const totalEx = prescription.length
  const completedSets = Object.values(setDrafts)
    .flat()
    .filter((s) => s.completed).length
  const totalSets = Object.values(setDrafts).flat().length
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/aluno/inicio">← Início</Link>
        </Button>
        <Badge variant="secondary">Em andamento</Badge>
      </div>

      <div>
        <h1 className="font-display text-xl font-semibold">Treino ativo</h1>
        <Progress value={progressPct} className="mt-2 h-2" />
        <p className="mt-1 text-xs text-muted-foreground">
          {completedSets} de {totalSets} séries registradas
        </p>
      </div>

      {isResting && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Descanso</p>
            <p className="font-display text-3xl font-semibold tabular-nums">{formatRestMs(restRemaining)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={async () => {
                if (!isOnline()) {
                  setSaveError(OFFLINE_SAVE_MESSAGE)
                  return
                }
                const sb = requireSupabase()
                await sb.from('training_logs').update({ rest_ends_at: null }).eq('id', log.id)
                queryClient.invalidateQueries({ queryKey: ['student', 'training-log', logId] })
              }}
            >
              Pular descanso
            </Button>
          </CardContent>
        </Card>
      )}

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}

      {!currentEx ? (
        <EmptyState title="Prescrição vazia" description="Não há exercícios neste treino." />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {prescription.map((ex, idx) => (
              <button
                key={ex.workout_exercise_id}
                type="button"
                onClick={() => setActiveExerciseIdx(idx)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium',
                  idx === activeExerciseIdx ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                {idx + 1}. {ex.exercise_name}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Exercício {activeExerciseIdx + 1}/{totalEx}: {currentEx.exercise_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Prescrito: {currentEx.sets ?? '—'}×{currentEx.reps ?? '—'}
                {currentEx.suggested_load != null
                  ? ` · ${currentEx.suggested_load}${currentEx.load_unit ?? 'kg'}`
                  : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExercisePhoto path={currentEx.image_path} name={currentEx.exercise_name} />
              {(setDrafts[currentEx.workout_exercise_id] ?? []).map((draft) => (
                <div key={draft.setNumber} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Série {draft.setNumber}</span>
                    {draft.completed && <Badge>Preenchida</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alvo: {draft.prescribed_reps ?? '—'} reps
                    {draft.prescribed_load != null
                      ? ` · ${draft.prescribed_load}${draft.prescribed_load_unit ?? 'kg'}`
                      : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`reps-${draft.setNumber}`}>Reps (real)</Label>
                      <Input
                        id={`reps-${draft.setNumber}`}
                        inputMode="numeric"
                        value={draft.actual_reps}
                        onChange={(e) => {
                          const val = e.target.value
                          setSetDrafts((prev) => ({
                            ...prev,
                            [currentEx.workout_exercise_id]: prev[currentEx.workout_exercise_id]!.map((r) =>
                              r.setNumber === draft.setNumber ? { ...r, actual_reps: val } : r,
                            ),
                          }))
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`load-${draft.setNumber}`}>Carga (real)</Label>
                      <Input
                        id={`load-${draft.setNumber}`}
                        inputMode="decimal"
                        value={draft.actual_load}
                        onChange={(e) => {
                          const val = e.target.value
                          setSetDrafts((prev) => ({
                            ...prev,
                            [currentEx.workout_exercise_id]: prev[currentEx.workout_exercise_id]!.map((r) =>
                              r.setNumber === draft.setNumber ? { ...r, actual_load: val } : r,
                            ),
                          }))
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={saveSet.isPending || isResting}
                    onClick={() =>
                      saveSet.mutate(
                        { exercise: currentEx, draft, markComplete: true },
                        {
                          onSuccess: (id) => {
                            setSetDrafts((prev) => ({
                              ...prev,
                              [currentEx.workout_exercise_id]: prev[currentEx.workout_exercise_id]!.map((r) =>
                                r.setNumber === draft.setNumber ? { ...r, completed: true, logId: id } : r,
                              ),
                            }))
                          },
                        },
                      )
                    }
                  >
                    {saveSet.isPending ? 'Salvando…' : 'Registrar série'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={activeExerciseIdx <= 0}
              onClick={() => setActiveExerciseIdx((i) => Math.max(0, i - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={activeExerciseIdx >= totalEx - 1}
              onClick={() => setActiveExerciseIdx((i) => Math.min(totalEx - 1, i + 1))}
            >
              Próximo
            </Button>
          </div>
        </>
      )}

      <div className="grid gap-2 pt-2">
        <Button
          onClick={() => finishWorkout.mutate('completed')}
          disabled={finishWorkout.isPending}
        >
          {finishWorkout.isPending ? 'Finalizando…' : 'Concluir treino'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => finishWorkout.mutate('partial')}
          disabled={finishWorkout.isPending}
        >
          Encerrar parcialmente
        </Button>
      </div>
    </div>
  )
}
