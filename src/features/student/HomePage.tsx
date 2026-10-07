import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardList, Dumbbell, FileHeart, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

      const { data: programs, error: progErr } = await sb
        .from('workout_programs')
        .select('id, title, valid_until, frequency_per_week')
        .eq('student_id', studentId!)
        .eq('status', 'published')
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('published_at', { ascending: false })
        .limit(1)

      if (progErr) throw progErr
      const program = programs?.[0] ?? null

      let session: { id: string; label: string } | null = null
      let exerciseCount = 0

      if (program) {
        const { data: sessions, error: sessErr } = await sb
          .from('workout_sessions')
          .select('id, label, sort_order')
          .eq('program_id', program.id)
          .order('sort_order')
        if (sessErr) throw sessErr
        const list = sessions ?? []
        if (list.length > 0) {
          const idx = pickTodaySessionIndex(list.length)
          session = list[idx] ?? list[0]!
          const { count, error: exErr } = await sb
            .from('workout_exercises')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
          if (exErr) throw exErr
          exerciseCount = count ?? 0
        }
      }

      const { data: lastLog, error: logErr } = await sb
        .from('training_logs')
        .select('id, status, started_at, ended_at')
        .eq('student_id', studentId!)
        .in('status', ['completed', 'partial'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (logErr) throw logErr

      const { data: inProgress, error: ipErr } = await sb
        .from('training_logs')
        .select('id')
        .eq('student_id', studentId!)
        .eq('status', 'in_progress')
        .maybeSingle()
      if (ipErr) throw ipErr

      return { program, session, exerciseCount, lastLog, inProgressLogId: inProgress?.id ?? null }
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

  const { program, session, exerciseCount, lastLog, inProgressLogId } = dashboard.data!

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="font-display text-2xl font-semibold">Olá, {greetingName}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
            Treino de hoje
          </CardTitle>
          <CardDescription>
            {program ? program.title : 'Nenhum programa publicado no momento.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {program && session ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Sessão {session.label}</Badge>
                <span className="text-sm text-muted-foreground">
                  {exerciseCount} exercício{exerciseCount === 1 ? '' : 's'}
                </span>
              </div>
              {inProgressLogId ? (
                <Button asChild className="w-full">
                  <Link to={`/aluno/treino-em-andamento/${inProgressLogId}`}>Retomar treino</Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link to={`/aluno/treinos/${program.id}?sessao=${session.id}`}>Iniciar treino</Link>
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quando seu personal publicar um programa, ele aparecerá aqui.
            </p>
          )}
          <Button variant="outline" asChild className="w-full">
            <Link to="/aluno/treinos">Ver todos os treinos</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <QuickLink to="/aluno/anamnese" icon={<FileHeart className="h-4 w-4" />} label="Anamnese" />
        <QuickLink to="/aluno/avaliacoes" icon={<ClipboardList className="h-4 w-4" />} label="Avaliações" />
        <QuickLink to="/aluno/pagamentos" icon={<Wallet className="h-4 w-4" />} label="Pagamentos" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Último treino registrado</CardTitle>
        </CardHeader>
        <CardContent>
          {lastLog ? (
            <p className="text-sm">
              {format(new Date(lastLog.started_at), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {' · '}
              <span className="text-muted-foreground">{TRAINING_LOG_STATUS_LABEL[lastLog.status]}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não registrou treinos concluídos.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50"
    >
      {icon}
      {label}
    </Link>
  )
}
