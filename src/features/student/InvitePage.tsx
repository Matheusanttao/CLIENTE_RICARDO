import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { useAuth } from '@/features/auth/AuthProvider'
import { isSupabaseConfigured } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase/client'
import { useState } from 'react'

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const schema = z.object({
    full_name: z.string().min(2, 'Informe seu nome'),
    password: auth.user
      ? z.string().optional()
      : z.string().min(8, 'Mínimo de 8 caracteres'),
  })
  type FormValues = z.infer<typeof schema>
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const invite = useQuery({
    queryKey: ['invite', token],
    enabled: Boolean(token) && isSupabaseConfigured,
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error: qErr } = await sb
        .from('student_invitations')
        .select('id, email, status, expires_at, organization_id, organizations(name)')
        .eq('token', token)
        .maybeSingle()
      if (qErr) throw qErr
      return data
    },
  })

  const accept = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!invite.data) throw new Error('Convite inválido')
      if (invite.data.status !== 'pending') throw new Error('Este convite não está mais disponível.')
      if (new Date(invite.data.expires_at) < new Date()) throw new Error('Convite expirado.')

      const sb = requireSupabase()

      if (!auth.user) {
        if (!values.password) throw new Error('Informe uma senha.')
        const password = values.password
        const { error: signErr } = await sb.auth.signUp({
          email: invite.data.email,
          password,
          options: { data: { full_name: values.full_name } },
        })
        if (signErr) throw signErr
        const { error: signInErr } = await sb.auth.signInWithPassword({
          email: invite.data.email,
          password,
        })
        if (signInErr) throw signInErr
      }

      const { error: rpcErr } = await sb.rpc('accept_student_invitation', {
        p_token: token,
        p_full_name: values.full_name,
      })
      if (rpcErr) throw rpcErr
      await auth.refreshProfile()
    },
    onSuccess: () => navigate('/aluno/inicio'),
    onError: (e: Error) => setError(e.message),
  })

  if (!isSupabaseConfigured) return <ConfigMissing />
  if (!token) {
    return (
      <Shell title="Convite necessário" description="Abra o link completo enviado pelo personal.">
        <Button asChild className="w-full">
          <Link to="/aluno/solicitar-acesso">Solicitar acesso</Link>
        </Button>
      </Shell>
    )
  }
  if (invite.isLoading) return <LoadingScreen label="Validando convite…" />
  if (!invite.data) {
    return (
      <Shell title="Convite inválido" description="Este link não corresponde a um convite válido.">
        <Button asChild variant="outline" className="w-full">
          <Link to="/aluno/entrar">Ir para login</Link>
        </Button>
      </Shell>
    )
  }
  if (invite.data.status !== 'pending' || new Date(invite.data.expires_at) < new Date()) {
    return (
      <Shell title="Convite indisponível" description="O convite expirou ou já foi utilizado.">
        <Button asChild variant="outline" className="w-full">
          <Link to="/aluno/solicitar-acesso">Solicitar acesso</Link>
        </Button>
      </Shell>
    )
  }

  const orgName =
    (invite.data.organizations as { name?: string } | null)?.name || 'Ricardo Neves Personal'

  return (
    <Shell
      title="Aceitar convite"
      description={`Você foi convidado para ${orgName} (${invite.data.email}).`}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) => accept.mutate(v))}
      >
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input {...form.register('full_name')} />
        </div>
        {!auth.session && (
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </div>
        )}
        {auth.session && (
          <input type="hidden" {...form.register('password')} value="already-authenticated" />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={accept.isPending}>
          {accept.isPending ? 'Confirmando…' : 'Criar acesso de aluno'}
        </Button>
      </form>
    </Shell>
  )
}

function Shell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <BrandMark className="justify-center" />
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
