import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireSupabase } from '@/lib/supabase/client'

/** Troca a própria senha (não depende de e-mail). */
export function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
      if (password !== confirm) throw new Error('As senhas não conferem.')
      const { error } = await requireSupabase().auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Senha alterada')
      setOpen(false)
      setPassword('')
      setConfirm('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" aria-hidden />
          Senha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nova senha</Label>
              <Input id="new-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Repita a nova senha</Label>
              <Input id="confirm-pass" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Salvando…' : 'Salvar senha'}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
            Alterar minha senha
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
