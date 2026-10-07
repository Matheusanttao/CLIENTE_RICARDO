import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { requireSupabase } from '@/lib/supabase/client'

export function WorkoutsPage() {
  const { activeStudent } = useAuth()
  const studentId = activeStudent?.id

  const programs = useQuery({
    queryKey: ['student', 'programs', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('workout_programs')
        .select('id, title, objective, frequency_per_week, valid_from, valid_until, published_at')
        .eq('student_id', studentId!)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  if (!activeStudent) {
    return <EmptyState title="Sem vínculo" description="Cadastro de aluno não encontrado." />
  }

  if (programs.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (programs.isError) {
    return (
      <EmptyState
        title="Erro ao carregar treinos"
        description={programs.error instanceof Error ? programs.error.message : 'Tente novamente.'}
        actionLabel="Recarregar"
        onAction={() => programs.refetch()}
      />
    )
  }

  const list = programs.data ?? []

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Meus treinos</h1>
      {list.length === 0 ? (
        <EmptyState
          title="Nenhum treino publicado"
          description="Seu personal ainda não publicou um programa para você."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/aluno/treinos/${p.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                    {p.objective && <CardDescription>{p.objective}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.frequency_per_week != null && (
                      <Badge variant="outline">{p.frequency_per_week}x/semana</Badge>
                    )}
                    {p.valid_until && (
                      <span>Válido até {format(new Date(p.valid_until), 'd/MM/yyyy', { locale: ptBR })}</span>
                    )}
                    {p.published_at && (
                      <span>
                        Publicado em {format(new Date(p.published_at), 'd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
