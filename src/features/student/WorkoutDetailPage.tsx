import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { isOnline, OFFLINE_SAVE_MESSAGE } from '@/lib/offline'
import { requireSupabase } from '@/lib/supabase/client'
import { createClientRequestId } from '@/lib/utils'
import type { Json } from '@/types/database'

type SnapshotExercise = {
  workout_exercise_id: string
  exercise_name: string
  sets: number | null
  reps: string | null
  suggested_load: number | null
  load_unit: string | null
  rest_seconds: number | null
  notes: string | null
}

export function WorkoutDetailPage() {
  const { id: programId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const preselectedSession = searchParams.get('sessao')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeStudent } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: ['student', 'program', programId, activeStudent?.id],
    enabled: Boolean(programId && activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data: program, error: pErr } = await sb
        .from('workout_programs')
        .select('id, title, objective, organization_id, student_id, status')
        .eq('id', programId!)
        .eq('student_id', activeStudent!.id)
        .eq('status', 'published')
        .maybeSingle()
      if (pErr) throw pErr
      if (!program) return null

      const { data: sessions, error: sErr } = await sb
        .from('workout_sessions')
        .select('id, label, sort_order, estimated_minutes, notes')
        .eq('program_id', program.id)
        .order('sort_order')
      if (sErr) throw sErr

      const sessionIds = (sessions ?? []).map((s) => s.id)
      let exercisesBySession: Record<string, Array<{
        id: string
        exercise_name: string
        sets: number | null
        reps: string | null
        suggested_load: number | null
        load_unit: string | null
        rest_seconds: number | null
        sort_order: number
      }>> = {}

      if (sessionIds.length > 0) {
        const { data: exercises, error: eErr } = await sb
          .from('workout_exercises')
          .select(
            'id, session_id, exercise_name, sets, reps, suggested_load, load_unit, rest_seconds, sort_order, notes',
          )
          .in('session_id', sessionIds)
          .order('sort_order')
        if (eErr) throw eErr
        for (const ex of exercises ?? []) {
          const sid = ex.session_id as string
          if (!exercisesBySession[sid]) exercisesBySession[sid] = []
          exercisesBySession[sid]!.push(ex)
        }
      }

      return { program, sessions: sessions ?? [], exercisesBySession }
    },
  })

  const startWorkout = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!isOnline()) throw new Error(OFFLINE_SAVE_MESSAGE)
      const sb = requireSupabase()
      const data = detail.data
      if (!data || !activeStudent) throw new Error('Programa não carregado')

      const exercises = data.exercisesBySession[sessionId] ?? []
      const snapshot: SnapshotExercise[] = exercises.map((ex) => ({
        workout_exercise_id: ex.id,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        suggested_load: ex.suggested_load,
        load_unit: ex.load_unit,
        rest_seconds: ex.rest_seconds,
        notes: null,
      }))

      const clientRequestId = createClientRequestId()
      const { data: log, error } = await sb
        .from('training_logs')
        .insert({
          organization_id: data.program.organization_id,
          student_id: activeStudent.id,
          program_id: data.program.id,
          session_id: sessionId,
          client_request_id: clientRequestId,
          status: 'in_progress',
          prescription_snapshot: snapshot as unknown as Json,
        })
        .select('id')
        .single()
      if (error) throw error
      return log.id
    },
    onSuccess: (logId) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'home'] })
      navigate(`/aluno/treino-em-andamento/${logId}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Falha ao iniciar treino'),
  })

  if (!programId) {
    return <EmptyState title="Treino não encontrado" description="Link inválido." />
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title={detail.data === null ? 'Treino indisponível' : 'Erro ao carregar'}
        description={
          detail.data === null
            ? 'Este programa não existe ou não está publicado para você.'
            : detail.error instanceof Error
              ? detail.error.message
              : 'Tente novamente.'
        }
        actionLabel="Voltar"
        onAction={() => navigate('/aluno/treinos')}
      />
    )
  }

  const { program, sessions, exercisesBySession } = detail.data

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/aluno/treinos">← Treinos</Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold">{program.title}</h1>
        {program.objective && <p className="text-sm text-muted-foreground">{program.objective}</p>}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {sessions.length === 0 ? (
        <EmptyState title="Sem sessões" description="Este programa ainda não tem sessões configuradas." />
      ) : (
        sessions.map((session) => {
          const exercises = exercisesBySession[session.id] ?? []
          const isPreselected = preselectedSession === session.id
          return (
            <Card key={session.id} className={isPreselected ? 'ring-2 ring-primary' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Treino {session.label}</span>
                  {session.estimated_minutes != null && (
                    <Badge variant="outline">~{session.estimated_minutes} min</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {exercises.length === 0 ? (
                    <li className="text-muted-foreground">Nenhum exercício nesta sessão.</li>
                  ) : (
                    exercises.map((ex) => (
                      <li key={ex.id} className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                        <span>{ex.exercise_name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {ex.sets ?? '—'}×{ex.reps ?? '—'}
                          {ex.suggested_load != null ? ` · ${ex.suggested_load}${ex.load_unit ?? 'kg'}` : ''}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <Button
                  className="w-full"
                  disabled={startWorkout.isPending || exercises.length === 0}
                  onClick={() => startWorkout.mutate(session.id)}
                >
                  {startWorkout.isPending ? 'Iniciando…' : 'Iniciar esta sessão'}
                </Button>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
