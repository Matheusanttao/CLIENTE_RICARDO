import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ChevronLeft, Eye, EyeOff, Lock, UserRound } from 'lucide-react'
import logoMark from '@/assets/logo-mark.png'
import ricardo from '@/assets/ricardo.webp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAppUrl, isSupabaseConfigured } from '@/lib/env'
import { sanitizeReturnTo } from '@/lib/auth/redirect'
import { requireSupabase } from '@/lib/supabase/client'
import { BRAND } from '@/lib/constants'
import { APP_VERSION } from '@/lib/version'
import { loginIdentifierToEmail } from '@/lib/auth/username'
import { getRememberedUser, hasRememberChoice, saveRememberChoice } from '@/lib/auth/remember'

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
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => hasRememberChoice(area))
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: getRememberedUser(area), password: '' },
  })

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
      saveRememberChoice(area, remember, values.identifier)
      await auth.refreshProfile()
      const fallback = area === 'personal' ? '/personal/dashboard' : '/aluno/inicio'
      const fromState = (location.state as { from?: string } | null)?.from
      const to = sanitizeReturnTo(params.get('redirect') || fromState, fallback)
      navigate(to, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao entrar')
    }
  })

  const isPersonal = area === 'personal'

  return (
    <AuthShell
      title={isPersonal ? 'Painel do personal' : 'Área do aluno'}
      description={isPersonal ? 'Entre para gerenciar alunos e treinos.' : 'Entre com o usuário e a senha que o Ricardo te enviou.'}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate autoComplete="on">
        <Field label={isPersonal ? 'E-mail ou usuário' : 'Usuário'} error={form.formState.errors.identifier?.message}>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={isPersonal ? 'seu@email.com' : 'ex.: maria.silva'}
              className="h-12 rounded-xl pl-10"
              {...form.register('identifier')}
            />
          </div>
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••"
              className="h-12 rounded-xl pl-10 pr-12"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Lembrar meu acesso</span>
            <span className="block text-xs text-muted-foreground">Continuar conectado neste celular</span>
          </span>
          <Switch checked={remember} onCheckedChange={setRemember} aria-label="Lembrar meu acesso" />
        </label>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button className="h-12 w-full rounded-xl text-base" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isPersonal ? 'Esqueceu a senha? Fale com o suporte.' : 'Não tem acesso ou esqueceu a senha? Fale com o Ricardo.'}
      </p>
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
    <div className="relative min-h-dvh overflow-hidden bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* computador: foto e chamada, igual à tela de boas-vindas */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img src={ricardo} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0e1210]/30 to-[#0e1210]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1210] via-[#0e1210]/20 to-transparent" aria-hidden />
        <div className="absolute bottom-0 left-0 p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Personal Trainer</p>
          <p className="mt-3 font-display text-5xl font-bold leading-tight text-white">
            Seu treino.
            <br />
            Sua evolução.
            <br />
            <span className="text-primary">Seu resultado.</span>
          </p>
        </div>
      </aside>

      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl lg:left-3/4"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] lg:justify-center lg:py-12">
        <Link to="/" className="-ml-2 flex w-fit items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Voltar
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--graphite)] p-3 shadow-xl shadow-primary/10 ring-1 ring-white/5">
            <img src={logoMark} alt="" className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="mt-8">{children}</div>

        <p className="mt-auto pt-8 text-center text-[11px] text-muted-foreground/60 lg:mt-10">
          {BRAND.name} · Versão {APP_VERSION}
        </p>
      </div>
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
