-- 04 generation: outlines, ebook_sections, generation_jobs
-- aligned with types/outline.ts, types/section.ts

create table if not exists public.outlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_outlines_project_id on public.outlines (project_id);

drop trigger if exists outlines_set_updated_at on public.outlines;
create trigger outlines_set_updated_at
  before update on public.outlines
  for each row
  execute function public.set_updated_at();

create table if not exists public.ebook_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  outline_section_id text not null,
  position integer not null
    check (position >= 1),
  title text not null default '',
  content_html text not null default '',
  word_count integer not null default 0
    check (word_count >= 0),
  status text not null default 'pending'
    check (status in (
      'pending',
      'generating',
      'generated',
      'failed',
      'edited'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, outline_section_id)
);

create index if not exists idx_ebook_sections_project_id
  on public.ebook_sections (project_id);
create index if not exists idx_ebook_sections_status
  on public.ebook_sections (status);
create index if not exists idx_ebook_sections_project_position
  on public.ebook_sections (project_id, position);

drop trigger if exists ebook_sections_set_updated_at on public.ebook_sections;
create trigger ebook_sections_set_updated_at
  before update on public.ebook_sections
  for each row
  execute function public.set_updated_at();

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'outline',
      'section',
      'enhancement',
      'title',
      'cta',
      'publish',
      'pdf_export'
    )),
  target_id text,
  status text not null default 'queued'
    check (status in (
      'queued',
      'running',
      'completed',
      'failed',
      'paused'
    )),
  attempts integer not null default 0
    check (attempts >= 0),
  error_message text,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_generation_jobs_project_id
  on public.generation_jobs (project_id);
create index if not exists idx_generation_jobs_status
  on public.generation_jobs (status);
create index if not exists idx_generation_jobs_project_status
  on public.generation_jobs (project_id, status);

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row
  execute function public.set_updated_at();
