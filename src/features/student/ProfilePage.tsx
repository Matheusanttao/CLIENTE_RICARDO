import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ChevronRight, ClipboardList, FileHeart, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND } from '@/lib/constants'
import { isOnline, OFFLINE_SAVE_MESSAGE } from '@/lib/offline'
import { requireSupabase } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'
import { ChangePasswordCard } from '@/components/shared/ChangePasswordCard'
import { STUDENT_LOGIN_DOMAIN } from '@/lib/auth/username'
import { isNativeApp } from '@/lib/native/isNativeApp'
import { useTheme } from '@/lib/theme'

const schema = z.object({
  full_name: z.string().min(2, 'Informe seu nome'),
  phone: z.string().optional(),
})

type Values = z.infer<typeof schema>

export function ProfilePage() {
  const auth = useAuth()
  const { theme, setTheme, resolved } = useTheme()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      full_name: auth.profile?.full_name ?? '',
      phone: auth.profile?.phone ?? '',
    },
  })

  const saveProfile = useMutation({
    mutationFn: async (values: Values) => {
      if (!isOnline()) throw new Error(OFFLINE_SAVE_MESSAGE)
      if (!auth.user) throw new Error('Sessão inválida')
      const sb = requireSupabase()
      const { error } = await sb
        .from('profiles')
        .update({
          full_name: values.full_name.trim(),
          phone: values.phone?.trim() || null,
          preferred_theme: theme,
        })
        .eq('id', auth.user.id)
      if (error) throw error
      await auth.refreshProfile()
    },
  })

  const onSubmit = form.handleSubmit((values) => saveProfile.mutate(values))

  const toggleDark = () => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (auth.user && isOnline()) {
      requireSupabase()
        .from('profiles')
        .update({ preferred_theme: next })
        .eq('id', auth.user.id)
        .then(() => auth.refreshProfile())
    }
  }

  const username = studentUsername(auth.user?.email)
  const showInstall = !isNativeApp() && !window.matchMedia('(display-mode: standalone)').matches
  const name = auth.profile?.full_name || auth.activeStudent?.full_name || ''

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-4 pt-2">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xl font-semibold text-primary">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold">{name || 'Perfil'}</h1>
          {username && <p className="text-sm text-muted-foreground">@{username}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" {...form.register('full_name')} />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" placeholder="(31) 9 0000-0000" {...form.register('phone')} />
            </div>
            {saveProfile.isError && (
              <p className="text-sm text-destructive">
                {saveProfile.error instanceof Error ? saveProfile.error.message : 'Erro ao salvar'}
              </p>
            )}
            {saveProfile.isSuccess && <p className="text-sm text-primary">Dados salvos.</p>}
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-sm font-medium">
              {resolved === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              Modo escuro
            </div>
            <Switch checked={resolved === 'dark'} onCheckedChange={toggleDark} aria-label="Alternar tema escuro" />
          </div>
          <RowLink to="/aluno/anamnese" icon={<FileHeart className="h-4 w-4 text-primary" />} label="Minha anamnese" />
          <RowLink to="/aluno/avaliacoes" icon={<ClipboardList className="h-4 w-4 text-primary" />} label="Minhas avaliações" />
          <RowLink to="/privacidade" icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Política de privacidade" />
        </CardContent>
      </Card>

      {showInstall && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instalar no celular</CardTitle>
            <CardDescription>Deixe o app na tela inicial para abrir mais rápido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Android:</strong> menu ⋮ → &quot;Instalar app&quot;.
            </p>
            <p>
              <strong className="text-foreground">iPhone:</strong> Compartilhar → &quot;Adicionar à Tela de Início&quot;.
            </p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => auth.signOut()}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {BRAND.name} · Versão {APP_VERSION}
      </p>
    </div>
  )
}

function RowLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50">
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </Link>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase()
}

function studentUsername(email: string | null | undefined): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  return domain === STUDENT_LOGIN_DOMAIN ? (local ?? null) : null
}
