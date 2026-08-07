-- 08 signup attribution + lifecycle: acquisition origin, reader→creator
-- activation, marketing consent, and short-lived signup contexts.
--
-- Design notes (see docs/superpowers/plans/...-implementation-plan.md §10-16):
-- - signup_origin is final: once set it is never overwritten by app logic;
-- - lifecycle timestamps are one-shot (coalesce on existing value);
-- - signup_contexts stores only the SHA-256 token hash, never the raw token;
-- - new profiles default to 'unattributed', existing rows are backfilled to
--   'legacy_unknown' — historical origin is never inferred.

-- ---------------------------------------------------------------------------
-- profiles: acquisition + lifecycle columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column signup_origin text,
  add column initial_intent text,
  add column first_claim_link_id uuid
    references public.claim_links (id) on delete set null,
  add column first_claim_ebook_id uuid
    references public.published_ebooks (id) on delete set null,
  add column first_claim_creator_id uuid
    references public.profiles (id) on delete set null,
  add column reader_activated_at timestamptz,
  add column creator_activated_at timestamptz,
  add column creator_subscribed_at timestamptz,
  add column marketing_email_consent boolean not null default false,
  add column marketing_email_consent_at timestamptz,
  add column marketing_email_consent_source text;

alter table public.profiles
  add constraint profiles_signup_origin_check
  check (signup_origin in (
    'unattributed',
    'landing_page',
    'claim_link',
    'direct_app',
    'legacy_unknown',
    'admin_created'
  ));

alter table public.profiles
  add constraint profiles_initial_intent_check
  check (initial_intent in ('reader', 'creator') or initial_intent is null);

alter table public.profiles
  add constraint profiles_marketing_consent_source_check
  check (marketing_email_consent_source in (
    'landing_signup',
    'claim_signup',
    'account_settings',
    'admin_import'
  ) or marketing_email_consent_source is null);

create index if not exists idx_profiles_signup_origin
  on public.profiles (signup_origin);
create index if not exists idx_profiles_reader_activated_at
  on public.profiles (reader_activated_at);
create index if not exists idx_profiles_creator_activated_at
  on public.profiles (creator_activated_at);
create index if not exists idx_profiles_creator_subscribed_at
  on public.profiles (creator_subscribed_at);
create index if not exists idx_profiles_marketing_consent
  on public.profiles (marketing_email_consent)
  where marketing_email_consent = true;

-- ---------------------------------------------------------------------------
-- backfill: never infer historical origin
-- ---------------------------------------------------------------------------

update public.profiles
set signup_origin = 'legacy_unknown'
where signup_origin is null;

-- New profiles start as unattributed; the trigger default below keeps the
-- auth trigger (handle_new_user) untouched.
alter table public.profiles
  alter column signup_origin set default 'unattributed';

-- Known lifecycle backfill (earliest evidence only).
update public.profiles p
set reader_activated_at = first_ent.created_at
from (
  select reader_id, min(created_at) as created_at
  from public.entitlements
  group by reader_id
) first_ent
where p.id = first_ent.reader_id;

update public.profiles p
set creator_activated_at = first_proj.created_at
from (
  select owner_id, min(created_at) as created_at
  from public.projects
  group by owner_id
) first_proj
where p.id = first_proj.owner_id;

update public.profiles p
set creator_subscribed_at = sub.created_at
from public.subscriptions sub
where p.id = sub.user_id
  and sub.plan_id in ('creator', 'pro')
  and sub.status in ('active', 'trialing');

-- ---------------------------------------------------------------------------
-- lifecycle triggers: DB-level so every writer path activates once
-- ---------------------------------------------------------------------------

-- Reader activated on first entitlement.
create or replace function public.activate_reader_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set reader_activated_at = coalesce(reader_activated_at, new.created_at)
  where id = new.reader_id;
  return new;
end;
$$;

drop trigger if exists entitlements_activate_reader_lifecycle on public.entitlements;
create trigger entitlements_activate_reader_lifecycle
  after insert on public.entitlements
  for each row
  execute function public.activate_reader_lifecycle();

-- Creator activated on first project.
create or replace function public.activate_creator_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set creator_activated_at = coalesce(creator_activated_at, new.created_at)
  where id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists projects_activate_creator_lifecycle on public.projects;
create trigger projects_activate_creator_lifecycle
  after insert on public.projects
  for each row
  execute function public.activate_creator_lifecycle();

-- Paid creator: set once when a creator/pro plan is active/trialing.
-- Cancellation does not erase history (coalesce keeps the first value).
create or replace function public.activate_creator_subscription_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_id in ('creator', 'pro')
     and new.status in ('active', 'trialing') then
    update public.profiles
    set creator_subscribed_at = coalesce(creator_subscribed_at, new.created_at)
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_activate_creator_lifecycle on public.subscriptions;
create trigger subscriptions_activate_creator_lifecycle
  after insert or update of plan_id, status on public.subscriptions
  for each row
  execute function public.activate_creator_subscription_lifecycle();

-- ---------------------------------------------------------------------------
-- signup contexts: short-lived, one-time, hash-only
-- ---------------------------------------------------------------------------

create table if not exists public.signup_contexts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  source text not null
    check (source in ('landing_page', 'claim_link')),
  initial_intent text not null
    check (initial_intent in ('reader', 'creator')),
  claim_link_id uuid references public.claim_links (id) on delete set null,
  ebook_id uuid references public.published_ebooks (id) on delete set null,
  source_creator_id uuid references public.profiles (id) on delete set null,
  return_path text,
  expires_at timestamptz not null,
  consumed_by_user_id uuid references public.profiles (id) on delete set null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_signup_contexts_expires_at
  on public.signup_contexts (expires_at);

-- Service role only: no direct anon/authenticated access.
alter table public.signup_contexts enable row level security;
