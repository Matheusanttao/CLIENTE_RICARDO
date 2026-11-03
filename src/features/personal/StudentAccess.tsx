import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Copy, KeyRound, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  generatePassword,
  normalizeUsername,
  suggestUsername,
  USERNAME_HINT,
  USERNAME_PATTERN,
} from '@/lib/auth/username'
import { getAppUrl } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase/client'

export type Credentials = { fullName: string; username: string; password: string; isReset?: boolean }

export async function createStudentLogin(studentId: string, username: string, password: string) {
  const { error } = await requireSupabase().rpc('create_student_login', {
    p_student_id: studentId,
    p_username: username,
    p_password: password,
  })
  if (error) throw new Error(error.message)
}

export function validateCredentials(username: string, password: string): string | null {
  if (!USERNAME_PATTERN.test(username)) return `Usuário inválido. ${USERNAME_HINT}`
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.'
  return null
}

/** Campos "Usuário" e "Senha" reaproveitados no cadastro e no detalhe do aluno. */
export function CredentialFields({
  username,
  password,
  onUsername,
  onPassword,
  showUsername = true,
}: {
  username: string
  password: string
  onUsername: (v: string) => void
  onPassword: (v: string) => void
  showUsername?: boolean
}) {
  return (
    <>
      {showUsername && (
        <div className="space-y-2">
          <Label>Usuário (para entrar no app)</Label>
          <Input
            value={username}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ex.: maria.silva"
            onChange={(e) => onUsername(normalizeUsername(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">{USERNAME_HINT}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="flex gap-2">
          <Input
            value={password}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => onPassword(e.target.value)}
          />
          <Button type="button" variant="outline" size="icon" aria-label="Gerar senha" onClick={() => onPassword(generatePassword())}>
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres. Toque em ↻ para gerar uma.</p>
      </div>
    </>
  )
}

export function credentialsMessage(c: Credentials): string {
  const first = c.fullName.trim().split(/\s+/)[0] || ''
  return [
    `Olá${first ? `, ${first}` : ''}! ${c.isReset ? 'Sua nova senha' : 'Seu acesso'} ao app Ricardo Neves Personal:`,
    '',
    `👤 Usuário: ${c.username}`,
    `🔑 Senha: ${c.password}`,
    '',
    `Acesse: ${getAppUrl()}/aluno`,
  ].join('\n')
}

/** Mostra usuário e senha prontos para mandar pelo WhatsApp. */
export function CredentialsDialog({ credentials, onClose }: { credentials: Credentials | null; onClose: () => void }) {
  const message = credentials ? credentialsMessage(credentials) : ''
  return (
    <Dialog open={credentials !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{credentials?.isReset ? 'Senha alterada' : 'Acesso criado'}</DialogTitle>
        </DialogHeader>
        {credentials && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie estes dados para o aluno. A senha não fica visível depois que você fechar esta janela.
            </p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm">{message}</pre>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(message).then(
                    () => toast.success('Mensagem copiada'),
                    () => toast.error('Não foi possível copiar'),
                  )
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copiar mensagem
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                  Enviar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Cartão "Acesso ao app" no detalhe do aluno: criar acesso ou trocar senha. */
export function StudentAccessCard({
  student,
}: {
  student: { id: string; full_name: string; user_id: string | null; login_username: string | null }
}) {
  const qc = useQueryClient()
  const [username, setUsername] = useState(() => suggestUsername(student.full_name))
  const [password, setPassword] = useState(() => generatePassword())
  const [editing, setEditing] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const hasLogin = Boolean(student.user_id)

  const create = useMutation({
    mutationFn: async () => {
      const invalid = validateCredentials(username, password)
      if (invalid) throw new Error(invalid)
      await createStudentLogin(student.id, username, password)
    },
    onSuccess: () => {
      setCredentials({ fullName: student.full_name, username, password })
      qc.invalidateQueries({ queryKey: ['personal'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reset = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
      const { error } = await requireSupabase().rpc('reset_student_password', {
        p_student_id: student.id,
        p_password: password,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setEditing(false)
      setCredentials({
        fullName: student.full_name,
        username: student.login_username ?? '',
        password,
        isReset: true,
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" aria-hidden />
          Acesso ao app
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasLogin ? (
          <>
            <p className="text-sm">
              Usuário: <strong>{student.login_username ?? '(criado por convite antigo)'}</strong>
            </p>
            {editing ? (
              <>
                <CredentialFields
                  showUsername={false}
                  username=""
                  password={password}
                  onUsername={() => undefined}
                  onPassword={setPassword}
                />
                <div className="flex gap-2">
                  <Button disabled={reset.isPending} onClick={() => reset.mutate()}>
                    {reset.isPending ? 'Salvando…' : 'Salvar nova senha'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setPassword(generatePassword())
                  setEditing(true)
                }}
              >
                Trocar senha
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Este aluno ainda não tem acesso ao app.</p>
            <CredentialFields username={username} password={password} onUsername={setUsername} onPassword={setPassword} />
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Criando…' : 'Criar acesso'}
            </Button>
          </>
        )}
      </CardContent>
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  )
}
