-- Section content revisions for regenerate / enhancement / manual snapshots.

create table if not exists public.ebook_section_revisions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null
    references public.ebook_sections(id)
    on delete cascade,
  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  title text not null,
  content_html text not null,
  word_count integer not null,
  source text not null,

  created_at timestamptz not null default now(),

  constraint section_revision_source_check
    check (source in (
      'before_regenerate',
      'before_enhancement_accept',
      'manual_version'
    ))
);

create index if not exists idx_ebook_section_revisions_section_id
  on public.ebook_section_revisions (section_id, created_at desc);

create index if not exists idx_ebook_section_revisions_project_id
  on public.ebook_section_revisions (project_id);

alter table public.ebook_section_revisions enable row level security;

drop policy if exists "ebook_section_revisions_select_own"
  on public.ebook_section_revisions;
create policy "ebook_section_revisions_select_own"
  on public.ebook_section_revisions
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "ebook_section_revisions_insert_own"
  on public.ebook_section_revisions;
create policy "ebook_section_revisions_insert_own"
  on public.ebook_section_revisions
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "ebook_section_revisions_delete_own"
  on public.ebook_section_revisions;
create policy "ebook_section_revisions_delete_own"
  on public.ebook_section_revisions
  for delete
  to authenticated
  using (public.is_project_owner(project_id));
