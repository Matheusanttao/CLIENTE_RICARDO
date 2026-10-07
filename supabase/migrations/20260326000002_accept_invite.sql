-- Aceite de convite com privilégio controlado (não permite escolher org livremente)

create or replace function public.accept_student_invitation(
  p_token text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.student_invitations%rowtype;
  v_student_id uuid;
begin
  if v_user_id is null then
    raise exception 'É necessário estar autenticado para aceitar o convite';
  end if;

  select * into v_invite
  from public.student_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Convite inválido';
  end if;

  if v_invite.status <> 'pending' or v_invite.expires_at <= now() then
    raise exception 'Convite expirado ou já utilizado';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Este convite não corresponde ao e-mail da sessão';
  end if;

  insert into public.students (
    organization_id, user_id, full_name, email, status
  ) values (
    v_invite.organization_id, v_user_id, p_full_name, v_invite.email, 'active'
  )
  on conflict (organization_id, user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = 'active'
  returning id into v_student_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_invite.organization_id, v_user_id, 'student', 'active')
  on conflict (organization_id, user_id) do update
    set status = 'active',
        role = case
          when organization_members.role in ('owner', 'admin', 'coach') then organization_members.role
          else 'student'
        end;

  update public.student_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  where id = v_invite.id;

  update public.profiles
  set full_name = coalesce(nullif(p_full_name, ''), full_name)
  where id = v_user_id;

  return v_student_id;
end;
$$;

revoke all on function public.accept_student_invitation(text, text) from public;
grant execute on function public.accept_student_invitation(text, text) to authenticated;

-- Aprovar solicitação de acesso (somente staff)
create or replace function public.approve_access_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.access_requests%rowtype;
  v_student_id uuid;
begin
  select * into v_req from public.access_requests where id = p_request_id for update;
  if not found then
    raise exception 'Solicitação não encontrada';
  end if;
  if not public.is_org_staff(v_req.organization_id) then
    raise exception 'Sem permissão';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Solicitação não está pendente';
  end if;
  if v_req.user_id is null then
    raise exception 'Solicitação sem usuário vinculado';
  end if;

  insert into public.students (
    organization_id, user_id, full_name, email, phone, status
  ) values (
    v_req.organization_id, v_req.user_id, v_req.full_name, v_req.email, v_req.phone, 'active'
  )
  on conflict (organization_id, user_id) do update
    set status = 'active', full_name = excluded.full_name
  returning id into v_student_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_req.organization_id, v_req.user_id, 'student', 'active')
  on conflict (organization_id, user_id) do update set status = 'active';

  update public.access_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  return v_student_id;
end;
$$;

revoke all on function public.approve_access_request(uuid) from public;
grant execute on function public.approve_access_request(uuid) to authenticated;
