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
