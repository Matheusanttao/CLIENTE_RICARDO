# Criar o primeiro administrador

O cadastro público **não** permite escolher perfil de administrador. O primeiro owner/admin da organização **Ricardo Neves Personal** deve ser criado por procedimento privilegiado.

## Pré-requisitos

1. Migration aplicada (organização seed com slug `ricardo-neves-personal`).
2. Conta criada no Auth (e-mail confirmado), **ou** criada via Admin API.
3. `SUPABASE_SERVICE_ROLE_KEY` disponível apenas no seu ambiente local/servidor seguro.

## Opção A — SQL Editor (recomendado)

1. Crie o usuário em **Authentication → Users → Add user** (e-mail + senha).
2. Copie o `user_id` (UUID).
3. Execute no SQL Editor (substitua o UUID):

```sql
-- Vincular como owner da organização seed
insert into public.organization_members (organization_id, user_id, role, status)
values (
  'a0000000-0000-4000-8000-000000000001',
  'COLE_O_USER_UUID_AQUI',
  'owner',
  'active'
)
on conflict (organization_id, user_id)
do update set role = 'owner', status = 'active';

update public.profiles
set full_name = coalesce(full_name, 'Ricardo Neves')
where id = 'COLE_O_USER_UUID_AQUI';
```

4. Acesse `/personal` com esse e-mail e senha.

## Opção B — Script Node (service role)

```bash
# No .env.local (NÃO commitar):
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# ADMIN_EMAIL=...
# ADMIN_PASSWORD=...

node scripts/bootstrap-admin.mjs
```

## Segurança

- Não exponha a service role no frontend nem em variáveis `VITE_*`.
- Após o bootstrap, prefira convidar outros coaches via painel (membership criado por staff).
- Alunos entram por **convite** ou **solicitação de acesso** aprovada.
