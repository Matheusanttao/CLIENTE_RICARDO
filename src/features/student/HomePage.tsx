import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarCheck, ChevronRight, ClipboardList, Dumbbell, FileHeart, Flame, Play, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { TRAINING_LOG_STATUS_LABEL } from '@/features/shared/statusLabels'
import { requireSupabase } from '@/lib/supabase/client'
import { firstName } from '@/lib/utils'

function pickTodaySessionIndex(sessionCount: number): number {
  if (sessionCount <= 0) return 0
  const day = new Date().getDay()
  const monBased = day === 0 ? 6 : day - 1
  return monBased % sessionCount
}

export function HomePage() {
  const { activeStudent, profile } = useAuth()
  const studentId = activeStudent?.id
  const orgId = activeStudent?.organization_id

  const dashboard = useQuery({
    queryKey: ['student', 'home', studentId],
    enabled: Boolean(studentId && orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

      // Tudo em paralelo (uma única rodada até o servidor)
      const [programsRes, lastLogRes, inProgressRes, weekRes] = await Promise.all([
        sb
          .from('workout_programs')
          .select('id, title, valid_until, frequency_per_week, workout_sessions(id, label, sort_order, workout_exercises(count))')
          .eq('student_id', studentId!)
          .eq('status', 'published')
          .or(`valid_until.is.null,valid_until.gte.${today}`)
          .order('published_at', { ascending: false })
          .limit(1),
        sb
          .from('training_logs')
          .select('id, status, started_at, ended_at')
          .eq('student_id', studentId!)
          .in('status', ['completed', 'partial'])
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from('training_logs')
          .select('id')
          .eq('student_id', studentId!)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from('training_logs')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId!)
          .in('status', ['completed', 'partial'])
          .gte('started_at', weekStart),
      ])
      if (programsRes.error) throw programsRes.error
      if (lastLogRes.error) throw lastLogRes.error
      if (inProgressRes.error) throw inProgressRes.error

      type SessionRow = { id: string; label: string; sort_order: number; workout_exercises: { count: number }[] | null }
      const raw = programsRes.data?.[0] as
        | { id: string; title: string; valid_until: string | null; frequency_per_week: number | null; workout_sessions: SessionRow[] | null }
        | undefined
      const program = raw
        ? { id: raw.id, title: raw.title, valid_until: raw.valid_until, frequency_per_week: raw.frequency_per_week }
        : null
      const sessions = [...(raw?.workout_sessions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const picked = sessions.length > 0 ? (sessions[pickTodaySessionIndex(sessions.length)] ?? sessions[0]!) : null
      const session = picked ? { id: picked.id, label: picked.label } : null
      const exerciseCount = picked?.workout_exercises?.[0]?.count ?? 0

      return {
        program,
        session,
        exerciseCount,
        lastLog: lastLogRes.data,
        inProgressLogId: inProgressRes.data?.id ?? null,
        weekCount: weekRes.count ?? 0,
      }
    },
  })

  const greetingName = firstName(profile?.full_name ?? activeStudent?.full_name)

  if (!activeStudent) {
    return (
      <EmptyState
        title="Sem vínculo ativo"
        description="Seu cadastro ainda não está ativo nesta organização."
      />
    )
  }

  if (dashboard.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (dashboard.isError) {
    return (
      <EmptyState
        title="Não foi possível carregar"
        description={dashboard.error instanceof Error ? dashboard.error.message : 'Erro desconhecido'}
        actionLabel="Tentar novamente"
        onAction={() => dashboard.refetch()}
      />
    )
  }

  const { program, session, exerciseCount, lastLog, inProgressLogId, weekCount } = dashboard.data!
  const weekGoal = program?.frequency_per_week ?? null

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm text-muted-foreground">{capitalizeFirst(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))}</p>
        <h1 className="font-display text-2xl font-semibold">Olá, {greetingName}</h1>
      </header>

      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-card to-card p-5">
        <Dumbbell className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rotate-12 text-primary/10" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Treino de hoje</p>
        {program && session ? (
          <>
            <h2 className="mt-1 font-display text-3xl font-bold">Treino {session.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {program.title} · {exerciseCount} exercício{exerciseCount === 1 ? '' : 's'}
            </p>
            <Button asChild size="lg" className="mt-5 w-full rounded-xl">
              {inProgressLogId ? (
                <Link to={`/aluno/treino-em-andamento/${inProgressLogId}`}>
                  <Play className="h-4 w-4" aria-hidden />
                  Continuar treino
                </Link>
              ) : (
                <Link to={`/aluno/treinos/${program.id}?sessao=${session.id}`}>
                  <Play className="h-4 w-4" aria-hidden />
                  Começar treino
                </Link>
              )}
            </Button>
          </>
        ) : (
          <>
            <h2 className="mt-1 font-display text-xl font-semibold">Seu treino está a caminho</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando o Ricardo publicar seu programa, ele aparece aqui.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Flame className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-2 font-display text-2xl font-semibold leading-none">
            {weekCount}
            {weekGoal ? <span className="text-base text-muted-foreground">/{weekGoal}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">treinos nesta semana</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <CalendarCheck className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-2 font-display text-base font-semibold leading-tight">
            {lastLog ? formatDistanceToNow(new Date(lastLog.started_at), { locale: ptBR, addSuffix: true }) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastLog ? `último treino · ${TRAINING_LOG_STATUS_LABEL[lastLog.status].toLowerCase()}` : 'nenhum treino ainda'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <QuickLink to="/aluno/treinos" icon={<Dumbbell className="h-5 w-5" />} label="Treinos" />
        <QuickLink to="/aluno/avaliacoes" icon={<ClipboardList className="h-5 w-5" />} label="Avaliações" />
        <QuickLink to="/aluno/anamnese" icon={<FileHeart className="h-5 w-5" />} label="Anamnese" />
      </div>

      <Link
        to="/aluno/pagamentos"
        className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
      >
        <span className="flex items-center gap-3 text-sm font-medium">
          <Wallet className="h-5 w-5 text-primary" aria-hidden />
          Mensalidades
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Link>
    </div>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-xs font-medium transition-colors hover:border-primary/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</span>
      {label}
    </Link>
  )
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
