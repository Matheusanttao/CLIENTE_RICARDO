import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { isOnline, OFFLINE_SAVE_MESSAGE } from '@/lib/offline'
import { requireSupabase } from '@/lib/supabase/client'
import { cn, createClientRequestId } from '@/lib/utils'
import type { Json, Tables, TrainingLogStatus } from '@/types/database'
import { Check, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
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


  const logQuery = useQuery({
    queryKey: ['student', 'training-log', logId],
    enabled: Boolean(logId && activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('training_logs')
        .select('*, training_set_logs(*)')
        .eq('id', logId!)
        .eq('student_id', activeStudent!.id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const { training_set_logs: sets, ...log } = data as typeof data & {
        training_set_logs: Tables<'training_set_logs'>[] | null
      }
      return { log, sets: [...(sets ?? [])].sort((a, b) => a.set_number - b.set_number) }
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

  // O relógio só roda durante o descanso (antes redesenhava a tela toda a cada 0,5s)
  useEffect(() => {
    if (!restEndsAt || restEndsAt <= Date.now()) return
    setNow(Date.now())
    const t = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= restEndsAt) window.clearInterval(t)
    }, 250)
    return () => window.clearInterval(t)
  }, [restEndsAt])
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
        <Link to="/aluno/inicio" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Início
        </Link>
        <Badge variant="success">Em andamento</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-end justify-between">
          <h1 className="font-display text-xl font-semibold">Treino em andamento</h1>
          <span className="font-display text-sm font-semibold text-primary">{Math.round(progressPct)}%</span>
        </div>
        <Progress value={progressPct} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {completedSets} de {totalSets} séries feitas
        </p>
      </div>

      {isResting && (
        <Card className="sticky top-2 z-30 border-primary/50 bg-card/95 shadow-lg backdrop-blur">
          <CardContent className="py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Timer className="h-4 w-4 text-primary" aria-hidden />
              Descanso
            </p>
            <p className="font-display text-4xl font-semibold tabular-nums text-primary">{formatRestMs(restRemaining)}</p>
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
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {prescription.map((ex, idx) => {
              const drafts = setDrafts[ex.workout_exercise_id] ?? []
              const done = drafts.length > 0 && drafts.every((d) => d.completed)
              return (
                <button
                  key={ex.workout_exercise_id}
                  type="button"
                  onClick={() => setActiveExerciseIdx(idx)}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold',
                    idx === activeExerciseIdx
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span>{idx + 1}</span>}
                  {ex.exercise_name}
                </button>
              )
            })}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Exercício {activeExerciseIdx + 1} de {totalEx}
              </p>
              <CardTitle className="text-lg">{currentEx.exercise_name}</CardTitle>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary">
                  {currentEx.sets ?? '—'} × {currentEx.reps ?? '—'}
                </Badge>
                {currentEx.suggested_load != null && (
                  <Badge variant="secondary">
                    {currentEx.suggested_load} {currentEx.load_unit ?? 'kg'}
                  </Badge>
                )}
                {currentEx.rest_seconds ? <Badge variant="secondary">Descanso {currentEx.rest_seconds}s</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExercisePhoto path={currentEx.image_path} name={currentEx.exercise_name} />
              <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Série</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Carga (kg)</span>
                <span className="sr-only">Feito</span>
              </div>
              <div className="space-y-2">
                {(setDrafts[currentEx.workout_exercise_id] ?? []).map((draft) => {
                  const update = (field: 'actual_reps' | 'actual_load', val: string) =>
                    setSetDrafts((prev) => ({
                      ...prev,
                      [currentEx.workout_exercise_id]: prev[currentEx.workout_exercise_id]!.map((r) =>
                        r.setNumber === draft.setNumber ? { ...r, [field]: val } : r,
                      ),
                    }))
                  return (
                    <div
                      key={draft.setNumber}
                      className={cn(
                        'grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-xl border p-1.5 pl-2 transition-colors',
                        draft.completed ? 'border-primary/40 bg-primary/10' : 'border-border',
                      )}
                    >
                      <span className="font-display text-sm font-semibold">{draft.setNumber}</span>
                      <Input
                        aria-label={`Repetições da série ${draft.setNumber}`}
                        inputMode="numeric"
                        className="h-10 text-center placeholder:text-muted-foreground/40"
                        placeholder={draft.prescribed_reps ?? '—'}
                        value={draft.actual_reps}
                        onChange={(e) => update('actual_reps', e.target.value)}
                      />
                      <Input
                        aria-label={`Carga da série ${draft.setNumber}`}
                        inputMode="decimal"
                        className="h-10 text-center placeholder:text-muted-foreground/40"
                        placeholder={draft.prescribed_load != null ? String(draft.prescribed_load) : '—'}
                        value={draft.actual_load}
                        onChange={(e) => update('actual_load', e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={draft.completed ? `Série ${draft.setNumber} feita` : `Marcar série ${draft.setNumber} como feita`}
                        disabled={saveSet.isPending || isResting || draft.completed}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-100',
                          draft.completed
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50',
                        )}
                        onClick={() =>
                          saveSet.mutate(
                            {
                              exercise: currentEx,
                              draft: {
                                ...draft,
                                actual_reps: draft.actual_reps || (draft.prescribed_reps ?? ''),
                                actual_load:
                                  draft.actual_load || (draft.prescribed_load != null ? String(draft.prescribed_load) : ''),
                              },
                              markComplete: true,
                            },
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
                        <Check className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Deixe em branco para usar o que o personal passou. Toque em ✓ ao terminar a série.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={activeExerciseIdx <= 0}
              onClick={() => setActiveExerciseIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anterior
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={activeExerciseIdx >= totalEx - 1}
              onClick={() => setActiveExerciseIdx((i) => Math.min(totalEx - 1, i + 1))}
            >
              Próximo
              <ChevronRight className="h-4 w-4" aria-hidden />
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
          variant="ghost"
          onClick={() => finishWorkout.mutate('partial')}
          disabled={finishWorkout.isPending}
        >
          Encerrar sem terminar tudo
        </Button>
      </div>
    </div>
  )
}
