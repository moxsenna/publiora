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
-- Atomic project + state + optional offer/link creation (V3).

create or replace function public.create_project_with_context_v3(
  p_project jsonb,
  p_state jsonb,
  p_readiness_score integer,
  p_existing_offer_id uuid default null,
  p_new_offer jsonb default null,
  p_relationship text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_project public.projects;
  v_score integer;
  v_offer public.offers;
  v_offer_id uuid;
  v_link public.project_offer_links;
  v_snapshot jsonb;
  v_relationship text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_owner := nullif(p_project->>'owner_id', '')::uuid;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'owner_mismatch' using errcode = '42501';
  end if;

  v_score := coalesce(p_readiness_score, 0);
  if v_score < 0 then
    v_score := 0;
  elsif v_score > 100 then
    v_score := 100;
  end if;

  v_relationship := nullif(p_relationship, '');

  -- Resolve or create offer
  if p_existing_offer_id is not null then
    select * into v_offer
    from public.offers o
    where o.id = p_existing_offer_id
      and o.owner_id = v_uid;

    if not found then
      raise exception 'offer_not_found' using errcode = 'P0002';
    end if;

    if v_offer.status = 'archived' then
      raise exception 'offer_archived' using errcode = '22023';
    end if;

    v_offer_id := v_offer.id;
  elsif p_new_offer is not null then
    insert into public.offers (
      owner_id,
      name,
      offer_type,
      ownership,
      status,
      short_description,
      target_audience,
      primary_problem,
      primary_outcome,
      niche,
      destination_url
    )
    values (
      v_uid,
      coalesce(p_new_offer->>'name', ''),
      coalesce(p_new_offer->>'offer_type', 'other'),
      coalesce(p_new_offer->>'ownership', 'owned'),
      'active',
      nullif(p_new_offer->>'short_description', ''),
      nullif(p_new_offer->>'target_audience', ''),
      nullif(p_new_offer->>'primary_problem', ''),
      nullif(p_new_offer->>'primary_outcome', ''),
      nullif(p_new_offer->>'niche', ''),
      nullif(p_new_offer->>'destination_url', '')
    )
    returning * into v_offer;

    v_offer_id := v_offer.id;
  else
    v_offer_id := null;
  end if;

  if v_offer_id is not null and v_relationship is null then
    raise exception 'relationship_required' using errcode = '22023';
  end if;

  if v_offer_id is null and v_relationship is not null then
    raise exception 'offer_required_for_relationship' using errcode = '22023';
  end if;

  insert into public.projects (
    owner_id,
    title,
    author,
    subtitle,
    description,
    audience,
    tone,
    niche,
    ebook_type,
    status,
    template_id,
    progress,
    sections_generated,
    total_sections,
    cover_color,
    cta_goal,
    final_cta,
    cta_url
  )
  values (
    v_uid,
    coalesce(p_project->>'title', ''),
    coalesce(p_project->>'author', ''),
    nullif(p_project->>'subtitle', ''),
    coalesce(p_project->>'description', ''),
    coalesce(p_project->>'audience', ''),
    coalesce(p_project->>'tone', ''),
    coalesce(p_project->>'niche', ''),
    coalesce(nullif(p_project->>'ebook_type', ''), 'lead_magnet'),
    coalesce(nullif(p_project->>'status', ''), 'draft'),
    nullif(p_project->>'template_id', ''),
    coalesce((p_project->>'progress')::integer, 0),
    coalesce((p_project->>'sections_generated')::integer, 0),
    coalesce((p_project->>'total_sections')::integer, 0),
    coalesce(nullif(p_project->>'cover_color', ''), '#6366f1'),
    nullif(p_project->>'cta_goal', ''),
    nullif(p_project->>'final_cta', ''),
    nullif(p_project->>'cta_url', '')
  )
  returning * into v_project;

  insert into public.project_states (
    project_id,
    state_json,
    readiness_score
  )
  values (
    v_project.id,
    coalesce(p_state, '{}'::jsonb),
    v_score
  );

  if v_offer_id is not null then
    -- Rebuild snapshot server-side from offer row
    select * into v_offer from public.offers where id = v_offer_id;

    v_snapshot := jsonb_build_object(
      'version', 1,
      'offer_id', v_offer.id,
      'name', v_offer.name,
      'offer_type', v_offer.offer_type,
      'ownership', v_offer.ownership,
      'short_description', v_offer.short_description,
      'target_audience', v_offer.target_audience,
      'primary_problem', v_offer.primary_problem,
      'primary_outcome', v_offer.primary_outcome,
      'niche', v_offer.niche,
      'destination_url', v_offer.destination_url
    );

    insert into public.project_offer_links (
      project_id,
      offer_id,
      relationship,
      is_primary,
      context_snapshot,
      source_offer_updated_at,
      synced_at
    )
    values (
      v_project.id,
      v_offer_id,
      v_relationship,
      true,
      v_snapshot,
      v_offer.updated_at,
      now()
    )
    returning * into v_link;
  end if;

  return jsonb_build_object(
    'project', to_jsonb(v_project),
    'offer_id', v_offer_id,
    'link_id', v_link.id
  );
end;
$$;

revoke all on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) from public;
grant execute on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) to authenticated;
grant execute on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) to service_role;
-- Store immutable offer context on published ebooks (reader uses snapshot only).

alter table public.published_ebooks
  add column if not exists offer_context jsonb;

comment on column public.published_ebooks.offer_context is
  'Immutable linked offer snapshot at publish time. Reader must not query live offers.';
