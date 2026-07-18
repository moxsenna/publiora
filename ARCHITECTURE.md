# architecture.md — Publiora MVP

## 1. Product

Publiora adalah AI-powered publishing platform.

Tagline:

> Create, publish, and distribute marketing ebooks with AI.

Core flow:

```txt
Brainstorm → Generate → Publish → Share Claim Link → Reader Access


---

2. Domain Structure

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

3. High-Level Architecture

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

4. Recommended Stack

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
HTML print-to-PDF / external PDF rendering service for MVP; Playwright PDF export moved to post-MVP or separate worker/server

AI

Gemini API
Subscription + generation credits


---

5. Core Modules

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

Platform manages provider keys; users pay via plans + credits.

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

Credit costs (MVP): outline=5, section=10, title=2, cta=2

Implementation note:
- Supabase Auth owns authentication identity.
- Store profile data in profiles.
- Provider API keys stay in server env / secrets manager only.
- Never expose provider keys to the frontend.


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

5.4 AI Conversation Agent

Purpose:

brainstorm ebook idea

ask product-related questions

understand audience

recommend angle

prepare structured state


Input:

latest_user_message
conversation_summary
structured_state

Output:

{
  "assistant_message": "Menurut saya angle ini masih terlalu umum. Siapa target pembaca paling spesifiknya?",
  "state_patch": {},
  "readiness_score": 55,
  "next_action": "ask_question"
}


---

5.5 Structured State

Do not rely only on chat history.

Store extracted strategy data as JSON.

Table:

project_states (
  id uuid primary key,
  project_id uuid references projects(id),
  state_json jsonb,
  conversation_summary text,
  updated_at timestamp
);

Example:

{
  "ebook_type": "lead_magnet",
  "product": {
    "name": "Course Affiliate TikTok",
    "type": "online_course",
    "description": "Course untuk pemula yang ingin mulai affiliate TikTok"
  },
  "audience": {
    "segment": "affiliate marketer pemula",
    "pain_points": [
      "video sepi",
      "bingung pilih produk",
      "tidak punya strategi konten"
    ],
    "desired_transformation": "punya sistem konten affiliate sederhana"
  },
  "ebook_strategy": {
    "goal": "collect_leads",
    "angle": "7 kesalahan affiliate TikTok pemula",
    "tone": "praktis dan santai",
    "cta_goal": "join grup WhatsApp"
  }
}


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
  "chapters": [
    {
      "id": "chapter_1",
      "title": "Kenapa Video Affiliate Sering Sepi",
      "goal": "Membantu pembaca memahami akar masalah konten",
      "sections": [
        {
          "id": "section_1_1",
          "title": "Masalah utamanya bukan algoritma",
          "target_words": 700
        }
      ]
    }
  ]
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
  "examples": ["...", "..."],
  "action_steps": ["...", "..."],
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

6. Generation Pipeline

1. User creates project
2. User chats with AI strategist
3. System updates structured state
4. Planner generates outline
5. User reviews outline
6. Writer generates sections one by one
7. Renderer updates preview
8. User edits/enhances content
9. User publishes ebook
10. User generates claim link

Chunking rule:

Generate by section, not by full ebook.

Each chunk must be:

retryable

resumable

editable



---

7. Publishing System

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

8. Claim Link System

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

9. Entitlement System

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

10. Reader Library

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

11. HTML Renderer

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

12. PDF Export

Flow:

structured content
→ HTML
→ print CSS
→ Playwright
→ PDF file
→ download

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

13. API Endpoints

Auth

POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me

API Key

GET /billing/balance
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

14. Generation Jobs

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

15. Credit Exhaustion Handling

Because generation costs credits:

System must:

check balance before generation

fail fast with insufficient_credits

never delete completed sections

allow resume after top-up or plan upgrade

User-facing message:

Kredit tidak cukup. Upgrade plan atau beli top-up untuk lanjut generate.


---

16. Security

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

17. MVP Limits

Max chapters: 10
Max sections per chapter: 6
Max ebook length: 30 pages
Max active generation per project: 1
Max PDF exports per project per day: configurable


---

18. Observability

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

19. MVP Build Sequence

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

20. Key Product Decisions

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

21. Future Extensions

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
