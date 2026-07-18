# Publiora Full MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti mock layer dengan stack production (Supabase Auth/Postgres/Storage + platform AI + credits) sampai core loop `Create → Chat → Outline → Generate sections → Publish → Claim → Read` berfungsi end-to-end tanpa mock data.

**Architecture:** Next.js 16 App Router (sudah ada UI mock) memanggil Route Handlers di `app/api/**` yang memakai Supabase server client + service role untuk AI/billing. AI provider keys hanya di server env. Kredit di-charge atomic di DB sebelum job generation. Jobs disimpan di `generation_jobs` dan dipoll client via TanStack Query. Frontend tetap pakai hooks di `lib/api/hooks.ts` — ganti implementasi dari `lib/mock/api` ke `lib/api/client` HTTP.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind v4, Zustand, TanStack Query, TipTap, Supabase (Auth/Postgres/Storage/RLS), Zod, Vitest, Cloudflare Pages via OpenNext (deploy later).

**References (baca sebelum coding):**
- `docs/prd.md`, `docs/mvp-scope.md`, `docs/architecture.md`
- `docs/database-schema.md`, `docs/api-spec.md`, `docs/ai-prompts.md`
- `docs/claim-link-spec.md`, `docs/user-flows.md`
- UI existing: `app/(app)/**`, `components/**`, `lib/mock/**`, `lib/api/hooks.ts`

**Out of scope MVP (jangan kerjakan di plan ini):** multi-provider BYOK, Redis/BullMQ, Playwright PDF, autonomous multi-agent, mobile native, payment gateway production (Stripe webhook bisa stub dulu).

---

## Current State (baseline)

| Layer | Status |
|---|---|
| UI full screens (marketing, auth, dashboard, workspace, reader, claim, billing) | Done (mock) |
| Types domain | Done |
| `lib/mock/*` in-memory API + seed | Done |
| `lib/api/hooks.ts` wraps mock | Done |
| Supabase browser/server client skeleton | Partial (`lib/supabase/*`, `.env.local` URL+anon) |
| DB migrations / RLS | Missing (`supabase/` folder belum ada) |
| Route Handlers `app/api/**` | Missing |
| Real AI generation | Missing |
| Real auth session → UI | Partial (mock `authStore` override) |

---

## Target File Map

```txt
supabase/
  config.toml
  migrations/
    20260718000001_profiles.sql
    20260718000002_billing.sql
    20260718000003_projects.sql
    20260718000004_generation.sql
    20260718000005_publish_claim.sql
    20260718000006_rls.sql
  seed.sql                          # optional demo after auth user exists

lib/
  supabase/                         # keep, harden
  env.ts                            # zod-validated env
  db/types.ts                       # generated or hand types matching SQL
  credits.ts                        # charge/refund helpers (server-only)
  ai/
    provider.ts                     # Gemini (or OpenAI) server client
    agents/
      strategist.ts
      planner.ts
      writer.ts
      enhancement.ts
      title.ts
      cta.ts
    prompts.ts                      # load from docs/ai-prompts.md concepts
  api/
    client.ts                       # fetch wrapper → /api/*
    hooks.ts                        # MODIFY: call client, not mock
    keys.ts                         # keep
    errors.ts                       # map API error codes
  mock/                             # keep until Phase 8; then delete or flag MOCK_MODE

app/api/
  auth/me/route.ts
  projects/route.ts
  projects/[id]/route.ts
  projects/[id]/chat/route.ts
  projects/[id]/messages/route.ts
  projects/[id]/outline/route.ts
  projects/[id]/outline/generate/route.ts
  projects/[id]/outline/approve/route.ts
  projects/[id]/sections/route.ts
  projects/[id]/sections/generate/route.ts
  projects/[id]/sections/[sectionId]/route.ts
  projects/[id]/publish/route.ts
  projects/[id]/titles/route.ts
  projects/[id]/ctas/route.ts
  billing/balance/route.ts
  billing/plans/route.ts
  billing/packs/route.ts
  billing/change-plan/route.ts
  billing/purchase-pack/route.ts
  billing/transactions/route.ts
  claim/[token]/route.ts
  published/[id]/route.ts
  published/by-slug/[slug]/route.ts
  library/route.ts
  reading-progress/route.ts
  jobs/[id]/route.ts

middleware.ts or proxy.ts           # Next 16: follow node_modules/next/dist/docs for auth session refresh
```

---

## Phase Overview

| Phase | Nama | Outcome testable |
|---|---|---|
| 0 | Hardening & env | `tsc` + `next build` green; env schema |
| 1 | Database + RLS | Migrations apply; RLS blocks cross-user |
| 2 | Real Auth | Register/login via Supabase; mock auth off |
| 3 | Projects CRUD API | Dashboard/projects live from DB |
| 4 | Billing credits | Balance, change plan, top-up mock payment, charge helper |
| 5 | Chat + Outline AI | Strategist chat + planner outline + approve + credit |
| 6 | Section generation | Jobs + poll + writer + TipTap save |
| 7 | Publish + claim + library + reader | Full distribution loop |
| 8 | Cutover mock → live | Hooks default to HTTP; mock behind flag |
| 9 | Polish, errors, E2E, deploy checklist | Production-ready MVP |

Implement **phase order**. Jangan loncat AI sebelum auth+projects+credits.

---

## Phase 0 — Hardening & Environment

### Task 0.1: Env schema

**Files:**
- Create: `lib/env.ts`
- Create: `.env.example`
- Modify: `.gitignore` (ensure `.env*.local` ignored)

- [ ] **Step 1: Add env module**

```ts
// lib/env.ts
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(10).optional(),
  OPENAI_API_KEY: z.string().min(10).optional(),
  CREDITS_MOCK_TOPUP: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  USE_MOCK_API: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  if (parsed.data.AI_PROVIDER === "gemini" && !parsed.data.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY required when AI_PROVIDER=gemini");
  }
  if (parsed.data.AI_PROVIDER === "openai" && !parsed.data.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY required when AI_PROVIDER=openai");
  }
  return parsed.data;
}

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
```

- [ ] **Step 2: Write `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AI_PROVIDER=gemini
GEMINI_API_KEY=
OPENAI_API_KEY=
CREDITS_MOCK_TOPUP=true
USE_MOCK_API=false
```

- [ ] **Step 3: Commit**

```bash
git add lib/env.ts .env.example
git commit -m "chore: add validated server env schema"
```

### Task 0.2: Baseline verification

- [ ] **Step 1: Typecheck & build**

```bash
npx tsc --noEmit
npx next build
```

Expected: exit 0 (fix any pre-existing errors first).

- [ ] **Step 2: Commit fixes only if needed**

```bash
git add -A
git commit -m "fix: baseline typecheck/build green before backend cutover"
```

---

## Phase 1 — Database Migrations

### Task 1.1: Init Supabase local tooling

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Create: migrations listed below

- [ ] **Step 1: Init**

```bash
npx supabase init
```

- [ ] **Step 2: Link project (remote)**

```bash
npx supabase link --project-ref <PROJECT_REF>
```

### Task 1.2: Migration — profiles

**Files:**
- Create: `supabase/migrations/20260718000001_profiles.sql`

- [ ] **Step 1: Write migration**

```sql
-- profiles: 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan_id text not null default 'free' check (plan_id in ('free', 'creator', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Apply**

```bash
npx supabase db push
```

Expected: success, table `profiles` exists.

### Task 1.3: Migration — billing

**Files:**
- Create: `supabase/migrations/20260718000002_billing.sql`

- [ ] **Step 1: Write migration** (align with `docs/database-schema.md` §3 + `types/billing.ts`)

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'creator', 'pro')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  renews_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'creator', 'pro')),
  balance int not null default 0 check (balance >= 0),
  period_grant int not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  lifetime_spent int not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('grant', 'purchase', 'spend', 'refund', 'adjust')),
  amount int not null,
  balance_after int not null,
  label text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_credit_tx_user on public.credit_transactions(user_id, created_at desc);

-- Free plan grant on signup
create or replace function public.init_billing_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  period_end timestamptz := now() + interval '30 days';
begin
  insert into public.subscriptions (user_id, plan_id, status, renews_at)
  values (new.id, 'free', 'active', period_end);

  insert into public.credit_balances (
    user_id, plan_id, balance, period_grant, period_start, period_end, lifetime_spent
  ) values (new.id, 'free', 50, 50, now(), period_end, 0);

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, label
  ) values (new.id, 'grant', 50, 50, 'Free plan — kredit bulanan');

  return new;
end;
$$;

drop trigger if exists on_profile_billing_init on public.profiles;
create trigger on_profile_billing_init
  after insert on public.profiles
  for each row execute function public.init_billing_for_user();
```

- [ ] **Step 2: Apply & verify**

```bash
npx supabase db push
# In SQL editor: select * from credit_balances limit 1; -- empty until user signup
```

### Task 1.4: Migration — projects domain

**Files:**
- Create: `supabase/migrations/20260718000003_projects.sql`

Include tables matching UI types (simplify schema docs where conflict — **prefer frontend types** for MVP consistency):

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author text not null default '',
  subtitle text,
  description text not null default '',
  audience text not null default '',
  tone text not null default '',
  niche text not null default '',
  status text not null default 'draft' check (status in (
    'draft','outline_draft','approved','generating','generated','publishing','published','failed'
  )),
  template_id text,
  progress int not null default 0 check (progress between 0 and 100),
  sections_generated int not null default 0,
  total_sections int not null default 0,
  cover_color text not null default '#0A0A0A',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_owner on public.projects(owner_id, updated_at desc);

create table public.project_states (
  project_id uuid primary key references public.projects(id) on delete cascade,
  state_json jsonb not null default '{}',
  readiness_score int not null default 0 check (readiness_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  agent text check (agent in ('strategist','planner','writer','enhancement','title','cta') or agent is null),
  created_at timestamptz not null default now()
);

create index idx_messages_project on public.messages(project_id, created_at);
```

- [ ] Apply with `npx supabase db push`

### Task 1.5: Migration — generation

**Files:**
- Create: `supabase/migrations/20260718000004_generation.sql`

```sql
create table public.outlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  sections jsonb not null default '[]', -- OutlineSection[]
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ebook_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  outline_section_id text not null,
  position int not null,
  title text not null,
  content_html text not null default '',
  word_count int not null default 0,
  status text not null default 'pending'
    check (status in ('pending','generating','generated','failed','edited')),
  updated_at timestamptz not null default now(),
  unique (project_id, outline_section_id)
);

create index idx_sections_project on public.ebook_sections(project_id, position);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_type text not null check (job_type in (
    'outline','section','enhancement','title','cta','publish','pdf_export'
  )),
  target_id text,
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed','paused')),
  attempts int not null default 0,
  error_message text,
  result jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_jobs_project on public.generation_jobs(project_id, created_at desc);
create index idx_jobs_status on public.generation_jobs(status);
```

### Task 1.6: Migration — publish / claim / library

**Files:**
- Create: `supabase/migrations/20260718000005_publish_claim.sql`

Tables: `published_ebooks`, `claim_links`, `claim_events`, `entitlements`, `reading_progress`, `exports` — mirror `types/*` + `docs/database-schema.md` §10–14. Use:

- `published_ebooks.slug` unique
- `claim_links.token` unique uppercased
- `entitlements` unique `(reader_id, ebook_id)` where `reader_id` = profile id or email for guest MVP (prefer **auth user id** for library)

### Task 1.7: RLS policies

**Files:**
- Create: `supabase/migrations/20260718000006_rls.sql`

Rules:
- Enable RLS all public tables
- `profiles`: select/update own row
- `projects` + children: owner_id = auth.uid()
- `published_ebooks`: owner full; public select if `is_public` or via entitlement
- `claim_links`: owner of ebook only for write; resolve via service role in claim route
- `credit_*` / `subscriptions`: select own; **writes only service role** (no client insert spend)

```sql
alter table public.projects enable row level security;

create policy projects_owner_all on public.projects
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

Repeat pattern for messages, outlines, ebook_sections, generation_jobs.

- [ ] **Step: Test RLS**

```sql
-- as user A create project; as user B select should return 0 rows
```

- [ ] Commit migrations

```bash
git add supabase
git commit -m "feat(db): profiles, billing, projects, generation, publish, RLS"
```

---

## Phase 2 — Real Auth

### Task 2.1: Server helpers

**Files:**
- Modify: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`
- Create: `lib/supabase/admin.ts` (service role, server-only)

```ts
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] Read Next 16 docs in `node_modules/next/dist/docs/` for session cookies / proxy vs middleware before wiring.

### Task 2.2: Replace mock authStore with Supabase session

**Files:**
- Modify: `store/authStore.ts`
- Modify: `components/auth/AuthInitializer.tsx`
- Modify: `components/auth/LoginForm.tsx`, `RegisterForm.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Auth store uses Supabase client**

`signIn` → `supabase.auth.signInWithPassword`  
`signUp` → `supabase.auth.signUp({ email, password, options: { data: { name } } })`  
`signOut` → `supabase.auth.signOut`  
`initFromStorage` → `getSession` + `onAuthStateChange` + fetch `profiles` row

- [ ] **Step 2: Remove demo-only “any password” path** (keep optional demo button only if env `NEXT_PUBLIC_DEMO_LOGIN=true`)

- [ ] **Step 3: Manual test**

```bash
npm run dev
# register new user → row in profiles + credit_balances balance=50
# logout → /dashboard redirects /login
# login → dashboard
```

- [ ] Commit: `feat(auth): wire Supabase email/password session`

### Task 2.3: Session refresh middleware/proxy

**Files:**
- Create/modify root proxy or middleware per Next 16 docs (AGENTS.md warning)

- [ ] Refresh auth cookies on each request for protected routes: `/dashboard`, `/projects`, `/library`, `/settings/*`, `/published/*`

- [ ] Commit: `feat(auth): session refresh on protected routes`

---

## Phase 3 — Projects API + UI cutover

### Task 3.1: HTTP client

**Files:**
- Create: `lib/api/client.ts`
- Create: `lib/api/errors.ts`

```ts
// lib/api/client.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? res.statusText, body?.error?.code, res.status);
  }
  return body as T;
}
```

### Task 3.2: Projects route handlers

**Files:**
- Create: `app/api/projects/route.ts` (GET list, POST create)
- Create: `app/api/projects/[id]/route.ts` (GET, PATCH, DELETE)

Pattern for every route:

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json(data);
}
```

Map DB snake_case ↔ UI types (same names already snake_case in `types/project.ts`).

- [ ] Manual: create project via curl with session cookie or from UI after hooks switch.

### Task 3.3: Switch hooks for projects only

**Files:**
- Modify: `lib/api/hooks.ts` — `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject` call `/api/projects`

```ts
queryFn: () => apiFetch<Project[]>("/api/projects"),
```

Keep other hooks on mock until their phase (or use `USE_MOCK_API` branch).

```ts
import * as mock from "@/lib/mock/api";
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
```

Prefer **server env only for AI**; for client hook routing use `NEXT_PUBLIC_USE_MOCK_API`.

- [ ] Test UI dashboard + projects list against real DB
- [ ] Commit: `feat(projects): REST API + hooks live path`

---

## Phase 4 — Billing live

### Task 4.1: Credit charge helper (server)

**Files:**
- Create: `lib/credits.ts`

```ts
// lib/credits.ts — service role only
import { createAdminClient } from "@/lib/supabase/admin";

export const CREDIT_COSTS = {
  outline: 5,
  section: 10,
  title: 2,
  cta: 2,
  publish: 0,
} as const;

export type CreditKind = keyof typeof CREDIT_COSTS;

export async function chargeCredits(opts: {
  userId: string;
  amount: number;
  label: string;
  meta?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  // Use SQL function for atomicity (add in migration):
  // select * from public.spend_credits(user_id, amount, label, meta)
  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: opts.userId,
    p_amount: opts.amount,
    p_label: opts.label,
    p_meta: opts.meta ?? {},
  });
  if (error) {
    if (error.message.includes("insufficient")) {
      throw Object.assign(new Error("Kredit tidak cukup. Upgrade plan atau beli top-up."), {
        code: "insufficient_credits",
      });
    }
    throw error;
  }
  return data;
}
```

- [ ] **Step: Add RPC migration** `spend_credits` that locks row `credit_balances`, checks balance, updates, inserts txn — single transaction.

```sql
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount int,
  p_label text,
  p_meta jsonb default '{}'
) returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  bal public.credit_balances;
begin
  if p_amount < 0 then
    raise exception 'amount must be >= 0';
  end if;

  select * into bal from public.credit_balances where user_id = p_user_id for update;
  if not found then
    raise exception 'balance not found';
  end if;
  if bal.balance < p_amount then
    raise exception 'insufficient credits';
  end if;

  update public.credit_balances
    set balance = balance - p_amount,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = now()
    where user_id = p_user_id
    returning * into bal;

  insert into public.credit_transactions(user_id, type, amount, balance_after, label, meta)
  values (p_user_id, 'spend', -p_amount, bal.balance, p_label, p_meta);

  return bal;
end;
$$;
```

### Task 4.2: Billing routes

**Files:**
- Create: `app/api/billing/balance/route.ts`
- Create: `app/api/billing/transactions/route.ts`
- Create: `app/api/billing/plans/route.ts` (static from code constant)
- Create: `app/api/billing/packs/route.ts`
- Create: `app/api/billing/change-plan/route.ts`
- Create: `app/api/billing/purchase-pack/route.ts` (if `CREDITS_MOCK_TOPUP`, grant credits without Stripe)

Plans constant (single source of truth):

```ts
// lib/billing/plans.ts
export const BILLING_PLANS = [ /* free 50, creator 500 $19, pro 2000 $49 — same as seed */ ];
export const CREDIT_PACKS = [ /* 100/$5, 500/$20, 1500/$49 */ ];
```

- [ ] Switch billing hooks to `/api/billing/*`
- [ ] Manual test: change plan free→creator grants 500; top-up +100; generate later spends
- [ ] Commit: `feat(billing): credits RPC + billing API routes`

---

## Phase 5 — Chat + Outline AI

### Task 5.1: AI provider wrapper

**Files:**
- Create: `lib/ai/provider.ts`
- Create: `lib/ai/prompts.ts` (system prompts condensed from `docs/ai-prompts.md`)
- Create: `lib/ai/agents/strategist.ts`, `planner.ts`

```ts
// lib/ai/provider.ts
import { getServerEnv } from "@/lib/env";

export async function completeJson<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
}): Promise<T> {
  const env = getServerEnv();
  // Gemini generateContent with responseMimeType application/json
  // OR OpenAI chat.completions with response_format json
  // throw on provider errors with code PROVIDER_ERROR
}
```

Constraints from docs:
- Max ~10 chapters, ~6 sections/chapter
- Section-by-section only
- No full-ebook single shot

### Task 5.2: Chat API

**Files:**
- Create: `app/api/projects/[id]/messages/route.ts` GET
- Create: `app/api/projects/[id]/chat/route.ts` POST

POST flow:
1. Auth + ownership check
2. Insert user message
3. Load recent messages + project + project_states
4. Call strategist agent
5. Update `project_states.state_json` + readiness_score
6. Insert assistant message
7. Return assistant message

- [ ] Switch `useMessages` / `useSendMessage` hooks
- [ ] Test chat updates messages table

### Task 5.3: Outline generate + approve

**Files:**
- Create: `app/api/projects/[id]/outline/route.ts` GET/PATCH
- Create: `app/api/projects/[id]/outline/generate/route.ts` POST
- Create: `app/api/projects/[id]/outline/approve/route.ts` POST

Generate flow:
1. Auth + owner
2. Conflict if outline exists
3. `chargeCredits({ amount: 5, label: 'Generate outline', meta: { project_id } })`
4. Call planner agent → sections JSON
5. Insert outline, set project `outline_draft`, `total_sections`
6. On planner failure: **refund** via `refund_credits` RPC (add migration)

Approve: set approved, project status `approved`.

- [ ] Wire outline hooks
- [ ] Test: balance 50 → generate outline → 45; approve → status approved
- [ ] Commit: `feat(ai): strategist chat + planner outline with credit charge`

---

## Phase 6 — Section generation + editor

### Task 6.1: Section generate job

**Files:**
- Create: `app/api/projects/[id]/sections/generate/route.ts` POST body `{ outline_section_id }` or `{ all: true }`
- Create: `app/api/jobs/[id]/route.ts` GET
- Create: `lib/ai/agents/writer.ts`
- Create: `lib/generation/runSectionJob.ts`

Recommended MVP approach (simpler than separate worker):

**Inline async job record:**
1. Create `generation_jobs` row `queued`
2. Charge 10 credits
3. Set status `running`, generate with writer
4. Upsert `ebook_sections`, update outline section status in JSON
5. Update project counters; if all done → `generated`
6. Job `completed` or `failed` (+ refund on fail before content saved)

For multi-section "generate all": sequential server loop OR client loops single-section endpoint (prefer **client loop** calling single endpoint — easier progress UI).

### Task 6.2: Sections list + PATCH

**Files:**
- Create: `app/api/projects/[id]/sections/route.ts` GET
- Create: `app/api/projects/[id]/sections/[sectionId]/route.ts` PATCH

PATCH saves TipTap HTML, sets status `edited`.

- [ ] Switch section hooks; remove mock delays
- [ ] Test regenerate charges again; edit does not charge
- [ ] Commit: `feat(ai): section writer generation + editor save`

### Task 6.3: Title + CTA routes

**Files:**
- Create: `app/api/projects/[id]/titles/route.ts`
- Create: `app/api/projects/[id]/ctas/route.ts`

Charge 2 each; return string arrays.

- [ ] Wire ToolsPanel to live API
- [ ] Commit: `feat(ai): title and CTA generators`

---

## Phase 7 — Publish, claim, library, reader

### Task 7.1: Publish

**Files:**
- Create: `app/api/projects/[id]/publish/route.ts`

Flow:
1. Require ≥1 section `generated|edited`
2. Snapshot sections into `published_ebooks` (json or join table — MVP: `sections jsonb`)
3. slug = slugify(title)+shortid
4. project status `published`
5. Return published ebook

- [ ] Wire `usePublishEbook`
- [ ] Test redirect to `/published/[id]`

### Task 7.2: Claim links CRUD

**Files:**
- Create: `app/api/published/[id]/claim-links/route.ts` GET/POST
- Create: `app/api/claim-links/[id]/route.ts` PATCH revoke / DELETE
- Create: `app/api/claim-links/[id]/events/route.ts` GET

Token: `encodeURIComponent` safe uppercase random 12–16 chars.

### Task 7.3: Claim resolve

**Files:**
- Create: `app/api/claim/[token]/route.ts` POST `{ }` uses auth user
- Modify: `components/claim/ClaimPage.tsx` to hit API

Flow (align `docs/claim-link-spec.md`):
1. Lookup token
2. Check revoked/expired/max_uses
3. If entitlement exists → `already_owned`
4. Else insert entitlement, increment used_count, log event, bump readers
5. Return ebook slug for redirect `/read/[slug]`

### Task 7.4: Library + reading progress

**Files:**
- Create: `app/api/library/route.ts`
- Create: `app/api/reading-progress/route.ts` GET/PATCH
- Create: `app/api/published/by-slug/[slug]/route.ts` GET (entitlement or public check)

- [ ] Wire library + reader progress hooks
- [ ] Test full loop with two browsers (creator + reader accounts)
- [ ] Commit: `feat(distribution): publish, claim links, library, reader progress`

---

## Phase 8 — Cutover & delete mock dependency

### Task 8.1: Default live API

**Files:**
- Modify: `lib/api/hooks.ts` — all hooks use `apiFetch`
- Modify: `lib/mock/*` — only imported when `NEXT_PUBLIC_USE_MOCK_API=true`

### Task 8.2: Remove dead mock paths from critical UX

- [ ] Ensure login never uses mock profile when live
- [ ] Seed data only via SQL optional `supabase/seed.sql` for staging
- [ ] Delete or quarantine mock from production build:

```ts
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
  throw new Error("Mock API cannot run in production");
}
```

- [ ] Commit: `refactor(api): cutover hooks from mock to HTTP`

---

## Phase 9 — Hardening for “sempurna”

### Task 9.1: Error UX

**Files:**
- Modify workspace panels to handle `insufficient_credits` → toast + link `/settings/billing`
- Modify generate buttons disabled state when balance < cost (fetch `useCreditBalance` + `CREDIT_COSTS`)

### Task 9.2: Enforce outline approval

**Files:**
- Modify: section generate route — reject if `!outline.approved` with code `outline_not_approved`
- Modify: SectionsPanel empty state CTA “Approve outline dulu”

### Task 9.3: Idempotency & double-charge guard

- [ ] Section generate: if status already `generating`, return existing job
- [ ] Unique job per `(project_id, job_type, target_id, status in queued|running)` partial index optional

### Task 9.4: Security checklist

- [ ] No service role key in client bundles (`grep -r SERVICE_ROLE app components`)
- [ ] RLS verified with two users
- [ ] Sanitize HTML on write (`sanitize-html` or isomorphic DOMPurify) before save section/publish
- [ ] Rate limit claim endpoint (simple IP throttle in memory or Upstash later)

### Task 9.5: Tests

**Files:**
- Create: `__tests__/credits/spend.test.ts` (unit against RPC with local supabase or pure function extract)
- Create: `__tests__/api/projects.auth.test.ts` if possible
- Fix: pure-rand install for existing auth property tests (`npm i pure-rand`)

```bash
npm test
npx tsc --noEmit
npx next build
```

### Task 9.6: E2E manual script (Definition of Done MVP)

Run and check every box:

- [ ] Register user A → 50 credits
- [ ] Create project
- [ ] Chat strategist ≥ 2 turns
- [ ] Generate outline → credits 45
- [ ] Edit outline + approve
- [ ] Generate all sections → credits decrease by 10×N
- [ ] Edit one section in TipTap + save
- [ ] Title + CTA generate
- [ ] Preview OK
- [ ] Publish → slug works
- [ ] Create claim link
- [ ] User B register → claim → library has ebook → read → progress saves
- [ ] User A sees claim event + reader count
- [ ] Top-up mock pack increases balance
- [ ] Change plan updates grant
- [ ] Insufficient credits: set balance 0 via SQL, generate fails with clear UI
- [ ] User B cannot GET user A project by id (404/empty)

### Task 9.7: Deploy checklist (Cloudflare + Supabase)

- [ ] Set env secrets on Cloudflare Pages / OpenNext
- [ ] Supabase redirect URLs for production domain
- [ ] `npm run deploy` after `npm run build` green
- [ ] Smoke test production claim link

- [ ] Final commit: `chore: mvp production-ready checklist complete`

---

## Credit & Status Invariants (do not violate)

1. **Charge before side effects that call AI** (or charge in same DB transaction as job start).
2. **Refund only if AI failed and no section content committed.**
3. **Never delete completed sections** on rate limit / credit fail.
4. Project status transitions only:
   `draft → outline_draft → approved → generating ⇄ generated → publishing → published`
5. Publish requires ≥1 section content.
6. Claim is idempotent per `(reader, ebook)`.

---

## Suggested Execution Order for Agents

1. Phase 0–1 (env + DB) — no UI break  
2. Phase 2 (auth) — login becomes real  
3. Phase 3 (projects) — dashboard real  
4. Phase 4 (billing) — billing page real  
5. Phase 5–6 (AI) — workspace real  
6. Phase 7 (distribution) — moat loop real  
7. Phase 8–9 — cutover + harden  

Each phase ends with: `tsc` + manual path test + git commit.

---

## Self-Review

**Spec coverage**
- Core loop PRD/MVP-scope: Phases 3–7  
- Billing replacing BYOK: Phase 4 + docs already updated  
- 6 agents: strategist/planner/writer/title/cta in 5–6; enhancement can be POST enhance later (optional Task 6.4 if time)  
- Claim moat: Phase 7  
- Reader progress: Phase 7.4  

**Gaps deferred (explicit)**
- Stripe webhooks (mock top-up only)
- PDF export real renderer (keep stub export job)
- Enhancement agent dedicated endpoint
- Multi-device guest claim without auth (MVP requires login to claim)

**Placeholder scan:** no TBD steps; SQL/TS samples included for critical paths.

**Type consistency:** project status union matches `types/project.ts`; credit costs match UI billing page; routes under `app/api` match hook paths.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-18-publiora-full-mvp.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task/phase, review between tasks  
2. **Inline Execution** — run phases in this session with checkpoints  

**Which approach?**
