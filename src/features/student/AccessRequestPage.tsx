import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND } from '@/lib/constants'
import { isSupabaseConfigured } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase/client'

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  message: z.string().max(500).optional(),
})

type Values = z.infer<typeof schema>

export function AccessRequestPage() {
  const auth = useAuth()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: auth.profile?.full_name || '',
      email: auth.user?.email || '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const sb = requireSupabase()
      let userId = auth.user?.id

      if (!userId) {
        if (!values.password) throw new Error('Defina uma senha para criar sua conta.')
        const { data, error: signErr } = await sb.auth.signUp({
          email: values.email,
          password: values.password,
          options: { data: { full_name: values.full_name } },
        })
        if (signErr) throw signErr
        userId = data.user?.id
        if (!userId) throw new Error('Confirme o e-mail se necessário e tente novamente.')
      }

      const { error: reqErr } = await sb.from('access_requests').insert({
        organization_id: BRAND.orgId,
        user_id: userId,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        message: values.message || null,
      })
      if (reqErr) throw reqErr
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => setError(e.message),
  })

  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <BrandMark className="justify-center" />
      <Card>
        <CardHeader>
          <CardTitle>Solicitar acesso</CardTitle>
          <CardDescription>
            Sua solicitação será enviada para {BRAND.name}. O acesso só é liberado após aprovação.
            Você não escolhe organização livremente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3 text-sm">
              <p>Solicitação enviada. Aguarde a aprovação do personal.</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/aluno/entrar">Ir para login</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input {...form.register('full_name')} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" {...form.register('email')} disabled={Boolean(auth.user)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input {...form.register('phone')} />
              </div>
              {!auth.user && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" {...form.register('password')} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Mensagem (opcional)</Label>
                <Textarea {...form.register('message')} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
