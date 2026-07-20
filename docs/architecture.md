> **Update 2026-07-20 — workflow-first alignment**
>
> The active product model is **flat outline sections** (not nested chapters), **HTML fragments as canonical section content** (`content_html`), and **structured Title/CTA** outputs. Strategy state uses **ProjectStateV2**. Enhancement is **non-destructive** (suggestion → accept). Prefer `docs/user-flows.md` and `docs/ai-prompts.md` for the current contracts. Older sections below that describe chapter trees, Markdown canonical storage, or string-only CTAs are historical and should not guide new work.

\# architecture.md — Publiora MVP

> Revision note — infrastructure alignment: MVP assumes Cloudflare Pages + Supabase. Use Supabase Auth, Supabase Postgres, Supabase Storage, and lightweight generation_jobs polling. Redis/BullMQ and a separate Node backend are post-MVP scale options. PDF export in MVP uses browser/HTML print-to-PDF or a lightweight serverless renderer — Playwright-based export is post-MVP.

\## 1. Product

Publiora adalah AI-powered publishing platform.

Tagline:

\> Create, publish, and distribute marketing ebooks with AI.

Core flow:

\`\`\`txt

Brainstorm → Generate → Publish → Share Claim Link → Reader Access

---

2\. Domain Structure

publiora.web.id

Marketing site, public reader, claim pages.

app.publiora.web.id

Authenticated app:

creator dashboard

ebook generator

editor

library

access management

MVP routes:

publiora.web.id

publiora.web.id/read/:slug

publiora.web.id/claim/:token

app.publiora.web.id/dashboard

app.publiora.web.id/projects

app.publiora.web.id/projects/:id

app.publiora.web.id/library

app.publiora.web.id/settings/billing

---

3\. High-Level Architecture

Frontend App

├─ Marketing Site

├─ Creator Dashboard

├─ AI Ebook Workspace

├─ Ebook Editor

├─ Live Preview

├─ Reader Library

└─ Claim Access UI

Backend API

├─ Auth Service

├─ Billing & Credits Service

├─ AI Orchestrator

├─ Generation Jobs Table / Lightweight Queue

├─ Publishing Service

├─ Claim Link Service

├─ Entitlement Service

├─ HTML Renderer

└─ PDF Exporter

External

└─ Platform AI provider (server-managed keys)

---

4\. Recommended Stack

Frontend

Next.js

React

Tailwind CSS

Zustand

TanStack Query

TipTap Editor

Backend

Supabase Auth / Supabase Edge Functions / Cloudflare Pages Functions

Server-side API via Supabase Edge Functions or Cloudflare Pages Functions

Supabase Postgres

Redis / BullMQ are post-MVP scale options, not required for first Cloudflare + Supabase MVP

Rendering

HTML renderer

MVP PDF export: browser/HTML print-to-PDF or a lightweight serverless PDF renderer. Playwright-based PDF export is post-MVP (separate worker/server).

AI

Platform-managed model provider

Subscription + generation credits

---

5\. Core Modules

5.1 Auth

Responsibilities:

register

login

logout

session management

protect creator and reader routes

MVP:

email/password

Google login optional

---

5.2 Billing & Credits

Publiora bills via subscription plans and generation credits. Platform holds provider keys server-side.

Responsibilities:

manage plans (free / creator / pro)

grant monthly credits

deduct credits on generation actions

support top-up packs

surface insufficient-credit errors

Tables:

subscriptions (

id uuid primary key,

user_id uuid references profiles(id),

plan_id text,

status text,

renews_at timestamp,

canceled_at timestamp

);

credit_balances (

user_id uuid primary key references profiles(id),

plan_id text,

balance int,

period_grant int,

period_start timestamp,

period_end timestamp,

lifetime_spent int,

updated_at timestamp

);

credit_transactions (

id uuid primary key,

user_id uuid references profiles(id),

type text,

amount int,

balance_after int,

label text,

meta jsonb,

created_at timestamp

);

Credit costs (MVP):

outline = 5

section = 10

title = 2

cta = 2

Implementation note:

\- Supabase Auth owns authentication identity.

\- Store profile data in profiles.

\- Provider API keys stay in server env / secrets manager only.

\- Never expose provider keys to the frontend.

---

5.3 Project

A project is an ebook campaign.

Table:

projects (

id uuid primary key,

user_id uuid references users(id),

title text,

ebook_type text,

status text,

selected_template text,

created_at timestamp,

updated_at timestamp

);

Ebook types:

lead_magnet

bonus_product

sellable_ebook

Statuses:

draft

generating

ready

published

archived

---

5.4 AI Conversation Agent (Strategist)

Purpose:

- brainstorm ebook idea
- ask product-related questions
- understand audience
- recommend angle
- prepare structured state
- produce contextual quick-reply suggestions attached to assistant messages

Source of truth: `lib/ai/prompts.ts` (STRATEGIST_SYSTEM) and `lib/ai/agents/strategist.ts` (aiStrategistResponseSchema).

Input (sent to `runStrategist`):

- currentState (ProjectStateV2 from project_states)
- project metadata (title, description, audience, tone, niche)
- history (recent messages, role+content, max 12)
- userMessage (latest user text)

Output:

```
{
  "assistant_message": "Menurut saya angle ini masih terlalu umum. Siapa target pembaca paling spesifiknya?",
  "state_patch": {},
  "readiness_score": 55,
  "missing_fields": ["core_promise", "unique_angle"],
  "next_action": "continue_strategy",
  "conversation_summary": "Creator is uncertain about audience specifics...",
  "response_language": "id",
  "suggested_replies": [
    { "label": "Founder startup", "message": "...", "field": "audience", "intent": "answer" },
    { "label": "Marketer corporate", "message": "...", "field": "audience", "intent": "answer" }
  ]
}
```

Allowed next_action values:
- `continue_strategy` -- more questions needed
- `create_outline` -- gate met (all 6 required fields + readiness >= 70)
- `review_outline` -- post-outline (not used during strategy)
- `start_writing` -- write stage (not used during strategy)

The suggested_replies are persisted on the assistant ChatMessage.metadata field alongside `strategy_context_updated_at` (for stale-check) and `response_language`. See `lib/api/chat-metadata.ts` (buildAssistantMetadata) and `types/message.ts` (ChatMessageMetadata).

---

5.5 Structured State (ProjectStateV2)

Do not rely only on chat history.
Store extracted strategy data as JSON in project_states.

Table:

project_states (
  id uuid primary key,
  project_id uuid references projects(id) unique,
  state_json jsonb,         -- ProjectStateV2 (see types/strategy.ts)
  conversation_summary text,
  readiness_score int,      -- 0-100, computed by strategist or deterministic fallback
  created_at timestamp,
  updated_at timestamp
);

Current shape (schema_version = 2):

```
{
  "schema_version": 2,
  "strategy": {
    "topic": null,
    "audience": null,
    "audience_sophistication": null,
    "primary_problem": null,
    "pain_points": [],
    "desired_outcome": null,
    "core_promise": null,
    "unique_angle": null,
    "content_pillars": [],
    "product_or_offer": null,
    "funnel_goal": null,
    "cta_goal": null,
    "tone": null
  },
  "missing_fields": ["topic", "audience", "primary_problem", "desired_outcome", "core_promise", "unique_angle"],
  "next_action": "continue_strategy",
  "conversation_summary": null,
  "updated_at": "2026-07-20T10:00:00.000Z"
}
```

Required fields for outline gate: topic, audience, primary_problem, desired_outcome, core_promise, unique_angle.
When all 6 are non-empty AND readiness_score >= 70, next_action transitions to "create_outline".

The messages table stores per-turn chat history. Assistant messages carry `metadata` jsonb with:
- `suggested_replies` -- array of { label, message, field, intent }
- `strategy_context_updated_at` -- state.updated_at for stale-chip detection
- `response_language` -- "id" or "en"

Types: `types/strategy.ts` (EbookStrategy, ProjectStateV2, StrategistResult, StrategySuggestedReply) and `types/message.ts` (ChatMessage, ChatMessageMetadata).

---

5.6 Planner Agent

Generates:

title

subtitle

outline

chapters

section goals

CTA strategy

Output format:

{

"title": "7 Kesalahan Affiliate TikTok yang Membuat Video Sepi Viewer",

"subtitle": "Panduan cepat untuk pemula agar konten lebih terarah",

"chapters": \[

{

"id": "chapter_1",

"title": "Kenapa Video Affiliate Sering Sepi",

"goal": "Membantu pembaca memahami akar masalah konten",

"sections": \[

{

"id": "section_1_1",

"title": "Masalah utamanya bukan algoritma",

"target_words": 700

}

\]

}

\]

}

---

5.7 Writer Agent

Generates content per section.

Important:

do not generate full ebook in one request

do not generate final HTML

generate structured content only

Output:

{

"section_id": "section_1_1",

"heading": "Masalah utamanya bukan algoritma",

"body_markdown": "...",

"examples": \["...", "..."\],

"action_steps": \["...", "..."\],

"callout": "...",

"summary": "..."

}

---

5.8 Enhancement Agent

Section-level actions:

expand

shorten

make persuasive

make professional

simplify

add examples

add checklist

add CTA bridge

---

5.9 Title Generator

Purpose:

Generate compelling ebook title candidates during/after planning.

Output:

{

"titles": [

{ "style": "curiosity", "title": "" },

{ "style": "authority", "title": "" },

{ "style": "practical", "title": "" },

{ "style": "contrarian", "title": "" }

]

}

Note: title selection still belongs to the creator; Planner Agent may provisionally set a title, Title Generator expands options.

---

5.10 CTA Generator

Purpose:

Generate contextual CTA copy tied to ebook type, audience, and creator funnel/goal.

Output:

{

"cta": ""

}

Note: the CTA is rendered as a CTA block in the reader; CTA placement rules live in reader-experience.md and design-system.md (chapter ending, final section, inline soft CTA — no aggressive popups).

---

6\. Generation Pipeline

1\. User creates project

2\. User chats with AI strategist

3\. System updates structured state

4\. Planner generates outline

5\. User reviews outline

6\. Writer generates sections one by one

7\. Renderer updates preview

8\. User edits/enhances content

9\. User publishes ebook

10\. User generates claim link

Chunking rule:

Generate by section, not by full ebook.

Each chunk must be:

retryable

resumable

editable

---

7\. Publishing System

When creator clicks Publish:

structured_content

→ selected_template

→ rendered HTML

→ public reader URL

Table:

published_ebooks (

id uuid primary key,

project_id uuid references projects(id),

creator_id uuid references users(id),

slug text unique,

visibility text,

published_html text,

version int,

published_at timestamp,

updated_at timestamp

);

Visibility:

public

private

claim_required

---

8\. Claim Link System

Purpose: allow creators to give instant ebook access to buyers from external platforms.

Claim link example:

publiora.web.id/claim/abc123

Flow:

Buyer clicks claim link

→ login/register

→ entitlement created

→ ebook appears in library

Table:

claim_links (

id uuid primary key,

ebook_id uuid references published_ebooks(id),

creator_id uuid references users(id),

token text unique,

name text,

max_claims int,

claim_count int default 0,

expires_at timestamp null,

is_active boolean default true,

created_at timestamp

);

Claim records:

claim_events (

id uuid primary key,

claim_link_id uuid references claim_links(id),

user_id uuid references users(id),

ebook_id uuid references published_ebooks(id),

claimed_at timestamp

);

---

9\. Entitlement System

Controls who can access private/claimed ebooks.

Table:

entitlements (

id uuid primary key,

user_id uuid references users(id),

ebook_id uuid references published_ebooks(id),

source text,

created_at timestamp

);

Sources:

claim_link

manual_grant

public

purchase_future

Access check:

public ebook → allow

private ebook → require entitlement

claim_required ebook → require entitlement

creator owner → allow

---

10\. Reader Library

User library route:

app.publiora.web.id/library

Features:

view claimed ebooks

continue reading

open reader

save reading progress

Table:

reading_progress (

id uuid primary key,

user_id uuid references users(id),

ebook_id uuid references published_ebooks(id),

current_chapter_id text,

progress_percent int,

updated_at timestamp

);

---

11\. HTML Renderer

AI does not own layout.

AI produces structured content.

Renderer converts:

content_json

→ template

→ HTML

Template files:

/templates

/minimal

/editorial

/business

/premium-dark

Renderer function:

renderEbookHtml(document, templateSlug): string

---

12\. PDF Export

MVP Flow:

structured content

→ HTML

→ print CSS

→ browser/HTML print-to-PDF or lightweight serverless renderer

→ PDF file

→ download

Post-MVP Flow (Playwright):

structured content

→ HTML

→ print CSS

→ Playwright

→ PDF file

→ download

MVP notes:

\- No dedicated Playwright worker in MVP (keep Cloudflare Pages/Supabase footprint simple).

\- If richer PDF fidelity is required mid-MVP, use an external serverless PDF service instead of self-hosting Playwright

Table:

exports (

id uuid primary key,

project_id uuid references projects(id),

user_id uuid references users(id),

file_url text,

status text,

created_at timestamp

);

Statuses:

queued

processing

completed

failed

---

13\. API Endpoints

Auth

POST /auth/register

POST /auth/login

POST /auth/logout

GET /auth/me

Billing

GET /billing/balance

GET /billing/transactions

GET /billing/plans

GET /billing/packs

POST /billing/change-plan

POST /billing/purchase-pack

Projects

POST /projects

GET /projects

GET /projects/:id

PATCH /projects/:id

DELETE /projects/:id

Chat

POST /projects/:id/chat

GET /projects/:id/messages

Outline

POST /projects/:id/outline/generate

GET /projects/:id/outline

PATCH /projects/:id/outline

POST /projects/:id/outline/approve

Generation

POST /projects/:id/generate

GET /projects/:id/generation-status

POST /projects/:id/sections/:sectionId/regenerate

POST /projects/:id/sections/:sectionId/enhance

Publishing

POST /projects/:id/publish

GET /read/:slug

PATCH /published-ebooks/:id

Claim Links

POST /published-ebooks/:id/claim-links

GET /published-ebooks/:id/claim-links

PATCH /claim-links/:id

POST /claim/:token

Library

GET /library

GET /library/:ebookId

PATCH /library/:ebookId/progress

Export

POST /projects/:id/export/pdf

GET /exports/:id

---

14\. Generation Jobs

Table:

generation_jobs (

id uuid primary key,

project_id uuid references projects(id),

job_type text,

target_id text,

status text,

attempts int default 0,

error_message text,

created_at timestamp,

updated_at timestamp

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

---

15\. Credit Exhaustion Handling

Because generation costs credits:

System must:

check balance before generation

fail fast with insufficient_credits

never delete completed sections

allow resume after top-up or plan upgrade

User-facing message:

Kredit tidak cukup. Upgrade plan atau beli top-up untuk lanjut generate.

---

16\. Security

Requirements:

keep provider keys server-side only

never log provider secrets

sanitize generated content

prevent script injection in reader HTML

validate project ownership

validate ebook access via entitlement

rate-limit claim attempts

protect claim token from brute force

---

17\. MVP Limits

Max chapters: 10

Max sections per chapter: 6

Max ebook length: 30 pages

Max active generation per project: 1

Max PDF exports per project per day: configurable

---

18\. Observability

Track events:

project_created

api_key_saved

chat_started

outline_generated

section_generated

section_failed

ebook_published

claim_link_created

ebook_claimed

ebook_opened

pdf_exported

Key metrics:

ebook completion rate

publish rate

claim link usage

PDF export rate

reader open rate

generation failure rate

---

19\. MVP Build Sequence

Phase 1 — Foundation

auth

dashboard

project model

billing & credits

Phase 2 — AI Generator

chat strategist

structured state

outline generator

section generator

chunked jobs

Phase 3 — Editor + Preview

section editor

HTML preview

templates

Phase 4 — Publishing

publish ebook

public reader page

private/claim access mode

Phase 5 — Distribution

claim links

entitlement system

reader library

Phase 6 — Export

PDF export

export history

---

20\. Key Product Decisions

Decision 1

Use chat for discovery.

Reason: Creators often do not know the best ebook angle upfront.

Decision 2

Use structured state behind chat.

Reason: Reliable AI generation needs clean context.

Decision 3

Generate per section.

Reason: Avoid short chapters, token failures, and free-tier limits.

Decision 4

Render HTML locally.

Reason: Design consistency and lower token usage.

Decision 5

Use claim links for MVP distribution.

Reason: Works with Scalev, Lynk.id, WhatsApp, email, and any external checkout platform.

---

21\. Future Extensions

Not MVP:

Marketplace

Paid ebook sales

Webhook integrations

Scalev integration

Lynk.id integration

Email automation

Advanced reader analytics

Creator profile pages

Team workspace

Template marketplace

AI cover generation
