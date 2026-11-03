-- ============================================================
-- PASSO 2 — TORNAR O RICARDO ADMINISTRADOR
-- Antes: Authentication > Users > Add user > Create new user
--   e-mail personalricardoneves82@gmail.com + senha, marque "Auto Confirm User".
-- Depois rode SÓ ESTE BLOCO numa query nova.
-- ============================================================
do $$
declare
  v_email text := 'personalricardoneves82@gmail.com';
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'Usuário % não encontrado. Crie em Authentication > Users e rode este bloco de novo.', v_email;
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values ('a0000000-0000-4000-8000-000000000001', v_uid, 'owner', 'active')
  on conflict (organization_id, user_id)
  do update set role = 'owner', status = 'active';

  update public.profiles
  set full_name = coalesce(nullif(full_name, v_email), 'Ricardo Neves')
  where id = v_uid;

  raise notice 'Pronto: % agora é administrador.', v_email;
end $$;

-- Conferência (deve mostrar: personalricardoneves82@gmail.com | owner | active)
select u.email, m.role, m.status
from public.organization_members m
join auth.users u on u.id = m.user_id;
