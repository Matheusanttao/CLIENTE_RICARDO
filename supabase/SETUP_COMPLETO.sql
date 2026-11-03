-- ============================================================
-- SETUP COMPLETO DO BANCO — Ricardo Neves Personal
-- Cole TUDO no Supabase > SQL Editor > New query > Run (uma vez só).
-- Gerado a partir de supabase/migrations/*.sql
-- ============================================================

-- >>> supabase/migrations/20260326000001_init.sql
-- Ricardo Neves Personal — schema inicial MVP
-- Multi-tenant: organizations + organization_members
-- RLS em todas as tabelas expostas

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'coach', 'student');
create type public.member_status as enum ('active', 'invited', 'pending', 'suspended', 'removed');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.access_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.student_status as enum ('active', 'archived', 'pending');
create type public.training_level as enum ('beginner', 'intermediate', 'advanced');
create type public.anamnesis_status as enum ('draft', 'submitted', 'under_review', 'reviewed');
create type public.program_status as enum ('draft', 'published', 'archived');
create type public.training_log_status as enum ('in_progress', 'completed', 'partial');
create type public.charge_status as enum ('pending', 'paid', 'overdue', 'cancelled');
create type public.plan_interval as enum ('weekly', 'monthly', 'quarterly', 'yearly', 'custom');
create type public.muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'cardio', 'other'
);

-- ---------------------------------------------------------------------------
-- Helper: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_path text,
  preferred_theme text check (preferred_theme in ('light', 'dark', 'system')) default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  slogan text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx on public.organization_members (organization_id);

create trigger organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- Impede auto-promoção de role via cliente (exceto service role)
create or replace function public.prevent_member_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Usuário comum não pode alterar o próprio role/status/org
  if old.user_id = auth.uid() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.organization_id is distinct from old.organization_id
       or new.user_id is distinct from old.user_id then
      raise exception 'Não é permitido alterar papel ou vínculo do próprio membership';
    end if;
  end if;

  return new;
end;
$$;

create trigger organization_members_no_self_escalation
  before update on public.organization_members
  for each row execute function public.prevent_member_privilege_escalation();

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer, search_path fixo)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_org_staff(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'coach')
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_staff(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- student_invitations / access_requests
-- ---------------------------------------------------------------------------
create table public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_invitations_token_idx on public.student_invitations (token);
create index student_invitations_org_idx on public.student_invitations (organization_id);

create trigger student_invitations_updated_at
  before update on public.student_invitations
  for each row execute function public.set_updated_at();

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  message text,
  status public.access_request_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index access_requests_org_idx on public.access_requests (organization_id);

create trigger access_requests_updated_at
  before update on public.access_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  sex text check (sex in ('female', 'male', 'other', 'prefer_not')),
  cpf text,
  address text,
  profession text,
  photo_path text,
  primary_goal text,
  secondary_goal text,
  level public.training_level,
  available_days text[] default '{}',
  weekly_frequency int check (weekly_frequency is null or weekly_frequency between 1 and 7),
  session_minutes int check (session_minutes is null or session_minutes > 0),
  training_location text,
  available_equipment text[] default '{}',
  status public.student_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index students_org_idx on public.students (organization_id);
create index students_user_idx on public.students (user_id);
create index students_status_idx on public.students (organization_id, status);

create trigger students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- Aluno não pode mudar organization_id / user_id / status
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
       or new.status is distinct from old.status then
      raise exception 'Aluno não pode alterar vínculo ou status';
    end if;
  end if;
  return new;
end;
$$;

create trigger students_no_self_privilege
  before update on public.students
  for each row execute function public.prevent_student_privilege_change();

create or replace function public.current_student_id(p_org_id uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.user_id = auth.uid()
    and s.status = 'active'
    and (p_org_id is null or s.organization_id = p_org_id)
  limit 1;
$$;

revoke all on function public.current_student_id(uuid) from public;
grant execute on function public.current_student_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- consent_records / anamnesis_records
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  consent_type text not null,
  version text not null,
  accepted boolean not null default true,
  marketing_photos boolean not null default false,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index consent_records_user_idx on public.consent_records (user_id);

create table public.anamnesis_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  form_version text not null default '1.0',
  status public.anamnesis_status not null default 'draft',
  health_history jsonb not null default '{}'::jsonb,
  habits jsonb not null default '{}'::jsonb,
  sports_history jsonb not null default '{}'::jsonb,
  truthfulness_declared boolean not null default false,
  declared_at timestamptz,
  declared_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index anamnesis_student_idx on public.anamnesis_records (student_id);
create index anamnesis_status_idx on public.anamnesis_records (organization_id, status);

create trigger anamnesis_updated_at
  before update on public.anamnesis_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- physical_assessments (+ estrutura para dobras)
-- ---------------------------------------------------------------------------
create table public.physical_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  assessed_at date not null default current_date,
  assessed_by uuid references auth.users (id) on delete set null,
  weight_kg numeric(6,2),
  height_cm numeric(5,2),
  body_fat_percent numeric(5,2),
  body_fat_method text,
  body_fat_source text,
  fat_mass_kg numeric(6,2),
  fat_free_mass_kg numeric(6,2),
  muscle_mass_kg numeric(6,2),
  muscle_mass_method text,
  perimetry jsonb not null default '{}'::jsonb,
  skinfolds_mm jsonb not null default '{}'::jsonb,
  protocol_code text,
  protocol_result numeric(8,3),
  protocol_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_org_student_fk check (true)
);

create index physical_assessments_student_idx on public.physical_assessments (student_id);
create index physical_assessments_org_idx on public.physical_assessments (organization_id);

create trigger physical_assessments_updated_at
  before update on public.physical_assessments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  muscle_group public.muscle_group not null default 'other',
  equipment text,
  level public.training_level,
  instructions text,
  common_mistakes text,
  notes text,
  video_url text,
  video_storage_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_org_idx on public.exercises (organization_id);
create index exercises_muscle_idx on public.exercises (organization_id, muscle_group);

create trigger exercises_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout programs / sessions / exercises
-- ---------------------------------------------------------------------------
create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  title text not null,
  objective text,
  frequency_per_week int,
  valid_from date,
  valid_until date,
  status public.program_status not null default 'draft',
  version int not null default 1,
  parent_program_id uuid references public.workout_programs (id) on delete set null,
  is_template boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_programs_student_idx on public.workout_programs (student_id);
create index workout_programs_org_status_idx on public.workout_programs (organization_id, status);

create trigger workout_programs_updated_at
  before update on public.workout_programs
  for each row execute function public.set_updated_at();

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  estimated_minutes int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_program_idx on public.workout_sessions (program_id);

create trigger workout_sessions_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  sort_order int not null default 0,
  -- snapshot do exercício no momento da prescrição (preserva histórico)
  exercise_name text not null,
  exercise_instructions text,
  exercise_video_url text,
  sets int,
  reps text,
  suggested_load numeric(8,2),
  load_unit text default 'kg',
  rest_seconds int,
  duration_seconds int,
  distance_meters numeric(10,2),
  cadence text,
  rpe numeric(4,1),
  rir numeric(4,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_exercises_session_idx on public.workout_exercises (session_id);

create trigger workout_exercises_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- training logs (execução) — cópia imutável da prescrição no início
-- ---------------------------------------------------------------------------
create table public.training_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  program_id uuid references public.workout_programs (id) on delete set null,
  session_id uuid references public.workout_sessions (id) on delete set null,
  client_request_id uuid unique,
  status public.training_log_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  rest_ends_at timestamptz,
  prescription_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index training_logs_student_idx on public.training_logs (student_id, started_at desc);
create index training_logs_in_progress_idx on public.training_logs (student_id, status);

create trigger training_logs_updated_at
  before update on public.training_logs
  for each row execute function public.set_updated_at();

create table public.training_set_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  training_log_id uuid not null references public.training_logs (id) on delete cascade,
  workout_exercise_id uuid,
  exercise_name text not null,
  set_number int not null,
  client_request_id uuid unique,
  prescribed_reps text,
  prescribed_load numeric(8,2),
  prescribed_load_unit text,
  actual_reps int,
  actual_load numeric(8,2),
  load_unit text default 'kg',
  rpe numeric(4,1),
  rir numeric(4,1),
  completed boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index training_set_logs_log_idx on public.training_set_logs (training_log_id);

create trigger training_set_logs_updated_at
  before update on public.training_set_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro
-- ---------------------------------------------------------------------------
create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  interval public.plan_interval not null default 'monthly',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index billing_plans_org_idx on public.billing_plans (organization_id);

create trigger billing_plans_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

create table public.student_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  plan_id uuid references public.billing_plans (id) on delete set null,
  plan_name text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  interval public.plan_interval not null default 'monthly',
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_plans_student_idx on public.student_plans (student_id);

create trigger student_plans_updated_at
  before update on public.student_plans
  for each row execute function public.set_updated_at();

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  student_plan_id uuid references public.student_plans (id) on delete set null,
  description text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  due_date date not null,
  status public.charge_status not null default 'pending',
  paid_at timestamptz,
  cancelled_at timestamptz,
  external_provider text,
  external_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index charges_org_status_idx on public.charges (organization_id, status);
create index charges_student_idx on public.charges (student_id);
create index charges_due_idx on public.charges (organization_id, due_date);

create trigger charges_updated_at
  before update on public.charges
  for each row execute function public.set_updated_at();

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  charge_id uuid not null references public.charges (id) on delete cascade,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  paid_at timestamptz not null default now(),
  method text not null default 'manual',
  notes text,
  recorded_by uuid references auth.users (id) on delete set null,
  external_provider text,
  external_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index payment_records_charge_idx on public.payment_records (charge_id);

-- ---------------------------------------------------------------------------
-- audit / data requests
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_org_idx on public.audit_events (organization_id, created_at desc);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.student_invitations enable row level security;
alter table public.access_requests enable row level security;
alter table public.students enable row level security;
alter table public.consent_records enable row level security;
alter table public.anamnesis_records enable row level security;
alter table public.physical_assessments enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.training_logs enable row level security;
alter table public.training_set_logs enable row level security;
alter table public.billing_plans enable row level security;
alter table public.student_plans enable row level security;
alter table public.charges enable row level security;
alter table public.payment_records enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_requests enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_select on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.organization_members om
      join public.students s on s.organization_id = om.organization_id
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'admin', 'coach')
        and s.user_id = profiles.id
    )
  );

-- organizations
create policy organizations_select_member on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy organizations_update_staff on public.organizations
  for update to authenticated using (public.is_org_staff(id)) with check (public.is_org_staff(id));

-- memberships
create policy members_select_same_org on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));
create policy members_insert_staff on public.organization_members
  for insert to authenticated with check (public.is_org_staff(organization_id));
create policy members_update_staff on public.organization_members
  for update to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

-- invitations
create policy invitations_staff_all on public.student_invitations
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy invitations_select_by_token on public.student_invitations
  for select to authenticated
  using (
    status = 'pending'
    and expires_at > now()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- access requests
create policy access_requests_insert_auth on public.access_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );
create policy access_requests_select_own on public.access_requests
  for select to authenticated using (user_id = auth.uid());
create policy access_requests_staff on public.access_requests
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
-- leitura pública mínima da org para solicitar acesso (apenas id/name/slug via view)
create or replace view public.public_organizations
with (security_invoker = false)
as
  select id, name, slug, slogan
  from public.organizations;

grant select on public.public_organizations to anon, authenticated;

-- students
create policy students_staff_all on public.students
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy students_select_own on public.students
  for select to authenticated
  using (user_id = auth.uid() and status = 'active');
create policy students_update_own_limited on public.students
  for update to authenticated
  using (user_id = auth.uid() and status = 'active')
  with check (user_id = auth.uid() and status = 'active');

-- consent
create policy consent_insert_own on public.consent_records
  for insert to authenticated with check (user_id = auth.uid());
create policy consent_select_own on public.consent_records
  for select to authenticated using (user_id = auth.uid());
create policy consent_staff_select on public.consent_records
  for select to authenticated using (public.is_org_staff(organization_id));

-- anamnesis
create policy anamnesis_staff_all on public.anamnesis_records
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy anamnesis_student_select on public.anamnesis_records
  for select to authenticated
  using (student_id = public.current_student_id(organization_id));
create policy anamnesis_student_write on public.anamnesis_records
  for insert to authenticated
  with check (student_id = public.current_student_id(organization_id));
create policy anamnesis_student_update on public.anamnesis_records
  for update to authenticated
  using (
    student_id = public.current_student_id(organization_id)
    and status in ('draft', 'submitted')
  )
  with check (student_id = public.current_student_id(organization_id));

-- assessments
create policy assessments_staff_all on public.physical_assessments
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy assessments_student_select on public.physical_assessments
  for select to authenticated
  using (student_id = public.current_student_id(organization_id));

-- exercises
create policy exercises_staff_all on public.exercises
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy exercises_student_select on public.exercises
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and is_active = true
  );

-- programs
create policy programs_staff_all on public.workout_programs
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy programs_student_select on public.workout_programs
  for select to authenticated
  using (
    student_id = public.current_student_id(organization_id)
    and status = 'published'
  );

-- sessions / workout exercises
create policy sessions_staff_all on public.workout_sessions
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy sessions_student_select on public.workout_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_programs p
      where p.id = workout_sessions.program_id
        and p.status = 'published'
        and p.student_id = public.current_student_id(workout_sessions.organization_id)
    )
  );

create policy workout_exercises_staff_all on public.workout_exercises
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy workout_exercises_student_select on public.workout_exercises
  for select to authenticated
  using (
    exists (
      select 1
      from public.workout_sessions ws
      join public.workout_programs p on p.id = ws.program_id
      where ws.id = workout_exercises.session_id
        and p.status = 'published'
        and p.student_id = public.current_student_id(workout_exercises.organization_id)
    )
  );

-- training logs
create policy training_logs_staff_select on public.training_logs
  for select to authenticated using (public.is_org_staff(organization_id));
create policy training_logs_student_all on public.training_logs
  for all to authenticated
  using (student_id = public.current_student_id(organization_id))
  with check (student_id = public.current_student_id(organization_id));

create policy training_set_logs_staff_select on public.training_set_logs
  for select to authenticated using (public.is_org_staff(organization_id));
create policy training_set_logs_student_all on public.training_set_logs
  for all to authenticated
  using (
    exists (
      select 1 from public.training_logs tl
      where tl.id = training_set_logs.training_log_id
        and tl.student_id = public.current_student_id(training_set_logs.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.training_logs tl
      where tl.id = training_set_logs.training_log_id
        and tl.student_id = public.current_student_id(training_set_logs.organization_id)
    )
  );

-- billing
create policy billing_plans_staff_all on public.billing_plans
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy billing_plans_member_select on public.billing_plans
  for select to authenticated
  using (public.is_org_member(organization_id) and is_active = true);

create policy student_plans_staff_all on public.student_plans
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy student_plans_student_select on public.student_plans
  for select to authenticated
  using (student_id = public.current_student_id(organization_id));

create policy charges_staff_all on public.charges
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy charges_student_select on public.charges
  for select to authenticated
  using (student_id = public.current_student_id(organization_id));

create policy payments_staff_all on public.payment_records
  for all to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));
create policy payments_student_select on public.payment_records
  for select to authenticated
  using (
    exists (
      select 1 from public.charges c
      where c.id = payment_records.charge_id
        and c.student_id = public.current_student_id(payment_records.organization_id)
    )
  );

-- audit / data requests
create policy audit_staff_select on public.audit_events
  for select to authenticated using (public.is_org_staff(organization_id));
create policy audit_insert_auth on public.audit_events
  for insert to authenticated with check (actor_id = auth.uid());

create policy data_requests_own on public.data_requests
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy data_requests_staff_select on public.data_requests
  for select to authenticated
  using (organization_id is not null and public.is_org_staff(organization_id));

-- ---------------------------------------------------------------------------
-- Storage buckets privados
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'private-files',
    'private-files',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do nothing;

create policy avatars_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy private_files_staff on storage.objects
  for all to authenticated
  using (
    bucket_id = 'private-files'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'private-files'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  );

create policy private_files_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-files'
    and (storage.foldername(name))[2] = public.current_student_id(((storage.foldername(name))[1])::uuid)::text
  );

-- ---------------------------------------------------------------------------
-- Seed da organização inicial (sem admin — ver docs/BOOTSTRAP_ADMIN.md)
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, slogan)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Ricardo Neves Personal',
  'ricardo-neves-personal',
  'Seu treino. Sua evolução. Seu resultado.'
)
on conflict (slug) do nothing;

-- >>> supabase/migrations/20260326000002_accept_invite.sql
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


-- >>> supabase/migrations/20261103000001_exercise_images.sql
-- Foto demonstrativa do exercício
-- Bucket público: são fotos de execução de exercício (não são dados pessoais),
-- assim carregam rápido no app e ficam em cache. Só a equipe pode enviar/apagar.

alter table public.exercises
  add column if not exists image_path text;

-- cópia da foto no momento da prescrição (mesma ideia do nome/instruções)
alter table public.workout_exercises
  add column if not exists exercise_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-images',
  'exercise-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- caminho: {organization_id}/{arquivo}
drop policy if exists exercise_images_staff_select on storage.objects;
drop policy if exists exercise_images_staff_insert on storage.objects;
drop policy if exists exercise_images_staff_update on storage.objects;
drop policy if exists exercise_images_staff_delete on storage.objects;

create policy exercise_images_staff_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exercise-images'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  );

create policy exercise_images_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-images'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  );

create policy exercise_images_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exercise-images'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  );

create policy exercise_images_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-images'
    and public.is_org_staff(((storage.foldername(name))[1])::uuid)
  );


-- >>> supabase/migrations/20261103000002_student_username_login.sql
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


-- ============================================================
-- PASSO 2 — TORNAR O RICARDO ADMINISTRADOR
-- Rode SÓ ESTE BLOCO depois de criar a conta dele em
-- Authentication > Users > Add user (marque "Auto Confirm User").
-- Troque o e-mail abaixo. Se o usuário ainda não existir, só avisa.
-- ============================================================
do $$
declare
  v_email text := 'EMAIL_DO_RICARDO@gmail.com';  -- << TROQUE AQUI
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise notice 'Usuário % ainda não existe. Crie em Authentication > Users e rode este bloco de novo.', v_email;
    return;
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values ('a0000000-0000-4000-8000-000000000001', v_uid, 'owner', 'active')
  on conflict (organization_id, user_id)
  do update set role = 'owner', status = 'active';

  update public.profiles
  set full_name = coalesce(nullif(full_name, v_email), 'Ricardo Neves')
  where id = v_uid;

  raise notice 'Pronto: % agora é administrador (owner).', v_email;
end $$;
