-- 01 profiles: auth.users → public.profiles + updated_at helper

create extension if not exists "pgcrypto";

-- updated_at helper (shared by later tables)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  plan_id text not null default 'free'
    check (plan_id in ('free', 'creator', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_plan_id on public.profiles (plan_id);
create index if not exists idx_profiles_email on public.profiles (email);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
-- 02 billing: subscriptions, credit_balances, credit_transactions
-- free-plan bootstrap after profile insert

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan_id text not null default 'free'
    check (plan_id in ('free', 'creator', 'pro')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  renews_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_status on public.subscriptions (status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

create table if not exists public.credit_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null default 'free'
    check (plan_id in ('free', 'creator', 'pro')),
  balance integer not null default 0
    check (balance >= 0),
  period_grant integer not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '30 days'),
  lifetime_spent integer not null default 0
    check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists credit_balances_set_updated_at on public.credit_balances;
create trigger credit_balances_set_updated_at
  before update on public.credit_balances
  for each row
  execute function public.set_updated_at();

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('grant', 'purchase', 'spend', 'refund', 'adjust')),
  amount integer not null,
  balance_after integer not null,
  label text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_transactions_user_id
  on public.credit_transactions (user_id);
create index if not exists idx_credit_transactions_created_at
  on public.credit_transactions (created_at desc);
create index if not exists idx_credit_transactions_type
  on public.credit_transactions (type);

-- free plan bootstrap: 50 credits, 30-day period, grant txn
create or replace function public.handle_new_profile_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := now();
  v_period_end timestamptz := now() + interval '30 days';
  v_grant integer := 50;
begin
  insert into public.subscriptions (user_id, plan_id, status, renews_at)
  values (new.id, 'free', 'active', v_period_end)
  on conflict (user_id) do nothing;

  insert into public.credit_balances (
    user_id,
    plan_id,
    balance,
    period_grant,
    period_start,
    period_end,
    lifetime_spent
  )
  values (
    new.id,
    'free',
    v_grant,
    v_grant,
    v_period_start,
    v_period_end,
    0
  )
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    new.id,
    'grant',
    v_grant,
    v_grant,
    'Free plan signup grant',
    jsonb_build_object('plan_id', 'free', 'period_days', 30)
  );

  return new;
end;
$$;

drop trigger if exists on_profile_created_billing on public.profiles;
create trigger on_profile_created_billing
  after insert on public.profiles
  for each row
  execute function public.handle_new_profile_billing();
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
-- 05 publish_claim: published ebooks, claim links/events, entitlements, progress, exports
-- aligned with types/published-ebook.ts, claim-link.ts, entitlement.ts, reading-progress.ts, export.ts

create table if not exists public.published_ebooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null unique,
  subtitle text,
  author text not null default '',
  cover_color text not null default '#6366f1',
  sections jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  total_readers integer not null default 0
    check (total_readers >= 0),
  active_claims integer not null default 0
    check (active_claims >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_published_ebooks_project_id
  on public.published_ebooks (project_id);
create index if not exists idx_published_ebooks_creator_id
  on public.published_ebooks (creator_id);
create index if not exists idx_published_ebooks_slug
  on public.published_ebooks (slug);
create index if not exists idx_published_ebooks_is_public
  on public.published_ebooks (is_public)
  where is_public = true;

drop trigger if exists published_ebooks_set_updated_at on public.published_ebooks;
create trigger published_ebooks_set_updated_at
  before update on public.published_ebooks
  for each row
  execute function public.set_updated_at();

create table if not exists public.claim_links (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references public.published_ebooks (id) on delete cascade,
  token text not null unique,
  label text not null default '',
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  max_uses integer
    check (max_uses is null or max_uses >= 0),
  used_count integer not null default 0
    check (used_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claim_links_ebook_id on public.claim_links (ebook_id);
create index if not exists idx_claim_links_token on public.claim_links (token);
create index if not exists idx_claim_links_status on public.claim_links (status);

drop trigger if exists claim_links_set_updated_at on public.claim_links;
create trigger claim_links_set_updated_at
  before update on public.claim_links
  for each row
  execute function public.set_updated_at();

create table if not exists public.claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_link_id uuid not null references public.claim_links (id) on delete cascade,
  reader_email text not null,
  status text not null
    check (status in (
      'claimed',
      'already_owned',
      'expired',
      'revoked',
      'limit_reached'
    )),
  created_at timestamptz not null default now()
);

create index if not exists idx_claim_events_claim_link_id
  on public.claim_events (claim_link_id);
create index if not exists idx_claim_events_created_at
  on public.claim_events (created_at desc);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles (id) on delete cascade,
  ebook_id uuid not null references public.published_ebooks (id) on delete cascade,
  claim_link_id uuid references public.claim_links (id) on delete set null,
  -- denormalized for library read perf
  ebook_title text not null default '',
  ebook_slug text not null default '',
  cover_color text not null default '#6366f1',
  author text not null default '',
  created_at timestamptz not null default now(),
  unique (reader_id, ebook_id)
);

create index if not exists idx_entitlements_reader_id on public.entitlements (reader_id);
create index if not exists idx_entitlements_ebook_id on public.entitlements (ebook_id);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles (id) on delete cascade,
  ebook_id uuid not null references public.published_ebooks (id) on delete cascade,
  -- denormalized for library cards
  ebook_title text not null default '',
  cover_color text not null default '#6366f1',
  author text not null default '',
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  current_section integer not null default 0
    check (current_section >= 0),
  total_sections integer not null default 0
    check (total_sections >= 0),
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reader_id, ebook_id)
);

create index if not exists idx_reading_progress_reader_id
  on public.reading_progress (reader_id);
create index if not exists idx_reading_progress_ebook_id
  on public.reading_progress (ebook_id);

drop trigger if exists reading_progress_set_updated_at on public.reading_progress;
create trigger reading_progress_set_updated_at
  before update on public.reading_progress
  for each row
  execute function public.set_updated_at();

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references public.published_ebooks (id) on delete cascade,
  ebook_title text not null default '',
  format text not null
    check (format in ('pdf', 'epub', 'docx')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'complete', 'failed')),
  url text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_exports_ebook_id on public.exports (ebook_id);
create index if not exists idx_exports_status on public.exports (status);
-- 06 RLS: enable + policies for all public tables

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.is_ebook_creator(p_ebook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.published_ebooks e
    where e.id = p_ebook_id
      and e.creator_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.projects enable row level security;
alter table public.project_states enable row level security;
alter table public.messages enable row level security;
alter table public.outlines enable row level security;
alter table public.ebook_sections enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.published_ebooks enable row level security;
alter table public.claim_links enable row level security;
alter table public.claim_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.reading_progress enable row level security;
alter table public.exports enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: select/update own
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- billing: select own only (writes via service role / security definer)
-- ---------------------------------------------------------------------------

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "credit_balances_select_own" on public.credit_balances;
create policy "credit_balances_select_own"
  on public.credit_balances
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own"
  on public.credit_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- project children: project_states, messages, outlines, ebook_sections, generation_jobs
-- ---------------------------------------------------------------------------

-- project_states
drop policy if exists "project_states_select_own" on public.project_states;
create policy "project_states_select_own"
  on public.project_states
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "project_states_insert_own" on public.project_states;
create policy "project_states_insert_own"
  on public.project_states
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "project_states_update_own" on public.project_states;
create policy "project_states_update_own"
  on public.project_states
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "project_states_delete_own" on public.project_states;
create policy "project_states_delete_own"
  on public.project_states
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

-- messages
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

-- outlines
drop policy if exists "outlines_select_own" on public.outlines;
create policy "outlines_select_own"
  on public.outlines
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "outlines_insert_own" on public.outlines;
create policy "outlines_insert_own"
  on public.outlines
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "outlines_update_own" on public.outlines;
create policy "outlines_update_own"
  on public.outlines
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "outlines_delete_own" on public.outlines;
create policy "outlines_delete_own"
  on public.outlines
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

-- ebook_sections
drop policy if exists "ebook_sections_select_own" on public.ebook_sections;
create policy "ebook_sections_select_own"
  on public.ebook_sections
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "ebook_sections_insert_own" on public.ebook_sections;
create policy "ebook_sections_insert_own"
  on public.ebook_sections
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "ebook_sections_update_own" on public.ebook_sections;
create policy "ebook_sections_update_own"
  on public.ebook_sections
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "ebook_sections_delete_own" on public.ebook_sections;
create policy "ebook_sections_delete_own"
  on public.ebook_sections
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

-- generation_jobs
drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
create policy "generation_jobs_select_own"
  on public.generation_jobs
  for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "generation_jobs_insert_own" on public.generation_jobs;
create policy "generation_jobs_insert_own"
  on public.generation_jobs
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "generation_jobs_update_own" on public.generation_jobs;
create policy "generation_jobs_update_own"
  on public.generation_jobs
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "generation_jobs_delete_own" on public.generation_jobs;
create policy "generation_jobs_delete_own"
  on public.generation_jobs
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- published_ebooks: creator full access; public SELECT where is_public
-- ---------------------------------------------------------------------------

drop policy if exists "published_ebooks_select_public_or_creator" on public.published_ebooks;
create policy "published_ebooks_select_public_or_creator"
  on public.published_ebooks
  for select
  to authenticated
  using (is_public = true or creator_id = auth.uid());

drop policy if exists "published_ebooks_select_anon_public" on public.published_ebooks;
create policy "published_ebooks_select_anon_public"
  on public.published_ebooks
  for select
  to anon
  using (is_public = true);

drop policy if exists "published_ebooks_insert_creator" on public.published_ebooks;
create policy "published_ebooks_insert_creator"
  on public.published_ebooks
  for insert
  to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "published_ebooks_update_creator" on public.published_ebooks;
create policy "published_ebooks_update_creator"
  on public.published_ebooks
  for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "published_ebooks_delete_creator" on public.published_ebooks;
create policy "published_ebooks_delete_creator"
  on public.published_ebooks
  for delete
  to authenticated
  using (creator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- claim_links: owner of published ebook (via creator_id)
-- ---------------------------------------------------------------------------

drop policy if exists "claim_links_select_creator" on public.claim_links;
create policy "claim_links_select_creator"
  on public.claim_links
  for select
  to authenticated
  using (public.is_ebook_creator(ebook_id));

drop policy if exists "claim_links_insert_creator" on public.claim_links;
create policy "claim_links_insert_creator"
  on public.claim_links
  for insert
  to authenticated
  with check (public.is_ebook_creator(ebook_id));

drop policy if exists "claim_links_update_creator" on public.claim_links;
create policy "claim_links_update_creator"
  on public.claim_links
  for update
  to authenticated
  using (public.is_ebook_creator(ebook_id))
  with check (public.is_ebook_creator(ebook_id));

drop policy if exists "claim_links_delete_creator" on public.claim_links;
create policy "claim_links_delete_creator"
  on public.claim_links
  for delete
  to authenticated
  using (public.is_ebook_creator(ebook_id));

-- ---------------------------------------------------------------------------
-- claim_events: readable by ebook owner (join claim_links → published_ebooks)
-- ---------------------------------------------------------------------------

drop policy if exists "claim_events_select_ebook_owner" on public.claim_events;
create policy "claim_events_select_ebook_owner"
  on public.claim_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.claim_links cl
      join public.published_ebooks pe on pe.id = cl.ebook_id
      where cl.id = claim_events.claim_link_id
        and pe.creator_id = auth.uid()
    )
  );

-- inserts typically service-role / claim RPC; allow own claim logging via service path only
-- no insert policy for authenticated → service role only

-- ---------------------------------------------------------------------------
-- entitlements: reader select/insert own
-- ---------------------------------------------------------------------------

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using (reader_id = auth.uid());

drop policy if exists "entitlements_insert_own" on public.entitlements;
create policy "entitlements_insert_own"
  on public.entitlements
  for insert
  to authenticated
  with check (reader_id = auth.uid());

-- also allow ebook creator to see who claimed
drop policy if exists "entitlements_select_creator" on public.entitlements;
create policy "entitlements_select_creator"
  on public.entitlements
  for select
  to authenticated
  using (public.is_ebook_creator(ebook_id));

-- ---------------------------------------------------------------------------
-- reading_progress: reader select/insert/update own
-- ---------------------------------------------------------------------------

drop policy if exists "reading_progress_select_own" on public.reading_progress;
create policy "reading_progress_select_own"
  on public.reading_progress
  for select
  to authenticated
  using (reader_id = auth.uid());

drop policy if exists "reading_progress_insert_own" on public.reading_progress;
create policy "reading_progress_insert_own"
  on public.reading_progress
  for insert
  to authenticated
  with check (reader_id = auth.uid());

drop policy if exists "reading_progress_update_own" on public.reading_progress;
create policy "reading_progress_update_own"
  on public.reading_progress
  for update
  to authenticated
  using (reader_id = auth.uid())
  with check (reader_id = auth.uid());

-- ---------------------------------------------------------------------------
-- exports: creator of ebook
-- ---------------------------------------------------------------------------

drop policy if exists "exports_select_creator" on public.exports;
create policy "exports_select_creator"
  on public.exports
  for select
  to authenticated
  using (public.is_ebook_creator(ebook_id));

drop policy if exists "exports_insert_creator" on public.exports;
create policy "exports_insert_creator"
  on public.exports
  for insert
  to authenticated
  with check (public.is_ebook_creator(ebook_id));

drop policy if exists "exports_update_creator" on public.exports;
create policy "exports_update_creator"
  on public.exports
  for update
  to authenticated
  using (public.is_ebook_creator(ebook_id))
  with check (public.is_ebook_creator(ebook_id));

drop policy if exists "exports_delete_creator" on public.exports;
create policy "exports_delete_creator"
  on public.exports
  for delete
  to authenticated
  using (public.is_ebook_creator(ebook_id));
-- 07 spend_credits + grant_credits RPCs (row lock, balance integrity)

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_label text,
  p_meta jsonb default '{}'::jsonb
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_new_balance integer;
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'label required';
  end if;

  -- authenticated may only debit self; service_role unrestricted
  if v_jwt_role is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed to spend credits for another user';
  end if;

  -- lock row for concurrent-safe debit
  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  if v_balance.balance < p_amount then
    raise exception 'insufficient credits';
  end if;

  v_new_balance := v_balance.balance - p_amount;

  update public.credit_balances
  set
    balance = v_new_balance,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    p_user_id,
    'spend',
    -p_amount,
    v_new_balance,
    p_label,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_label text,
  p_meta jsonb default '{}'::jsonb
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_new_balance integer;
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_type is null or p_type not in ('grant', 'purchase', 'refund', 'adjust') then
    raise exception 'invalid credit type: %', p_type;
  end if;

  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'label required';
  end if;

  -- authenticated may only credit self; service_role unrestricted
  if v_jwt_role is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed to grant credits for another user';
  end if;

  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  v_new_balance := v_balance.balance + p_amount;

  update public.credit_balances
  set
    balance = v_new_balance,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    p_user_id,
    p_type,
    p_amount,
    v_new_balance,
    p_label,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

-- revoke execute from public/anon; grant to authenticated + service_role
revoke all on function public.spend_credits(uuid, integer, text, jsonb) from public;
revoke all on function public.grant_credits(uuid, integer, text, text, jsonb) from public;

grant execute on function public.spend_credits(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.spend_credits(uuid, integer, text, jsonb) to service_role;

grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to service_role;
-- authenticated may call grant only via controlled server path; keep service_role primary
-- grant execute to authenticated for refunds from own failed jobs if needed later
grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to authenticated;
