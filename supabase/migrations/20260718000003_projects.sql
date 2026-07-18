-- 03 projects: projects, project_states, messages
-- aligned with types/project.ts, types/message.ts

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  author text not null default '',
  subtitle text,
  description text not null default '',
  audience text not null default '',
  tone text not null default '',
  niche text not null default '',
  status text not null default 'draft'
    check (status in (
      'draft',
      'outline_draft',
      'approved',
      'generating',
      'generated',
      'publishing',
      'published',
      'failed'
    )),
  template_id text,
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  sections_generated integer not null default 0
    check (sections_generated >= 0),
  total_sections integer not null default 0
    check (total_sections >= 0),
  cover_color text not null default '#6366f1',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_owner_id on public.projects (owner_id);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_owner_status on public.projects (owner_id, status);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

create table if not exists public.project_states (
  project_id uuid primary key references public.projects (id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  readiness_score integer not null default 0
    check (readiness_score >= 0 and readiness_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_states_json
  on public.project_states using gin (state_json);

drop trigger if exists project_states_set_updated_at on public.project_states;
create trigger project_states_set_updated_at
  before update on public.project_states
  for each row
  execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  role text not null
    check (role in ('user', 'assistant', 'system')),
  content text not null,
  agent text
    check (
      agent is null
      or agent in (
        'strategist',
        'planner',
        'writer',
        'enhancement',
        'title',
        'cta'
      )
    ),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_project_id on public.messages (project_id);
create index if not exists idx_messages_project_created
  on public.messages (project_id, created_at);
