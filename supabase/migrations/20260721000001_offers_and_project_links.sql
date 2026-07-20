-- Offers library + project–offer links (snapshot-stable relationships)

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  name text not null,
  offer_type text not null,
  ownership text not null,
  status text not null default 'active',

  short_description text,
  target_audience text,
  primary_problem text,
  primary_outcome text,
  niche text,
  destination_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offers_name_length
    check (char_length(trim(name)) between 1 and 160),

  constraint offers_offer_type_check
    check (offer_type in (
      'digital_product',
      'course',
      'service',
      'saas',
      'membership',
      'webinar',
      'physical_product',
      'affiliate_product',
      'other'
    )),

  constraint offers_ownership_check
    check (ownership in ('owned', 'affiliate', 'client')),

  constraint offers_status_check
    check (status in ('active', 'archived')),

  constraint offers_description_length
    check (short_description is null or char_length(short_description) <= 2000),

  constraint offers_audience_length
    check (target_audience is null or char_length(target_audience) <= 1000),

  constraint offers_problem_length
    check (primary_problem is null or char_length(primary_problem) <= 1000),

  constraint offers_outcome_length
    check (primary_outcome is null or char_length(primary_outcome) <= 1000),

  constraint offers_niche_length
    check (niche is null or char_length(niche) <= 300),

  constraint offers_url_length
    check (destination_url is null or char_length(destination_url) <= 2000)
);

create index if not exists offers_owner_status_idx
  on public.offers (owner_id, status, updated_at desc);

create index if not exists offers_owner_name_idx
  on public.offers (owner_id, lower(name));

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_offer_links
-- ---------------------------------------------------------------------------

create table if not exists public.project_offer_links (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects (id)
    on delete cascade,

  offer_id uuid not null
    references public.offers (id)
    on delete restrict,

  relationship text not null,
  is_primary boolean not null default false,

  context_snapshot jsonb not null,
  source_offer_updated_at timestamptz not null,
  synced_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_offer_relationship_check
    check (relationship in (
      'promotes',
      'bonus_for',
      'bundle_component',
      'upsells_to',
      'cross_sells_to'
    )),

  constraint project_offer_unique_relation
    unique (project_id, offer_id, relationship)
);

create unique index if not exists project_offer_one_primary_idx
  on public.project_offer_links (project_id)
  where is_primary = true;

create index if not exists project_offer_offer_idx
  on public.project_offer_links (offer_id, created_at desc);

drop trigger if exists project_offer_links_set_updated_at on public.project_offer_links;
create trigger project_offer_links_set_updated_at
  before update on public.project_offer_links
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.offers enable row level security;
alter table public.project_offer_links enable row level security;

-- offers: owner-only CRUD (archive via update)
drop policy if exists "offers_select_own" on public.offers;
create policy "offers_select_own"
  on public.offers
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "offers_insert_own" on public.offers;
create policy "offers_insert_own"
  on public.offers
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "offers_update_own" on public.offers;
create policy "offers_update_own"
  on public.offers
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "offers_delete_own" on public.offers;
create policy "offers_delete_own"
  on public.offers
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- project_offer_links: both project and offer must belong to caller
drop policy if exists "project_offer_links_select_own" on public.project_offer_links;
create policy "project_offer_links_select_own"
  on public.project_offer_links
  for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "project_offer_links_insert_own" on public.project_offer_links;
create policy "project_offer_links_insert_own"
  on public.project_offer_links
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "project_offer_links_update_own" on public.project_offer_links;
create policy "project_offer_links_update_own"
  on public.project_offer_links
  for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "project_offer_links_delete_own" on public.project_offer_links;
create policy "project_offer_links_delete_own"
  on public.project_offer_links
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.owner_id = auth.uid()
    )
  );
