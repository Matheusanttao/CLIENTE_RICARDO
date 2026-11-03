-- Acesso do aluno por USUÁRIO + SENHA criado pelo personal (sem e-mail).
-- Por baixo, o Supabase Auth exige um e-mail: usamos um e-mail interno
-- "<usuario>@aluno.personalricardoneves.com.br", que nunca recebe mensagens.
-- A conta já nasce confirmada, então nenhum e-mail é enviado.

alter table public.students
  add column if not exists login_username text;

create unique index if not exists students_login_username_key
  on public.students (lower(login_username))
  where login_username is not null;

-- ---------------------------------------------------------------------------
-- Criar acesso do aluno
-- ---------------------------------------------------------------------------
create or replace function public.create_student_login(
  p_student_id uuid,
  p_username text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_student public.students%rowtype;
  v_username text := lower(trim(p_username));
  v_email text;
  v_uid uuid := gen_random_uuid();
begin
  select * into v_student from public.students where id = p_student_id for update;
  if not found then
    raise exception 'Aluno não encontrado';
  end if;
  if not public.is_org_staff(v_student.organization_id) then
    raise exception 'Sem permissão';
  end if;
  if v_student.user_id is not null then
    raise exception 'Este aluno já tem acesso. Use "Trocar senha".';
  end if;
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Usuário inválido: use de 3 a 40 letras minúsculas, números, ponto, hífen ou _ (sem espaço e sem acento).';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;

  v_email := v_username || '@aluno.personalricardoneves.com.br';

  if exists (select 1 from auth.users where lower(email) = v_email)
     or exists (select 1 from public.students where lower(login_username) = v_username) then
    raise exception 'O usuário "%" já está em uso. Escolha outro.', v_username;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', v_student.full_name, 'username', v_username),
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text, 'email',
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    now(), now(), now()
  );

  update public.students
  set user_id = v_uid,
      login_username = v_username,
      status = 'active'
  where id = v_student.id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_student.organization_id, v_uid, 'student', 'active')
  on conflict (organization_id, user_id) do update set status = 'active';

  return v_uid;
end;
$$;

revoke all on function public.create_student_login(uuid, text, text) from public;
grant execute on function public.create_student_login(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Trocar a senha do aluno (substitui o "esqueci minha senha" por e-mail)
-- ---------------------------------------------------------------------------
create or replace function public.reset_student_password(
  p_student_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_student public.students%rowtype;
begin
  select * into v_student from public.students where id = p_student_id;
  if not found then
    raise exception 'Aluno não encontrado';
  end if;
  if not public.is_org_staff(v_student.organization_id) then
    raise exception 'Sem permissão';
  end if;
  if v_student.user_id is null then
    raise exception 'Este aluno ainda não tem acesso criado.';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;
  -- não permite usar esta função para trocar a senha de outro membro da equipe
  if exists (
    select 1 from public.organization_members
    where user_id = v_student.user_id and role in ('owner', 'admin', 'coach')
  ) then
    raise exception 'Não é permitido trocar a senha de um membro da equipe por aqui.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  where id = v_student.user_id;
end;
$$;

revoke all on function public.reset_student_password(uuid, text) from public;
grant execute on function public.reset_student_password(uuid, text) to authenticated;

-- O aluno não pode alterar o próprio usuário de login (só a equipe)
create or replace function public.prevent_student_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_org_staff(old.organization_id)
     and old.user_id = auth.uid() then
    if new.organization_id is distinct from old.organization_id
       or new.user_id is distinct from old.user_id
       or new.status is distinct from old.status
       or new.login_username is distinct from old.login_username then
      raise exception 'Aluno não pode alterar vínculo, status ou usuário';
    end if;
  end if;
  return new;
end;
$$;
