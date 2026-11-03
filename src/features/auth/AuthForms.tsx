import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAppUrl, isSupabaseConfigured } from '@/lib/env'
import { sanitizeReturnTo } from '@/lib/auth/redirect'
import { requireSupabase } from '@/lib/supabase/client'
import { BRAND } from '@/lib/constants'
import { loginIdentifierToEmail } from '@/lib/auth/username'

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Informe seu usuário'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage({ area }: { area: 'aluno' | 'personal' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (!isSupabaseConfigured) return <ConfigMissing />

  if (!auth.loading && auth.session) {
    if (area === 'personal' && auth.isStaff) {
      navigate('/personal/dashboard', { replace: true })
    } else if (area === 'aluno' && auth.isStudent) {
      navigate('/aluno/inicio', { replace: true })
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const sb = requireSupabase()
      const { error: signError } = await sb.auth.signInWithPassword({
        email: loginIdentifierToEmail(values.identifier),
        password: values.password,
      })
      if (signError) {
        setError(signError.message === 'Invalid login credentials' ? 'Usuário ou senha incorretos.' : signError.message)
        return
      }
      await auth.refreshProfile()
      const fallback = area === 'personal' ? '/personal/dashboard' : '/aluno/inicio'
      const fromState = (location.state as { from?: string } | null)?.from
      const to = sanitizeReturnTo(params.get('redirect') || fromState, fallback)
      navigate(to, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao entrar')
    }
  })

  return (
    <AuthShell
      title={area === 'personal' ? 'Área do personal' : 'Área do aluno'}
      description={area === 'personal' ? 'Entre com seu e-mail ou usuário e senha.' : 'Entre com o usuário e a senha que seu personal enviou.'}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label={area === 'personal' ? 'E-mail ou usuário' : 'Usuário'} error={form.formState.errors.identifier?.message}>
          <Input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...form.register('identifier')}
          />
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        {area === 'aluno' ? (
          <p>Ainda não tem acesso ou esqueceu a senha? Fale com o seu personal.</p>
        ) : (
          <p>Esqueceu a senha? Redefina pelo painel do Supabase (Authentication → Users).</p>
        )}
      </div>
    </AuthShell>
  )
}

export function ForgotPasswordPage({ area }: { area: 'aluno' | 'personal' }) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().email() })),
  })

  if (!isSupabaseConfigured) return <ConfigMissing />

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null)
    setMessage(null)
    try {
      const sb = requireSupabase()
      const redirectTo = `${getAppUrl()}/${area}/redefinir-senha`
      const { error: resetError } = await sb.auth.resetPasswordForEmail(email, { redirectTo })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setMessage('Se o e-mail existir, enviamos instruções para redefinir a senha.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar')
    }
  })

  return (
    <AuthShell title="Recuperar senha" description="Informe o e-mail da sua conta.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="E-mail">
          <Input type="email" {...form.register('email')} />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-foreground">{message}</p>}
        <Button className="w-full" type="submit">
          Enviar link
        </Button>
      </form>
      <Link className="mt-4 inline-block text-sm underline" to={`/${area}/entrar`}>
        Voltar ao login
      </Link>
    </AuthShell>
  )
}

export function ResetPasswordPage({ area }: { area: 'aluno' | 'personal' }) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(
      z
        .object({
          password: z.string().min(8, 'Mínimo de 8 caracteres'),
          confirm: z.string(),
        })
        .refine((v) => v.password === v.confirm, { message: 'Senhas diferentes', path: ['confirm'] }),
    ),
  })

  if (!isSupabaseConfigured) return <ConfigMissing />

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null)
    try {
      const sb = requireSupabase()
      const { error: updateError } = await sb.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      navigate(area === 'personal' ? '/personal/dashboard' : '/aluno/inicio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar senha')
    }
  })

  return (
    <AuthShell title="Definir nova senha" description="Escolha uma senha segura.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Nova senha" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Confirmar senha" error={form.formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit">
          Salvar senha
        </Button>
      </form>
    </AuthShell>
  )
}

export function AuthCallbackPage({ area }: { area: 'aluno' | 'personal' }) {
  const navigate = useNavigate()
  const auth = useAuth()

  if (!auth.loading) {
    const to =
      area === 'personal'
        ? auth.isStaff
          ? '/personal/dashboard'
          : '/personal/entrar'
        : auth.isStudent
          ? '/aluno/inicio'
          : '/aluno/entrar'
    navigate(to, { replace: true })
  }

  return (
    <AuthShell title="Confirmando acesso…" description="Aguarde um instante.">
      <p className="text-sm text-muted-foreground">Validando sessão…</p>
    </AuthShell>
  )
}

function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <div className="space-y-2 text-center">
        <BrandMark className="justify-center" size="lg" />
        <p className="text-sm text-muted-foreground">{BRAND.slogan}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <Link to="/" className="text-center text-sm text-muted-foreground underline">
        Voltar ao site
      </Link>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
