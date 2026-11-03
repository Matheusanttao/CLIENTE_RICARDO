import { Navigate, useLocation } from 'react-router-dom'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export function RequireAuth({
  children,
  area,
}: {
  children: React.ReactNode
  area: 'aluno' | 'personal'
}) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.configured) return <ConfigMissing />
  if (auth.loading) return <LoadingScreen label="Verificando sessão…" />

  if (!auth.session) {
    return (
      <Navigate
        to={area === 'personal' ? '/personal/entrar' : '/aluno/entrar'}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (area === 'personal' && !auth.isStaff) {
    return (
      <div className="mx-auto max-w-md p-4 pt-10">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Esta área é exclusiva para personal/administrador autorizado na organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {auth.isStudent && (
              <Button asChild>
                <Link to="/aluno/inicio">Ir para área do aluno</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (area === 'aluno') {
    const pending = auth.studentLinks.some((s) => s.status === 'pending')
    if (!auth.isStudent) {
      return (
        <div className="mx-auto max-w-md p-4 pt-10">
          <Card>
            <CardHeader>
              <CardTitle>{pending ? 'Acesso pendente' : 'Vínculo necessário'}</CardTitle>
              <CardDescription>
                {pending
                  ? 'Seu cadastro ainda aguarda liberação do personal.'
                  : 'Seu acesso é criado pelo seu personal. Fale com ele para receber usuário e senha.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {auth.isStaff && (
                <Button asChild>
                  <Link to="/personal/dashboard">Ir para área do personal</Link>
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  return <>{children}</>
}
