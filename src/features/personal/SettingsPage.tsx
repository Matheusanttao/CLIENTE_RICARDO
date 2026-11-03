import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme } from '@/lib/theme'
import { requireSupabase } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'
import { useState } from 'react'

export function SettingsPage() {
  const { staffMembership, profile, signOut, user, isStudent } = useAuth()
  const orgId = staffMembership?.organization_id
  const { theme, setTheme, resolved } = useTheme()
  const qc = useQueryClient()

  const org = useQuery({
    queryKey: ['personal', 'org', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb.from('organizations').select('*').eq('id', orgId!).single()
      if (error) throw error
      return data
    },
  })

  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')

  const saveOrg = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const { error } = await sb
        .from('organizations')
        .update({
          name: name || org.data?.name,
          slogan: slogan || org.data?.slogan,
        })
        .eq('id', orgId!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Organização atualizada')
      qc.invalidateQueries({ queryKey: ['personal', 'org', orgId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Organização, preferências e sessão.</p>
      </div>

      <Card>
        <CardHeader>
          <BrandMark />
          <CardTitle className="mt-2">Organização</CardTitle>
          <CardDescription>Primeira organização: Ricardo Neves Personal (seed da migration).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder={org.data?.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Slogan</Label>
            <Input
              placeholder={org.data?.slogan || ''}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
            />
          </div>
          <Button onClick={() => saveOrg.mutate()}>Salvar organização</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Nome: {profile?.full_name || '—'}</p>
          <p>Papel: {staffMembership?.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Tema escuro</p>
            <p className="text-xs text-muted-foreground">Atual: {resolved} (preferência: {theme})</p>
          </div>
          <Switch
            checked={resolved === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            aria-label="Alternar tema"
          />
        </CardContent>
      </Card>

      {isStudent && (
        <Button asChild variant="outline" className="w-full">
          <Link to="/aluno/inicio">Ir para área do aluno</Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Administração</CardTitle>
          <CardDescription>
            O primeiro administrador é criado apenas por procedimento documentado em{' '}
            <code>docs/BOOTSTRAP_ADMIN.md</code>. Não há cadastro público de admin.
          </CardDescription>
        </CardHeader>
      </Card>

      <Button
        variant="destructive"
        className="w-full"
        onClick={async () => {
          await signOut()
          window.location.href = '/personal/entrar'
        }}
      >
        Sair
      </Button>
      <p className="text-center text-xs text-muted-foreground">Versão {APP_VERSION}</p>
    </div>
  )
}
