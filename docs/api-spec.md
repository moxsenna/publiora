# api-spec.md — Publiora MVP

Base URLs:

```txt

Marketing Site:

https://publiora.web.id

App API:

https://app.publiora.web.id/api

Runtime:

Cloudflare Pages Functions and/or Supabase Edge Functions

API Style:

REST JSON API

Supabase Auth session authentication

Creator + Reader access model
```

> Cross-reference: AI agents (Conversation Strategist, Planner, Writer, Enhancement, Title Generator, CTA Generator) are invoked server-side via the Project/Chat/Outline/Generation endpoints below; they are not exposed as separate public endpoints in the MVP. See architecture.md §5.4–§5.10 and ai-prompts.md.

---

1\. Authentication

Authentication is handled by Supabase Auth SDK, not custom password storage.

Client-side auth actions:

\- signUp

\- signInWithPassword

\- signOut

\- getUser

Application profile data is stored in profiles table.

Custom API endpoints validate the Supabase session before processing requests.

Legacy endpoint examples below may be kept only as conceptual references if needed.

POST /auth/register

Register new user.

Request

{

"name": "John Doe",

"email": "john@example.com",

"password": "secret123"

}

Response

{

"user": {

"id": "uuid",

"name": "John Doe",

"email": "john@example.com"

},

"session": "supabase_session"

}

---

POST /auth/login

Request

{

"email": "john@example.com",

"password": "secret123"

}

Response

{

"user": {

"id": "uuid",

"name": "John Doe",

"email": "john@example.com"

},

"session": "supabase_session"

}

---

POST /auth/logout

Response

{

"success": true

}

---

GET /auth/me

Get authenticated user.

Response

{

"id": "uuid",

"name": "John Doe",

"email": "john@example.com"

}

---

2\. Billing & Credits

GET /billing/balance

Current credit balance + plan period.

Response

{

"plan_id": "creator",

"balance": 382,

"period_grant": 500,

"period_start": "2026-07-01T00:00:00.000Z",

"period_end": "2026-08-01T00:00:00.000Z"

}

---

GET /billing/plans

List subscription plans.

---

GET /billing/packs

List credit top-up packs.

---

POST /billing/change-plan

Request

{

"plan_id": "pro"

}

---

POST /billing/purchase-pack

Request

{

"pack_id": "pack_500"

}

---

GET /billing/transactions

Credit ledger (grant / purchase / spend).

---

3\. Projects

POST /projects

Create new ebook project.

Accepts **Create Project V3** (preferred, offer-aware), **V2**, or **legacy flat** `ProjectInput` (compatibility window).

### V3 request (preferred)

Discriminated `offer_context` + `business_context`. Client never submits `owner_id`, snapshots, or readiness.

```json
{
  "version": 3,
  "ebook_type": "lead_magnet",
  "template_id": "tpl_checklist",
  "common": {
    "idea_text": "Checklist growth audit 7 hari",
    "topic": null,
    "audience": null,
    "primary_problem": null,
    "desired_outcome": null,
    "niche": null,
    "tone": null,
    "working_title": null,
    "author": "Bima",
    "additional_notes": null
  },
  "offer_context": {
    "mode": "existing",
    "offer_id": "uuid",
    "relationship": "promotes"
  },
  "business_context": {
    "type": "lead_magnet",
    "lead_goal": "visit_offer",
    "traffic_source": null,
    "post_read_action": null,
    "cta_url": null
  }
}
```

`offer_context.mode`:

| mode | meaning |
|---|---|
| `none` | No linked offer (Lead Magnet / sellable standalone) |
| `existing` | Link owned `offer_id` + relationship |
| `quick_create` | Create offer in same transaction, then link |

Type rules:

- Lead Magnet: offer optional; relationship `promotes` \| `upsells_to`
- Bonus Pembelian: offer required; relationship `bonus_for`; `bonus_intent` required
- Ebook Berbayar: `standalone` → no offer; `bundle_component` → `bundle_component`; `entry_to_offer` → `upsells_to`

Server behavior (V3):

- Auth required; server sets offer/project owner from `auth.uid()`
- Loads existing offer or builds quick-create payload
- Prefills strategy/CTA from offer when fields empty
- Atomic RPC `create_project_with_context_v3` (project + state + optional offer + primary link + server-built snapshot)
- Fallback non-atomic path only if RPC missing (dev); best-effort cleanup

### V2 request (still supported)

```json
{
  "version": 2,
  "ebook_type": "lead_magnet",
  "template_id": "tpl_checklist",
  "common": {
    "topic": "Lead Generation B2B",
    "audience": "Founder SaaS tahap awal",
    "primary_problem": "Sulit mendapatkan lead berkualitas",
    "desired_outcome": "Rencana lead generation 30 hari",
    "niche": "B2B SaaS Marketing",
    "tone": "Praktis, jelas",
    "working_title": null,
    "author": "Bima",
    "additional_notes": null
  },
  "business_context": {
    "type": "lead_magnet",
    "lead_goal": "collect_email",
    "traffic_source": "Konten organik",
    "next_offer": "Audit marketing gratis",
    "post_read_action": "visit_product",
    "cta_url": "https://example.com/audit"
  }
}
```

Server behavior (V2):

- Strict Zod validation (type/context must match; CTA URL when required).
- Deterministic working title + description if omitted.
- Seeds Strategy V3 into `project_states` (no fabricated core_promise/unique_angle).
- Validates template compatibility for `ebook_type`.
- Atomic insert via RPC `create_project_with_state` (project + state).
- Lead Magnet may set `projects.cta_goal` / `cta_url`.
- Free-text `next_offer` / `parent_product` are **not** auto-converted to Offer rows.

Response `201` (V2/V3):

```json
{
  "id": "uuid",
  "title": "Panduan: Lead Generation B2B",
  "ebook_type": "lead_magnet",
  "status": "draft"
}
```

Legacy flat body (`title`, `author`, `description`, `audience`, `tone`, `niche`, optional `ebook_type`/`template_id`) still works for one release.

---

### Offer Library

Authenticated, owner-scoped. Full design: `docs/offers.md`.

| Method | Path | Notes |
|---|---|---|
| GET | `/offers?status=active\|archived\|all&search=&limit=&cursor=` | Default `status=active`. Items include `linked_project_count`. |
| POST | `/offers` | Full create or quick-create schema. Server sets `owner_id`. |
| GET | `/offers/:offerId` | Offer + `linked_projects` (own projects only). |
| PATCH | `/offers/:offerId` | Partial strict patch. Returns `{ offer, stale_project_count }`. Does not mutate project snapshots. |
| DELETE | `/offers/:offerId` | Archives (`status=archived`), not hard delete. |
| GET | `/offers/:offerId/projects` | Linked project summaries. |
| GET | `/projects/:id/offers` | Links + offer + `source_is_newer`. |
| POST | `/projects/:id/offers` | Link offer. Body: `{ offer_id, relationship, is_primary?, replace_primary? }`. Server builds snapshot. |
| DELETE | `/projects/:id/offers?link_id=` | Detach. Rejected for Bonus primary `bonus_for` without replacement. |
| POST | `/projects/:id/offers/sync` | Explicit field-selective sync. Never edits generated sections. No credit charge. |

Sync body:

```json
{
  "link_id": "uuid",
  "fields": ["target_audience", "destination_url"],
  "apply_to_strategy": true,
  "apply_to_project_cta": true
}
```

Publish (`POST /projects/:id/publish`) stores immutable `published_ebooks.offer_context` from the accepted link snapshot. Bonus without primary link is blocked. Reader must not query live Offer Library.

---

GET /projects

Get user projects.

Response

{

"projects": \[

{

"id": "uuid",

"title": "Affiliate TikTok Ebook",

"status": "draft",

"updatedAt": "2026-01-01T00:00:00Z"

}

\]

}

---

GET /projects/:id

Get project detail.

Response

{

"id": "uuid",

"title": "Affiliate TikTok Ebook",

"ebookType": "lead_magnet",

"status": "draft",

"state": {},

"outline": {}

}

---

PATCH /projects/:id

Update project metadata.

Request

{

"title": "New Ebook Title"

}

Response

{

"success": true

}

---

DELETE /projects/:id

Delete project.

Response

{

"success": true

}

---

4\. Conversation Agent

POST /projects/:id/chat

Send message to AI strategist.

Request

{

"message": "Saya mau bikin ebook bonus untuk course affiliate TikTok."

}

Response

{

"assistantMessage": "Siapa target audience utama course affiliate TikTok Anda?",

"statePatch": {

"product.name": "Course Affiliate TikTok"

},

"readinessScore": 35,

"nextAction": "ask_question"

}

---

GET /projects/:id/messages

Get chat history.

Response

{

"messages": \[

{

"role": "assistant",

"content": "Produk utama yang ingin didukung ebook ini apa?"

},

{

"role": "user",

"content": "Course affiliate TikTok."

}

\]

}

---

5\. Outline

POST /projects/:id/outline/generate

Generate ebook outline.

Response

{

"outline": {

"title": "7 Kesalahan Affiliate TikTok Pemula",

"subtitle": "Panduan cepat agar video tidak sepi viewer",

"chapters": \[

{

"id": "chapter_1",

"title": "Kenapa Video Affiliate Sepi",

"sections": \[

{

"id": "section_1_1",

"title": "Masalah utama bukan algoritma"

}

\]

}

\]

}

}

---

GET /projects/:id/outline

Get current outline.

---

PATCH /projects/:id/outline

Update outline manually.

Request

{

"outline": {}

}

---

POST /projects/:id/outline/approve

Approve outline before generation.

Response

{

"success": true

}

---

6\. Ebook Generation

POST /projects/:id/generate

Start ebook generation.

Request

{

"mode": "full_ai"

}

Response

{

"jobId": "uuid",

"status": "queued"

}

---

GET /projects/:id/generation-status

Response

{

"status": "running",

"progress": {

"completedSections": 5,

"totalSections": 12

},

"currentTask": "Generating Chapter 2 Section 1"

}

---

POST /projects/:id/sections/:sectionId/regenerate

Regenerate specific section.

Request

{

"instruction": "Make this more persuasive"

}

Response

{

"success": true,

"jobId": "uuid"

}

---

POST /projects/:id/sections/:sectionId/enhance

Enhance section.

Request

{

"action": "add_examples"

}

Allowed Actions

expand

shorten

make_persuasive

make_professional

simplify

add_examples

add_checklist

Response

{

"success": true

}

---

7\. Sections

GET /projects/:id/sections

Get generated sections.

Response

{

"sections": \[

{

"id": "section_1_1",

"title": "Masalah utama bukan algoritma",

"content": {}

}

\]

}

---

PATCH /projects/:id/sections/:sectionId

Update section manually.

Request

{

"content": {}

}

Response

{

"success": true

}

---

8\. Preview

GET /projects/:id/preview-html

Get rendered HTML preview.

Response

{

"html": "\<html\>...\</html\>"

}

---

9\. Publishing

POST /projects/:id/publish

Publish ebook.

Request

{

"visibility": "claim_required"

}

Allowed Visibility

public

private

claim_required

Response

{

"ebookId": "uuid",

"slug": "7-kesalahan-affiliate-tiktok",

"url": "https://publiora.web.id/read/7-kesalahan-affiliate-tiktok"

}

---

GET /published-ebooks/:id

Get published ebook detail.

Response

{

"id": "uuid",

"title": "7 Kesalahan Affiliate TikTok",

"visibility": "claim_required",

"url": "https://publiora.web.id/read/slug"

}

---

PATCH /published-ebooks/:id

Update published ebook settings.

Request

{

"visibility": "private"

}

Response

{

"success": true

}

---

10\. Reader

GET /read/:slug

Public reader endpoint.

Response

Rendered HTML page.

---

GET /library

Get reader library.

Response

{

"ebooks": \[

{

"id": "uuid",

"title": "Affiliate TikTok Ebook",

"coverImage": null,

"progress": 45

}

\]

}

---

GET /library/:ebookId

Get reader ebook detail.

Response

{

"id": "uuid",

"title": "Affiliate TikTok Ebook",

"html": "\<html\>...\</html\>"

}

---

PATCH /library/:ebookId/progress

Update reading progress.

Request

{

"chapterId": "chapter_3",

"progressPercent": 45

}

Response

{

"success": true

}

---

11\. Claim Links

POST /published-ebooks/:id/claim-links

Create claim link.

Request

{

"name": "Bonus Affiliate TikTok",

"maxClaims": 100,

"expiresAt": null

}

Response

{

"id": "claim_123",

"token": "abc123",

"url": "https://publiora.web.id/claim/abc123"

}

---

GET /published-ebooks/:id/claim-links

Get claim links.

Response

{

"claimLinks": \[

{

"id": "claim_123",

"name": "Bonus Affiliate TikTok",

"claimCount": 24,

"maxClaims": 100,

"isActive": true

}

\]

}

---

PATCH /claim-links/:id

Update claim link.

Request

{

"isActive": false

}

Response

{

"success": true

}

---

POST /claim/:token

Claim ebook access.

Response

{

"success": true,

"ebook": {

"id": "uuid",

"title": "Affiliate TikTok Ebook"

}

}

---

12\. PDF Export

POST /projects/:id/export/pdf

Generate PDF export.

Response

{

"exportId": "export_123",

"status": "processing"

}

---

GET /exports/:id

Get export status.

Response

{

"status": "completed",

"downloadUrl": "https://cdn.publiora.web.id/file.pdf"

}

---

13\. Errors

Standard error format:

{

"error": {

"code": "RATE_LIMIT",

"message": "Kredit tidak cukup. Upgrade plan atau beli top-up."

}

}

---

14\. Common Error Codes

UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

RATE_LIMIT

INVALID_API_KEY

CLAIM_LINK_EXPIRED

CLAIM_LIMIT_REACHED

ALREADY_CLAIMED

GENERATION_FAILED

PDF_EXPORT_FAILED

---

15\. Authentication

Protected endpoints require:

Authorization: Bearer \<token\>

---

16\. Future API Extensions

Not MVP:

Webhook integrations

Marketplace APIs

Analytics APIs

Creator profile APIs

Payment APIs

Affiliate tracking APIs

Public SDK

## Generation quality endpoints (2026-07)

### POST /api/projects/:id/sections/generate
- Single section: may return `409 section_replace_confirmation_required` unless `confirm_replace_existing: true`.
- Uses FormatContext + quality gate + optional free repair.
- Writes `generation_meta` and updates generation memory (non-fatal).

### PATCH /api/projects/:id/sections/:sectionId
- Supports `expected_updated_at` optimistic concurrency (`409 section_conflict`).

### GET/POST /api/projects/:id/sections/:sectionId/revisions
- List / create revision snapshots.

### POST /api/projects/:id/sections/:sectionId/revisions/:revisionId/restore
- Restores snapshot; no AI credit charge.

### POST /api/projects/:id/quality-review
- Optional AI semantic review; charges `quality_review` credits; refunds on failure.

### POST /api/projects/:id/publish
- Builds trusted snapshot server-side and calls `publish_project_atomic_v1`.

