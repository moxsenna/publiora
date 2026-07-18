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
