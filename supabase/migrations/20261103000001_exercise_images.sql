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
