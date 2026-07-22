-- Generation quality metadata + project-level ebook generation memory.

alter table public.ebook_sections
  add column if not exists generation_meta jsonb not null default '{}'::jsonb;

create table if not exists public.project_generation_memory (
  project_id uuid primary key
    references public.projects(id)
    on delete cascade,

  schema_version integer not null default 1,
  memory_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists project_generation_memory_set_updated_at
  on public.project_generation_memory;
create trigger project_generation_memory_set_updated_at
  before update on public.project_generation_memory
  for each row
  execute function public.set_updated_at();

alter table public.project_generation_memory enable row level security;

drop policy if exists "project_generation_memory_select_own"
  on public.project_generation_memory;
create policy "project_generation_memory_select_own"
  on public.project_generation_memory
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "project_generation_memory_insert_own"
  on public.project_generation_memory;
create policy "project_generation_memory_insert_own"
  on public.project_generation_memory
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "project_generation_memory_update_own"
  on public.project_generation_memory;
create policy "project_generation_memory_update_own"
  on public.project_generation_memory
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "project_generation_memory_delete_own"
  on public.project_generation_memory;
create policy "project_generation_memory_delete_own"
  on public.project_generation_memory
  for delete
  to authenticated
  using (public.is_project_owner(project_id));
