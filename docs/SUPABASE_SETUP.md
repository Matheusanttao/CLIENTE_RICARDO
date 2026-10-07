# Configuração do Supabase

## 1. Criar projeto

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie **Project URL** e **anon/public key** para `.env` (veja `.env.example`).

## 2. Migrations

No SQL Editor do Supabase (ou via CLI):

```bash
# Com Supabase CLI instalado e projeto linkado:
supabase db push
```

Ou cole o conteúdo de `supabase/migrations/20260326000001_init.sql` no SQL Editor e execute.

## 3. Auth URLs

Em **Authentication → URL Configuration**:

| Ambiente | Site URL | Redirect URLs adicionais |
|----------|----------|--------------------------|
| Local | `http://localhost:5173` | `http://localhost:5173/aluno/auth/callback`, `http://localhost:5173/personal/auth/callback`, `http://localhost:5173/aluno/redefinir-senha`, `http://localhost:5173/personal/redefinir-senha` |
| Produção | `https://SEU_DOMINIO` | `https://SEU_DOMINIO/aluno/auth/callback`, `https://SEU_DOMINIO/personal/auth/callback`, `https://SEU_DOMINIO/aluno/redefinir-senha`, `https://SEU_DOMINIO/personal/redefinir-senha` |

O app valida destinos de retorno apenas sob `/aluno` e `/personal` (sem redirecionamento externo arbitrário).

## 4. E-mail

Configure o provedor de e-mail do Auth (SMTP ou provedor Supabase) para convites e recuperação de senha.

## 5. Storage

A migration cria buckets privados `avatars` e `private-files` com políticas. Confirme em **Storage** após aplicar o SQL.

## 6. Chaves

- Frontend: apenas `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- `SERVICE_ROLE_KEY`: somente scripts/servidor (bootstrap do admin). Nunca no Vite.

## 7. Primeiro administrador

Siga [BOOTSTRAP_ADMIN.md](./BOOTSTRAP_ADMIN.md).
