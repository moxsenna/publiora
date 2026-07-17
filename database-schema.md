# database-schema.md — Publiora MVP

## 1. Overview

Database utama: PostgreSQL.

Core entities:

```txt
auth.users
→ profiles
→ projects
→ project_states
→ outlines
→ ebook_sections
→ published_ebooks
→ claim_links
→ entitlements
→ reading_progress
→ exports


---

2. Profiles

Supabase Auth handles authentication in auth.users.
Do not store password_hash in application tables.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Roles:

user
admin


---

3. User API Keys

create table user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  encrypted_api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, provider)
);

Providers:

gemini


---

4. Projects

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  ebook_type text not null,
  status text not null default 'draft',
  selected_template text default 'minimal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Ebook types:

lead_magnet
bonus_product
sellable_ebook

Statuses:

draft
planning
generating
ready
published
archived

Indexes:

create index idx_projects_user_id on projects(user_id);
create index idx_projects_status on projects(status);


---

5. Project States

Structured strategy state dari chat agent.

create table project_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  state_json jsonb not null default '{}',
  conversation_summary text,
  readiness_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Index:

create index idx_project_states_json on project_states using gin(state_json);


---

6. Messages

create table messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

Roles:

user
assistant
system

Index:

create index idx_messages_project_id on messages(project_id);


---

7. Outlines

create table outlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  outline_json jsonb not null,
  is_approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


---

8. Ebook Sections

Stores generated section-level content.

create table ebook_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id text not null,
  chapter_title text not null,
  section_id text not null,
  section_title text not null,
  content_json jsonb not null default '{}',
  status text not null default 'pending',
  sort_order int not null,
  word_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(project_id, section_id)
);

Statuses:

pending
generating
completed
failed

Indexes:

create index idx_ebook_sections_project_id on ebook_sections(project_id);
create index idx_ebook_sections_status on ebook_sections(status);


---

9. Generation Jobs

create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  job_type text not null,
  target_id text,
  status text not null default 'queued',
  attempts int not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Job types:

outline
section
enhancement
publish
pdf_export

Statuses:

queued
running
completed
failed
paused

Indexes:

create index idx_generation_jobs_project_id on generation_jobs(project_id);
create index idx_generation_jobs_status on generation_jobs(status);


---

10. Published Ebooks

create table published_ebooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  description text,
  visibility text not null default 'claim_required',
  published_html text not null,
  content_snapshot jsonb not null default '{}',
  version int not null default 1,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Visibility:

public
private
claim_required

Indexes:

create index idx_published_ebooks_creator_id on published_ebooks(creator_id);
create index idx_published_ebooks_slug on published_ebooks(slug);
create index idx_published_ebooks_visibility on published_ebooks(visibility);


---

11. Claim Links

create table claim_links (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references published_ebooks(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  token text unique not null,
  name text not null,
  max_claims int,
  claim_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

Indexes:

create index idx_claim_links_token on claim_links(token);
create index idx_claim_links_ebook_id on claim_links(ebook_id);
create index idx_claim_links_creator_id on claim_links(creator_id);


---

12. Claim Events

create table claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_link_id uuid not null references claim_links(id) on delete cascade,
  ebook_id uuid not null references published_ebooks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),

  unique(claim_link_id, user_id)
);

Indexes:

create index idx_claim_events_user_id on claim_events(user_id);
create index idx_claim_events_ebook_id on claim_events(ebook_id);


---

13. Entitlements

Controls ebook access.

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ebook_id uuid not null references published_ebooks(id) on delete cascade,
  source text not null,
  created_at timestamptz not null default now(),

  unique(user_id, ebook_id)
);

Sources:

claim_link
manual_grant
public
purchase_future

Indexes:

create index idx_entitlements_user_id on entitlements(user_id);
create index idx_entitlements_ebook_id on entitlements(ebook_id);


---

14. Reading Progress

create table reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ebook_id uuid not null references published_ebooks(id) on delete cascade,
  current_chapter_id text,
  progress_percent int not null default 0,
  updated_at timestamptz not null default now(),

  unique(user_id, ebook_id)
);

Indexes:

create index idx_reading_progress_user_id on reading_progress(user_id);


---

15. Exports

create table exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  export_type text not null default 'pdf',
  file_url text,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

Statuses:

queued
processing
completed
failed

Indexes:

create index idx_exports_project_id on exports(project_id);
create index idx_exports_user_id on exports(user_id);


---

16. Templates

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  css_config jsonb not null default '{}',
  preview_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

Initial templates:

minimal
editorial
business
premium-dark


---

17. Access Rules

Reader can access ebook if:

ebook.visibility = public
OR user owns project
OR user has entitlement

Claim page behavior:

claim link invalid → reject
claim link inactive → reject
claim link expired → reject
max claims reached → reject
already claimed → allow and redirect library
valid claim → create entitlement


---

18. Recommended Enum Validation

Use app-level validation or PostgreSQL check constraints.

Example:

alter table projects
add constraint projects_ebook_type_check
check (ebook_type in ('lead_magnet', 'bonus_product', 'sellable_ebook'));

Recommended check constraints:

projects.ebook_type

projects.status

published_ebooks.visibility

generation_jobs.status

generation_jobs.job_type

messages.role

exports.status



---

19. Data Lifecycle

When project deleted:

project state deleted

messages deleted

outline deleted

sections deleted

jobs deleted

exports deleted


When published ebook deleted:

claim links deleted

claim events deleted

entitlements deleted

reading progress deleted



---

20. MVP Notes

Keep database simple.

Do not add marketplace tables yet.

Not MVP:

payments

creator stores

reviews

ratings

affiliate tracking

webhook integrations

advanced analytics
