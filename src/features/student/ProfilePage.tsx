import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ExternalLink, LogOut, Moon, Sun } from 'lucide-react'
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

  return (
    <div className="space-y-4 pb-8">
      <h1 className="font-display text-2xl font-semibold">Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
          <CardDescription>{auth.user?.email}</CardDescription>
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
              <Input id="phone" type="tel" {...form.register('phone')} />
            </div>
            {saveProfile.isError && (
              <p className="text-sm text-destructive">
                {saveProfile.error instanceof Error ? saveProfile.error.message : 'Erro ao salvar'}
              </p>
            )}
            {saveProfile.isSuccess && <p className="text-sm text-muted-foreground">Perfil atualizado.</p>}
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {resolved === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Modo escuro
          </div>
          <Switch checked={resolved === 'dark'} onCheckedChange={toggleDark} aria-label="Alternar tema escuro" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atalhos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" asChild className="justify-start">
            <Link to="/aluno/anamnese">Anamnese</Link>
          </Button>
          <Button variant="outline" asChild className="justify-start">
            <Link to="/aluno/avaliacoes">Avaliações</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instalar no celular (PWA)</CardTitle>
          <CardDescription>Use o app como atalho na tela inicial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Android (Chrome):</strong> menu ⋮ → &quot;Adicionar à tela inicial&quot; ou
            &quot;Instalar app&quot;.
          </p>
          <p>
            <strong className="text-foreground">iPhone (Safari):</strong> botão Compartilhar → &quot;Adicionar à Tela de
            Início&quot;.
          </p>
          <p>
            <strong className="text-foreground">Desktop:</strong> ícone de instalação na barra de endereço, se disponível.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          <p className="text-xs text-muted-foreground">{BRAND.name}</p>
          <Button variant="destructive" onClick={() => auth.signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          <Button variant="ghost" asChild>
            <a href="/">
              <ExternalLink className="mr-2 h-4 w-4" />
              Site institucional
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
