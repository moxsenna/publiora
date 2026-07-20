# Publiora — Implementation Plan: Type-Aware Project Creation

**Status:** Ready for coding agent execution  
**Scope:** New Project flow for Lead Magnet, Bonus Pembelian, and Ebook Berbayar  
**Target repository:** `moxsenna/publiora`  
**Prepared:** 2026-07-20  
**Primary goal:** Make project creation capture the business purpose of the ebook, seed structured Strategy state correctly, and recommend suitable formats before the user enters the main workspace.

---

## 0. Executive Summary

The current project creation page treats all ebook types almost identically:

```text
Select ebook type
→ select a generic template
→ enter generic metadata
→ create project
→ create an empty project state
```

This is not sufficient for the two most business-dependent use cases:

- **Lead Magnet** needs conversion context: acquisition goal, source of traffic, next offer, and post-read action.
- **Bonus Pembelian** needs parent-product context: what was purchased, why the bonus exists, and when it should be used.

The target experience is:

```text
1. Choose purpose
2. Complete a type-aware brief
3. Choose a recommended format
4. Review and create
5. Enter Strategy with a prefilled structured state
```

This plan covers:

- UX and information architecture
- Indonesian product copy
- Type-safe form contracts
- Conditional validation
- Strategy state V3
- Deterministic readiness
- Template compatibility and recommendation
- Atomic project + state creation
- Strategist, Planner, and Writer context propagation
- Backward compatibility
- Database migration
- Unit, component, API, and E2E tests
- Rollout and rollback

The implementation must not stop at changing the form. The project’s business context must become persistent, typed, and available to downstream agents.

---

# 1. Current-State Audit

## 1.1 Current UI

The current page is implemented primarily in:

```text
app/(app)/projects/new/page.tsx
```

Current behavior:

- Uses one generic Zod schema.
- Requires title, author, description, audience, tone, and niche for all ebook types.
- Displays templates before collecting business context.
- Applies a template by overwriting `niche`, `audience`, and `tone`.
- Sends a flat `ProjectInput`.
- Redirects directly to the project workspace.

Current ebook types:

```ts
"lead_magnet"
"bonus_product"
"sellable_ebook"
```

The internal enum values are valid and should remain stable.

## 1.2 Current project persistence

Current create flow:

```text
POST /api/projects
├── insert projects row
└── insert project_states row with:
    state_json = {}
    readiness_score = 0
```

Problems:

1. Project and project state are written in two separate database calls.
2. A failed state insert can leave a project without a state.
3. None of the information entered in the form seeds structured Strategy fields.
4. The Strategist must ask again for information already provided during project creation.

## 1.3 Current template model

Current `Template` contains:

```ts
id
name
description
niche
default_audience
default_tone
cover_color
is_system
```

It does not contain:

- supported ebook types,
- format category,
- recommended use cases,
- estimated depth,
- default section count,
- recommendation priority.

The current catalog is therefore a visual preset catalog, not a format recommendation system.

## 1.4 Current Strategy state

Current Strategy V2 already provides strong generic fields:

```ts
topic
audience
audience_sophistication
primary_problem
pain_points
desired_outcome
core_promise
unique_angle
content_pillars
product_or_offer
funnel_goal
cta_goal
tone
```

These should be preserved.

The missing part is type-specific business context:

- traffic source for Lead Magnet,
- function and timing for Bonus Pembelian,
- sales positioning and objections for Ebook Berbayar.

---

# 2. Product Decisions

These decisions are binding for this implementation.

## 2.1 Use workflow-first creation

The New Project page becomes a four-step wizard:

```text
Tujuan → Brief → Format → Tinjau
```

Do not create separate routes for each step in the first implementation. Keep one route and one form state so Back/Next interactions remain fast.

## 2.2 Keep internal enum values stable

Do not rename database enum-like strings.

| Internal value | UI label |
|---|---|
| `lead_magnet` | Lead Magnet |
| `bonus_product` | Bonus Pembelian |
| `sellable_ebook` | Ebook Berbayar |

This avoids a migration solely for presentation copy.

## 2.3 Strategy state is the canonical strategic brief

Type-specific strategic information belongs in `project_states.state_json`, not in many new columns on `projects`.

The `projects` table remains the canonical source for:

- identity,
- status,
- title,
- author,
- basic searchable metadata,
- template,
- publication CTA fields.

The Strategy state remains canonical for:

- audience and problem definition,
- promised outcome,
- business purpose,
- type-specific context,
- agent handoff context.

## 2.4 Use deterministic template recommendation

Template recommendation in this scope must:

- use deterministic rules,
- consume no AI credits,
- work offline from the template catalog,
- be covered by unit tests.

An AI-powered recommendation explanation may be added later, but it is not part of the critical path.

## 2.5 Title is provisional

The user should not be forced to know the final title before Strategy.

UI label:

```text
Judul sementara (opsional)
```

The database still requires a title. If omitted, the server creates a deterministic placeholder—never an AI-generated or misleading title.

Fallback order:

1. User-entered working title.
2. `Panduan: {topic}` when a topic exists.
3. `{localized ebook type} Baru`.

Examples:

```text
Panduan: Lead Generation B2B
Lead Magnet Baru
Bonus Pembelian Baru
Ebook Berbayar Baru
```

## 2.6 Templates must not silently overwrite the brief

Selecting a template must not overwrite user-entered:

- audience,
- niche,
- tone,
- problem,
- outcome.

Template defaults may:

- fill an empty field,
- appear as a recommendation,
- be applied through an explicit button.

Silent replacement is prohibited.

## 2.7 Creation must be atomic

Project and initial project state must be created in a single Postgres transaction/RPC.

No successful project creation response may be returned unless both records exist.

---

# 3. Target User Experience

## 3.1 Main flow

```text
/projects/new

Step 1 — Tujuan
    ↓
Step 2 — Brief sesuai tipe
    ↓
Step 3 — Format yang direkomendasikan
    ↓
Step 4 — Tinjau
    ↓
Create project atomically
    ↓
/projects/{id}?stage=strategy
```

## 3.2 Desktop wireframe

```text
← Kembali ke proyek

Buat Proyek Baru
Tentukan tujuan, lengkapi brief, lalu pilih format.

[1 Tujuan] ─ [2 Brief] ─ [3 Format] ─ [4 Tinjau]

┌──────────────────────────────────────────────────────────────┐
│ Current step content                                         │
│                                                              │
│ ...                                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Kembali]                                   [Lanjutkan]       │
└──────────────────────────────────────────────────────────────┘
```

## 3.3 Mobile behavior

- Step labels may collapse to `1/4`, `2/4`, etc.
- Cards stack vertically.
- Primary action remains visible after content.
- Do not use a horizontally overflowing fixed-width wizard.
- Review summary uses accordions grouped by purpose, brief, format, and metadata.

## 3.4 Navigation rules

- Users may go back to completed steps.
- Users cannot go forward until the current step is valid.
- The final Create action is only enabled when all required fields across the active type are valid.
- Changing ebook type after entering type-specific data requires confirmation.

Confirmation copy:

```text
Ganti tipe ebook?

Informasi khusus untuk {current type} akan dihapus.
Informasi umum seperti topik dan target pembaca tetap disimpan.

[Batal] [Ganti tipe]
```

---

# 4. Step 1 — Purpose Selection

## 4.1 Page copy

Heading:

```text
Apa yang ingin Anda buat?
```

Helper:

```text
Pilih berdasarkan fungsi bisnis ebook, bukan hanya panjang kontennya.
```

## 4.2 Type cards

### Lead Magnet

```text
Lead Magnet

Konten gratis untuk menarik calon pelanggan dan mengarahkan
mereka ke langkah berikutnya.

Cocok untuk:
• Mengumpulkan email
• Mengarahkan ke WhatsApp
• Mendaftar webinar atau trial
```

### Bonus Pembelian

```text
Bonus Pembelian

Konten pendamping yang menambah nilai dan membantu pembeli
mendapatkan hasil dari produk utama.

Cocok untuk:
• Bonus kelas atau course
• Bonus affiliate
• Panduan implementasi produk
```

### Ebook Berbayar

```text
Ebook Berbayar

Produk digital mandiri dengan nilai yang cukup kuat untuk dijual.

Cocok untuk:
• Panduan premium
• Playbook mendalam
• Framework atau workbook berbayar
```

## 4.3 Type selection acceptance criteria

- The active card has clear selected styling and check icon.
- Cards are keyboard accessible.
- The entire card is a button.
- `aria-pressed` reflects selected state.
- Internal values stay unchanged.
- All visible copy is Indonesian.

---

# 5. Step 2 — Type-Aware Brief

## 5.1 Common fields

These fields are shared by all types.

| Field | Required | Notes |
|---|---:|---|
| `topic` | Yes | Main subject, not final title |
| `audience` | Yes | Specific target reader |
| `primary_problem` | Yes | Most urgent problem |
| `desired_outcome` | Yes | Result after reading |
| `niche` | Yes | Used for project metadata/search |
| `tone` | No | Default: `Praktis, jelas` |
| `working_title` | No | Provisional title |
| `author` | Yes | Prefilled from profile |
| `additional_notes` | No | Extra context only |

### Common field copy

```text
Topik utama
Contoh: Membangun sistem lead generation B2B

Target pembaca
Contoh: Founder SaaS tahap awal yang belum punya tim marketing

Masalah utama
Contoh: Sulit mendapatkan lead berkualitas secara konsisten

Hasil yang ingin diberikan
Contoh: Pembaca memiliki rencana lead generation 30 hari

Niche
Contoh: B2B SaaS Marketing

Gaya bahasa
Contoh: Praktis, taktis, dan ringkas

Judul sementara (opsional)
Anda dapat membuat dan mengganti judul dengan AI di tahap berikutnya.

Catatan tambahan (opsional)
Tambahkan batasan, pengalaman, contoh, atau konteks yang perlu diketahui AI.
```

## 5.2 Lead Magnet fields

### Required

| Field | Required | Storage mapping |
|---|---:|---|
| `lead_goal` | Yes | Strategy `funnel_goal` |
| `post_read_action` | Yes | Strategy + project CTA goal |
| `cta_url` | Conditional | Project `cta_url` |
| `next_offer` | No but recommended | Strategy `product_or_offer` |
| `traffic_source` | No | Strategy V3 `traffic_source` |

### Lead goal enum

```ts
type LeadGoal =
  | "collect_email"
  | "join_whatsapp"
  | "webinar_registration"
  | "book_call"
  | "start_trial"
  | "visit_offer"
  | "other";
```

UI labels:

| Value | Label |
|---|---|
| `collect_email` | Mengumpulkan email |
| `join_whatsapp` | Mengarahkan ke WhatsApp |
| `webinar_registration` | Mendaftarkan webinar |
| `book_call` | Menjadwalkan konsultasi |
| `start_trial` | Memulai trial |
| `visit_offer` | Mengunjungi halaman penawaran |
| `other` | Tujuan lain |

### Traffic source

Suggested options:

```text
Konten organik
Iklan berbayar
Media sosial
Komunitas
Affiliate / partner
Website / SEO
Belum ditentukan
```

Store as a normalized string to avoid over-constraining the strategy schema.

### Next offer

UI label:

```text
Produk atau layanan lanjutan (opsional)
```

Helper:

```text
Apa yang ingin Anda tawarkan setelah pembaca mendapatkan manfaat dari lead magnet?
```

### Post-read action

Use the existing CTA goal set:

```text
visit_product
join_whatsapp
claim_bonus
buy_product
follow_creator
custom
```

Present localized labels.

If the chosen CTA goal requires a URL, `cta_url` is required and validated before moving to Step 3.

### Lead Magnet layout

```text
Tujuan Lead Magnet
[ Mengumpulkan email ▼ ]

Sumber traffic
[ Konten organik ▼ ]

Produk atau layanan lanjutan
[ Audit marketing gratis ]

Aksi setelah membaca
[ Jadwalkan konsultasi ▼ ]

Tautan tujuan
[ https://... ]
```

## 5.3 Bonus Pembelian fields

### Required

| Field | Required | Storage mapping |
|---|---:|---|
| `parent_product` | Yes | Strategy `product_or_offer` |
| `bonus_role` | Yes | Strategy V3 `bonus_role` |
| `usage_moment` | Yes | Strategy V3 `usage_moment` |

### Bonus role enum

```ts
type BonusRole =
  | "implementation_aid"
  | "ready_to_use_assets"
  | "speed_to_result"
  | "objection_handler"
  | "increase_perceived_value"
  | "support_next_step"
  | "other";
```

UI labels:

| Value | Label |
|---|---|
| `implementation_aid` | Membantu implementasi produk utama |
| `ready_to_use_assets` | Memberikan aset siap pakai |
| `speed_to_result` | Mempercepat hasil pembeli |
| `objection_handler` | Menjawab kebingungan atau keberatan |
| `increase_perceived_value` | Menambah nilai paket pembelian |
| `support_next_step` | Membantu langkah lanjutan |
| `other` | Fungsi lainnya |

### Usage moment enum or text

Initial version may store a string selected from:

```text
Sebelum mulai produk utama
Saat mengikuti produk utama
Setelah modul atau bagian tertentu
Setelah menyelesaikan produk utama
Saat pembeli mengalami hambatan
Bebas digunakan kapan saja
```

Allow an optional custom explanation.

### Bonus fields copy

```text
Produk utama
Contoh: Kelas TikTok Affiliate untuk Pemula

Fungsi bonus
Contoh: Membantu peserta memilih produk pertama

Kapan bonus digunakan?
Contoh: Setelah peserta menyelesaikan modul riset produk
```

### Bonus Pembelian layout

```text
Produk utama
[ Kelas TikTok Affiliate ]

Fungsi bonus
[ Mempercepat hasil pembeli ▼ ]

Kapan bonus digunakan?
[ Setelah modul riset produk ▼ ]

Hasil yang diberikan bonus
[ Mendapat shortlist 10 produk dalam 30 menit ]
```

`desired_outcome` represents the result delivered by the bonus—not the full result of the parent product.

## 5.4 Ebook Berbayar fields

Although this initiative focuses on Lead Magnet and Bonus Pembelian, Ebook Berbayar must remain supported.

### Required

| Field | Required | Storage mapping |
|---|---:|---|
| `sales_positioning` | Yes | Strategy V3 |
| `buyer_objections` | No | Strategy V3 |

### Sales positioning enum

```ts
type SalesPositioning =
  | "entry_product"
  | "core_product"
  | "premium_authority"
  | "bundle_component";
```

Localized labels:

```text
Produk entry-level
Produk utama
Produk premium / authority
Bagian dari bundle
```

### Buyer objections

Use repeatable text chips or a textarea split into lines.

Example:

```text
Pembeli merasa informasi serupa tersedia gratis
Pembeli ragu ebook cukup praktis
Pembeli tidak punya banyak waktu
```

---

# 6. Step 3 — Format and Template Recommendation

## 6.1 Target behavior

After the brief is sufficiently complete, show templates ordered by relevance.

Layout:

```text
Format yang direkomendasikan

Berdasarkan tujuan dan brief Anda, format berikut paling sesuai.

★ Checklist
  Pilihan terbaik
  Membantu lead mendapat quick win dan mudah dikonsumsi.

★ Quick Win Guide
  Cocok untuk hasil cepat dalam 15–30 menit.

  Playbook
  Cocok jika topik membutuhkan proses yang lebih mendalam.
```

## 6.2 Template domain changes

Extend `Template`:

```ts
export type TemplateFormat =
  | "blank"
  | "quick_win_guide"
  | "playbook"
  | "checklist"
  | "framework"
  | "workbook"
  | "implementation_guide"
  | "resource_guide"
  | "workshop";

export interface Template {
  id: string;
  name: string;
  description: string;
  niche: string;
  default_audience: string;
  default_tone: string;
  cover_color: string;
  is_system: boolean;

  format: TemplateFormat;
  supported_ebook_types: EbookType[];
  recommended_for: string[];
  default_section_count: number;
  depth: "quick" | "standard" | "deep";
}
```

## 6.3 Catalog changes

Keep existing IDs stable:

```text
tpl_playbook
tpl_checklist
tpl_framework
tpl_workshop
```

Add:

```text
tpl_quick_win
tpl_workbook
tpl_implementation_guide
tpl_resource_guide
```

### Compatibility matrix

| Template | Lead Magnet | Bonus Pembelian | Ebook Berbayar |
|---|---:|---:|---:|
| Quick Win Guide | Strong | Medium | Low |
| Checklist | Strong | Strong | Medium |
| Playbook | Medium | Medium | Strong |
| Framework | Medium | Medium | Strong |
| Workbook | Low | Strong | Strong |
| Implementation Guide | Low | Strong | Medium |
| Resource Guide | Medium | Strong | Medium |
| Workshop | Low | Medium | Strong |
| Blank | Always | Always | Always |

## 6.4 Recommendation engine

Create:

```text
lib/templates/recommendation.ts
```

Contract:

```ts
interface TemplateRecommendationInput {
  ebookType: EbookType;
  leadGoal?: LeadGoal | null;
  bonusRole?: BonusRole | null;
  salesPositioning?: SalesPositioning | null;
  desiredOutcome: string;
  primaryProblem: string;
}

interface RankedTemplate {
  template: Template;
  score: number;
  reason: string;
  recommended: boolean;
}
```

Rules:

1. Unsupported templates are hidden by default.
2. Supported templates receive a base score.
3. Strong type-template matches receive bonus points.
4. Context-specific rules add points:
   - Lead Magnet + quick result → Checklist or Quick Win Guide.
   - Lead Magnet + complex system → Playbook or Framework.
   - Bonus + ready-to-use assets → Workbook, Checklist, Resource Guide.
   - Bonus + implementation aid → Implementation Guide.
   - Sellable + deep authority → Playbook or Framework.
5. Return top 3 as recommended.
6. Reasons are deterministic Indonesian copy.

No AI calls.

## 6.5 Template application rules

When a template is selected:

- Set `template_id`.
- Do not overwrite filled Strategy fields.
- May set a suggested tone only when `tone` is empty.
- Show template details:
  - expected depth,
  - default section count,
  - best use case.
- Selecting Blank is valid.

---

# 7. Step 4 — Review

## 7.1 Review groups

### Purpose

```text
Tipe: Lead Magnet
Tujuan: Mengumpulkan email
```

### Audience and promise

```text
Topik
Target pembaca
Masalah utama
Hasil yang diberikan
```

### Business context

For Lead Magnet:

```text
Sumber traffic
Offer lanjutan
Aksi setelah membaca
Tautan
```

For Bonus Pembelian:

```text
Produk utama
Fungsi bonus
Waktu penggunaan
```

For Ebook Berbayar:

```text
Posisi produk
Keberatan pembeli
```

### Format

```text
Template
Depth
Estimated sections
```

### Metadata

```text
Judul sementara
Penulis
Niche
Gaya bahasa
```

## 7.2 Review actions

Each group has an Edit action that returns to the relevant step.

Primary button:

```text
Buat Proyek
```

Loading state:

```text
Membuat proyek dan menyiapkan strategi...
```

Success behavior:

```text
redirect /projects/{id}?stage=strategy
toast: Proyek berhasil dibuat
```

Failure behavior:

- Keep all form data.
- Display server error.
- Do not redirect.
- Do not show success toast.

---

# 8. Domain Contracts

## 8.1 Create Project V2 request

Create:

```text
lib/projects/create-project-schema.ts
```

Recommended request contract:

```ts
interface CreateProjectRequestV2 {
  version: 2;
  ebook_type: EbookType;
  template_id: string | null;

  common: {
    topic: string;
    audience: string;
    primary_problem: string;
    desired_outcome: string;
    niche: string;
    tone: string | null;
    working_title: string | null;
    author: string;
    additional_notes: string | null;
  };

  business_context:
    | {
        type: "lead_magnet";
        lead_goal: LeadGoal;
        traffic_source: string | null;
        next_offer: string | null;
        post_read_action: CtaGoal;
        cta_url: string | null;
      }
    | {
        type: "bonus_product";
        parent_product: string;
        bonus_role: BonusRole;
        usage_moment: string;
      }
    | {
        type: "sellable_ebook";
        sales_positioning: SalesPositioning;
        buyer_objections: string[];
      };
}
```

Use a Zod discriminated union on `business_context.type`.

Validation must assert:

```ts
body.ebook_type === body.business_context.type
```

## 8.2 Legacy compatibility

For one release, `POST /api/projects` should accept:

1. New V2 structured request.
2. Existing legacy flat `ProjectInput`.

Normalize both into:

```ts
interface NormalizedCreateProject {
  projectInsert: {...};
  initialState: ProjectStateV3;
}
```

Only the new UI sends V2.

Add a deprecation comment and remove legacy support in a later cleanup PR after direct consumers are confirmed absent.

## 8.3 Title and description normalization

Create:

```text
lib/projects/normalize-create-project.ts
```

Functions:

```ts
buildWorkingTitle(input): string
buildProjectDescription(input): string
buildInitialProjectState(input): ProjectStateV3
mapCreateRequestToProjectInsert(input): ProjectInsert
```

`buildProjectDescription` should create concise deterministic text from the structured brief when `additional_notes` is blank.

Example:

```text
Lead magnet untuk founder SaaS tahap awal yang kesulitan mendapatkan
lead berkualitas. Target hasil: memiliki rencana lead generation 30 hari.
Tujuan funnel: mengumpulkan email.
```

Do not include secrets or full URLs in the description.

---

# 9. Strategy State V3

## 9.1 Schema version

Change:

```ts
PROJECT_STATE_SCHEMA_VERSION = 3
```

## 9.2 EbookStrategy additions

Add:

```ts
traffic_source: string | null;
bonus_role: string | null;
usage_moment: string | null;
sales_positioning: string | null;
buyer_objections: string[];
```

Full Strategy V3 retains all existing V2 fields.

## 9.3 Mapping from creation form

### Common

| Form | Strategy |
|---|---|
| `topic` | `topic` |
| `audience` | `audience` |
| `primary_problem` | `primary_problem` |
| `desired_outcome` | `desired_outcome` |
| `tone` | `tone` |

### Lead Magnet

| Form | Strategy |
|---|---|
| `lead_goal` | `funnel_goal` |
| `traffic_source` | `traffic_source` |
| `next_offer` | `product_or_offer` |
| `post_read_action` | `cta_goal` |

### Bonus Pembelian

| Form | Strategy |
|---|---|
| `parent_product` | `product_or_offer` |
| `bonus_role` | `bonus_role` |
| `usage_moment` | `usage_moment` |

### Ebook Berbayar

| Form | Strategy |
|---|---|
| `sales_positioning` | `sales_positioning` |
| `buyer_objections` | `buyer_objections` |

`core_promise` and `unique_angle` are intentionally not fabricated during project creation. The Strategist must help refine them.

## 9.4 Type-aware requirements

Replace the static single required-field list with:

```ts
function getRequiredStrategyFields(
  ebookType: EbookType
): (keyof EbookStrategy)[]
```

Base required fields:

```text
topic
audience
primary_problem
desired_outcome
core_promise
unique_angle
```

Additional required fields:

### Lead Magnet

```text
funnel_goal
```

### Bonus Pembelian

```text
product_or_offer
bonus_role
usage_moment
```

### Ebook Berbayar

```text
sales_positioning
```

## 9.5 Readiness calculation

Change signature:

```ts
computeMissingFields(strategy, ebookType)
computeDeterministicReadinessScore(strategy, ebookType)
```

Recommended scoring:

- Base strategic fields: 70 points.
- Type-specific required fields: 20 points.
- Optional enrichment fields: 10 points.

Outline remains blocked until:

```text
readiness_score >= 70
AND no required fields are missing
```

A Bonus Pembelian must not reach outline readiness without a parent product and bonus role.

## 9.6 Legacy normalization

`normalizeProjectState` must:

- accept V2 and older state,
- add new fields with empty defaults,
- force schema version to 3,
- preserve all existing known values,
- calculate missing fields using current project `ebook_type`.

Because normalization now requires ebook type, change signature:

```ts
normalizeProjectState(raw, ebookType)
createEmptyProjectState(ebookType)
```

Update every caller.

No destructive backfill is required. Existing state can upgrade lazily on read and persist on the next write.

---

# 10. Atomic Project Creation

## 10.1 Migration

Create a new migration:

```text
supabase/migrations/20260720000002_create_project_with_state.sql
```

Create an RPC:

```sql
public.create_project_with_state(
  p_project jsonb,
  p_state jsonb,
  p_readiness_score integer
)
```

Required behavior:

1. Require authenticated `auth.uid()`.
2. Validate owner is the authenticated user.
3. Insert the project.
4. Insert the project state.
5. Return the project row.
6. Roll back automatically if either insert fails.

Use the existing RLS model and follow the repository’s Supabase security conventions.

Do not use service-role bypass in the browser.

## 10.2 API route

Update:

```text
app/api/projects/route.ts
```

POST flow:

```text
authenticate
→ parse JSON
→ validate V2 or legacy input
→ normalize
→ validate selected template compatibility
→ call create_project_with_state RPC
→ return 201
```

The server must not trust:

- client-computed readiness,
- client-computed missing fields,
- client-computed project description,
- client-computed fallback title,
- arbitrary strategy keys.

All are recomputed server-side.

## 10.3 CTA synchronization at creation

For Lead Magnet:

- Set `projects.cta_goal` from `post_read_action`.
- Set `projects.cta_url` after URL validation.
- Set Strategy `cta_goal` to the same initial goal.

`final_cta` remains null because copy has not been selected yet.

For other types:

- CTA fields default to null unless explicitly introduced in future form revisions.

---

# 11. Template API and Catalog

## 11.1 Template API

Update:

```text
app/api/templates/route.ts
```

Support optional query:

```text
GET /api/templates?ebook_type=lead_magnet
```

Behavior:

- Without query: return full catalog.
- With valid type: return compatible templates.
- Invalid type: return 400.
- Do not rank in the API unless the request also contains brief context.

The first implementation can rank client-side using shared deterministic code.

## 11.2 Catalog localization

Visible names and descriptions should be Indonesian.

Examples:

```text
Quick Win Guide
Panduan singkat untuk menghasilkan satu hasil nyata dengan cepat.

Checklist
Langkah ringkas yang langsung dapat dipraktikkan.

Panduan Implementasi
Pendamping langkah demi langkah untuk menerapkan produk utama.

Workbook
Lembar kerja untuk membantu pembaca mengambil keputusan dan bertindak.
```

Product names such as “Checklist” and “Workbook” may remain English when commonly understood, but descriptions and interface labels must be Indonesian.

---

# 12. Component Architecture

The current `page.tsx` is too large for the target flow.

## 12.1 Refactor target

Keep:

```text
app/(app)/projects/new/page.tsx
```

as a thin page shell.

Create:

```text
components/projects/new/
├── NewProjectWizard.tsx
├── NewProjectStepProgress.tsx
├── ProjectTypeStep.tsx
├── CommonBriefFields.tsx
├── LeadMagnetFields.tsx
├── BonusProductFields.tsx
├── SellableEbookFields.tsx
├── TemplateRecommendationStep.tsx
├── TemplateOptionCard.tsx
├── ProjectReviewStep.tsx
├── ReviewSection.tsx
└── TypeChangeConfirmDialog.tsx
```

Create domain logic:

```text
lib/projects/
├── create-project-schema.ts
├── normalize-create-project.ts
├── project-type-copy.ts
└── project-create-defaults.ts

lib/templates/
└── recommendation.ts
```

## 12.2 Form implementation

Continue using:

- `react-hook-form`
- `zodResolver`

Use one root form and discriminated union schema.

Recommended pattern:

```ts
const ebookType = useWatch({ control, name: "ebook_type" });
```

Render only the relevant business fields.

Use `shouldUnregister: true` for hidden type-specific fields so stale values are not accidentally submitted.

Before switching type:

- preserve common fields,
- confirm when type-specific fields are dirty,
- reset incompatible template selection.

## 12.3 Profile-based author

Do not hardcode:

```text
Mox Demo
```

Prefill from the authenticated profile.

Fallback:

```text
profile.full_name
→ profile.display_name
→ user email local part
→ "Penulis"
```

The author field may be placed under “Detail tambahan” after being prefilled.

---

# 13. Agent Integration

## 13.1 Strategist input

Update `StrategistInput.project` to include:

```ts
ebook_type: EbookType;
cta_goal: CtaGoal | null;
cta_url_present: boolean;
template_id: string | null;
```

Do not send the full CTA URL to the AI unless it is necessary. A boolean or safe domain may be enough.

## 13.2 Strategist prompt

Update the system prompt with type-specific behavior.

### Lead Magnet

Strategist should ensure:

- one clear quick win,
- alignment between lead goal and content promise,
- a natural bridge to the next offer,
- appropriate length and consumption speed,
- no excessive depth that delays conversion.

### Bonus Pembelian

Strategist should ensure:

- the bonus clearly supports the parent product,
- it does not duplicate the entire parent product,
- it is usable at the stated moment,
- it delivers a narrower outcome,
- it increases implementation success or perceived value.

### Ebook Berbayar

Strategist should ensure:

- enough standalone value,
- clear differentiation,
- sufficient depth,
- positioning suitable for a paid product,
- buyer objections are addressed honestly.

## 13.3 Strategist output schema

Add new V3 fields to:

- prompt JSON contract,
- Zod response schema,
- suggested reply field enum,
- parser scalar/array key lists.

The AI must not change `ebook_type`.

## 13.4 Planner

Planner input already consumes structured Strategy. Add explicit prompt rules:

### Lead Magnet

- Prefer concise, quick-consumption outlines.
- Default 5–7 sections.
- Deliver a quick win before the final CTA.
- Avoid a long textbook structure.

### Bonus Pembelian

- Organize around the usage moment.
- Reference the parent product without assuming unavailable content.
- Default 4–7 sections.
- End with an implementation checklist or next step.

### Ebook Berbayar

- Default 7–10 sections.
- Allow deeper frameworks and examples.
- Address relevant buyer objections in content.

Template metadata may influence default section count.

## 13.5 Writer

Writer must receive:

```text
ebook_type
template format
type-specific strategy fields
```

Writing rules:

- Lead Magnet: concise, fast, action-oriented.
- Bonus Pembelian: companion language; do not present as unrelated standalone theory.
- Ebook Berbayar: more comprehensive and polished.

Do not add fake claims, urgency, or product details.

---

# 14. Validation Rules

## 14.1 General

- Trim all strings.
- Convert empty optional strings to null.
- Maximum limits:
  - title: 120
  - author: 120
  - topic: 200
  - audience: 500
  - problem: 1000
  - desired outcome: 1000
  - notes: 4000
  - parent product: 500
  - usage moment: 500
  - traffic source: 200
- Arrays:
  - buyer objections maximum 8
  - each objection maximum 300

## 14.2 CTA URL

Use existing HTTP/HTTPS URL validation.

If `post_read_action` requires a URL:

```text
cta_url must be non-empty and valid.
```

Validation occurs:

1. In the client.
2. In the create request Zod schema.
3. In the API.
4. Again during publish.

## 14.3 Template compatibility

The API must reject a template that does not support the submitted ebook type.

Do not rely only on filtered UI.

## 14.4 Error copy

Examples:

```text
Pilih tujuan lead magnet.
Masukkan produk utama untuk bonus ini.
Jelaskan kapan bonus akan digunakan.
Masukkan tautan HTTP atau HTTPS yang valid.
Template ini tidak tersedia untuk tipe ebook yang dipilih.
```

Avoid generic copy such as `Min 3` and `Wajib` when a more specific message is possible.

---

# 15. State and Data Synchronization

## 15.1 Canonical sources

| Data | Canonical source |
|---|---|
| Ebook type | `projects.ebook_type` |
| Working/final project title | `projects.title` |
| Search/display audience | `projects.audience` |
| Structured audience | Strategy state |
| Business strategy | Strategy state |
| Template selection | `projects.template_id` |
| Publication CTA goal/url/text | `projects` CTA columns |
| Initial CTA intent | Strategy + projects, seeded together |

## 15.2 Editing after creation

The Strategy page already supports direct brief editing.

Add new V3 fields to:

- Strategy brief card,
- Strategy field editor,
- field labels,
- readiness display.

Use type-specific labels:

### `product_or_offer`

- Lead Magnet: `Produk/layanan lanjutan`
- Bonus Pembelian: `Produk utama`
- Ebook Berbayar: `Offer atau bundle terkait`

### `funnel_goal`

- Lead Magnet: `Tujuan lead magnet`
- Bonus Pembelian: hide unless relevant
- Ebook Berbayar: `Tujuan penjualan`

Do not show every field for every type.

---

# 16. Implementation Tasks

Each task should be completed and tested before moving to dependent tasks.

---

## Task 1 — Add domain enums and Indonesian type copy

**Files**

```text
types/project.ts
types/template.ts
lib/projects/project-type-copy.ts
```

**Work**

- Keep internal `EbookType` values.
- Change visible labels:
  - Bonus Product → Bonus Pembelian
  - Sellable Ebook → Ebook Berbayar
- Add LeadGoal, BonusRole, SalesPositioning, and TemplateFormat.
- Add reusable label maps.

**Acceptance criteria**

- No duplicated label strings in page components.
- All visible type descriptions are Indonesian.
- Existing database enum values remain unchanged.

**Tests**

- Domain copy map returns a label and description for every enum value.

**Suggested commit**

```text
feat(projects): add type-aware project creation contracts
```

---

## Task 2 — Add Strategy V3 fields and normalization

**Files**

```text
types/strategy.ts
lib/project-state/normalize.ts
lib/validations/strategy.ts
```

**Work**

- Bump schema version to 3.
- Add new fields.
- Make missing fields and readiness type-aware.
- Normalize V2 states into V3.
- Update safe merge scalar and array key lists.

**Acceptance criteria**

- Existing V2 state normalizes without data loss.
- Unknown keys are still dropped.
- Bonus project requires parent product, bonus role, and usage moment.
- Lead Magnet requires funnel goal.
- Readiness is deterministic.

**Tests**

```text
lib/project-state/normalize.test.ts
```

Add cases for all three ebook types and V2 migration.

**Suggested commit**

```text
feat(strategy): add type-aware project state v3
```

---

## Task 3 — Create V2 project request schema and normalizer

**Files**

```text
lib/projects/create-project-schema.ts
lib/projects/normalize-create-project.ts
lib/projects/project-create-defaults.ts
```

**Work**

- Implement discriminated union.
- Add conditional CTA validation.
- Build project insert and initial Strategy state.
- Build deterministic fallback title and description.
- Normalize empty optional values.

**Acceptance criteria**

- Invalid business context/type combinations fail.
- Missing bonus parent product fails.
- Missing required CTA URL fails.
- Initial state contains all user-entered strategic information.
- No core promise or unique angle is fabricated.

**Tests**

Add at least:

```text
lead valid
lead invalid URL
bonus valid
bonus missing parent product
sellable valid
type/context mismatch
fallback title
description generation
```

**Suggested commit**

```text
feat(projects): normalize structured project creation brief
```

---

## Task 4 — Extend template catalog and recommendation engine

**Files**

```text
types/template.ts
lib/templates-catalog.ts
lib/templates/recommendation.ts
app/api/templates/route.ts
```

**Work**

- Add compatibility metadata.
- Add new templates.
- Implement deterministic ranking.
- Filter incompatible templates.
- Return localized reasons.

**Acceptance criteria**

- Lead Magnet ranks Checklist or Quick Win Guide for quick-win context.
- Bonus implementation context ranks Implementation Guide.
- Blank remains available.
- Existing template IDs remain stable.
- API rejects invalid ebook type query.

**Tests**

```text
lib/templates/recommendation.test.ts
```

Cover ranking and compatibility.

**Suggested commit**

```text
feat(templates): recommend formats by ebook purpose
```

---

## Task 5 — Add atomic project + state RPC

**Files**

```text
supabase/migrations/20260720000002_create_project_with_state.sql
```

**Work**

- Add transactional function.
- Authenticate owner.
- Insert project and state atomically.
- Return project row.
- Follow RLS/security conventions.

**Acceptance criteria**

- State failure rolls back project insert.
- Project failure creates neither row.
- Owner cannot be forged.
- Function can be called from the authenticated server route.

**Tests**

- Add SQL/integration evidence or API test with forced failure where feasible.

**Suggested commit**

```text
feat(db): create projects and strategy state atomically
```

---

## Task 6 — Update POST `/api/projects`

**Files**

```text
app/api/projects/route.ts
types/project.ts
lib/api/hooks.ts
```

**Work**

- Parse and validate V2.
- Temporarily normalize legacy input.
- Validate template compatibility.
- Compute initial state and readiness server-side.
- Call RPC.
- Set project CTA fields for Lead Magnet.
- Return structured validation errors.

**Acceptance criteria**

- New UI request creates project and non-empty project state.
- Failed state creation cannot leave orphan project.
- Legacy request still works during compatibility window.
- Client cannot submit arbitrary state keys.
- API returns 201 only after both records exist.

**Tests**

Add API/service-level tests for success, invalid URL, invalid template, and transaction failure.

**Suggested commit**

```text
feat(api): create type-aware projects with seeded strategy
```

---

## Task 7 — Build wizard shell

**Files**

```text
app/(app)/projects/new/page.tsx
components/projects/new/NewProjectWizard.tsx
components/projects/new/NewProjectStepProgress.tsx
```

**Work**

- Move page logic into wizard.
- Implement four-step state.
- Add Back/Next.
- Add responsive progress.
- Keep one form instance.

**Acceptance criteria**

- Step state is preserved when navigating backward.
- User cannot continue from invalid step.
- Back to projects works.
- Mobile has no horizontal overflow.
- All headings and buttons are Indonesian.

**Tests**

Component test for navigation and validation blocking.

**Suggested commit**

```text
feat(projects): add four-step new project wizard
```

---

## Task 8 — Implement Purpose step

**Files**

```text
components/projects/new/ProjectTypeStep.tsx
components/projects/new/TypeChangeConfirmDialog.tsx
```

**Work**

- Add three detailed cards.
- Add keyboard and screen-reader states.
- Add type-change confirmation.
- Reset incompatible fields and template safely.

**Acceptance criteria**

- Common fields are preserved after type change.
- Type-specific values are removed.
- No confirmation is shown when nothing type-specific was entered.
- Selected type is visually obvious.

**Tests**

Switch type with and without dirty context.

**Suggested commit**

```text
feat(projects): add ebook purpose selection
```

---

## Task 9 — Implement common brief fields

**Files**

```text
components/projects/new/CommonBriefFields.tsx
```

**Work**

- Add common field copy.
- Prefill author from profile.
- Default tone.
- Make title optional.
- Move secondary fields into a compact advanced section if needed.

**Acceptance criteria**

- No hardcoded demo author.
- Field errors are specific.
- Title is clearly marked temporary/optional.
- Brief can be completed without choosing a final title.

**Tests**

Profile author fallback and field validation.

**Suggested commit**

```text
feat(projects): add structured common ebook brief
```

---

## Task 10 — Implement Lead Magnet fields

**Files**

```text
components/projects/new/LeadMagnetFields.tsx
```

**Work**

- Add lead goal.
- Add traffic source.
- Add next offer.
- Add CTA action and conditional URL.
- Use localized CTA labels.

**Acceptance criteria**

- URL appears only when required.
- Invalid or blank required URL blocks Next.
- Switching CTA goal recalculates validation immediately.
- Data survives Back/Next.

**Tests**

At least five CTA and lead-goal scenarios.

**Suggested commit**

```text
feat(projects): add lead magnet business brief
```

---

## Task 11 — Implement Bonus and Sellable fields

**Files**

```text
components/projects/new/BonusProductFields.tsx
components/projects/new/SellableEbookFields.tsx
```

**Work**

- Add parent product, bonus role, usage moment.
- Add sales positioning and buyer objections.
- Render based on ebook type.

**Acceptance criteria**

- Bonus cannot continue without parent product.
- Bonus desired outcome is framed as bonus outcome.
- Sellable flow remains usable.
- Hidden fields are unregistered.

**Tests**

Render/validation tests for both types.

**Suggested commit**

```text
feat(projects): add bonus and sellable ebook briefs
```

---

## Task 12 — Implement recommendation step

**Files**

```text
components/projects/new/TemplateRecommendationStep.tsx
components/projects/new/TemplateOptionCard.tsx
```

**Work**

- Rank templates from form context.
- Show top three recommendations.
- Show deterministic reason.
- Allow “Lihat format lainnya”.
- Keep Blank available.
- Do not overwrite brief fields.

**Acceptance criteria**

- Recommendations update when relevant brief fields change.
- Selected template resets if type becomes incompatible.
- Template apply never overwrites filled audience/niche/tone.
- Loading and empty states are handled.

**Tests**

Recommendation display and selection behavior.

**Suggested commit**

```text
feat(projects): add contextual template recommendations
```

---

## Task 13 — Implement Review and submit

**Files**

```text
components/projects/new/ProjectReviewStep.tsx
components/projects/new/ReviewSection.tsx
components/projects/new/NewProjectWizard.tsx
```

**Work**

- Show complete summary.
- Add Edit links.
- Submit V2 request.
- Preserve form on failure.
- Redirect to Strategy on success.

**Acceptance criteria**

- Review contains all active type-required fields.
- No hidden stale fields are displayed or submitted.
- Double submit is prevented.
- Loading copy is clear.
- Failure keeps data and selected step.

**Tests**

Lead, Bonus, and Sellable submit payload snapshots.

**Suggested commit**

```text
feat(projects): review and create structured project briefs
```

---

## Task 14 — Seed and display new Strategy fields

**Files**

```text
components/workspace/StrategyBriefCard.tsx
components/workspace/StrategyFieldEditor.tsx
components/workspace/StrategyBriefSheet.tsx
components/workspace/StrategyReadinessCard.tsx
```

**Work**

- Add type-specific fields.
- Use type-specific labels.
- Hide irrelevant fields.
- Show initial values immediately after project creation.

**Acceptance criteria**

- User is not asked again for already entered information.
- Bonus page shows product and role correctly.
- Lead page shows funnel goal and traffic source.
- Readiness uses type-aware requirements.

**Tests**

Strategy brief rendering for all three types.

**Suggested commit**

```text
feat(strategy-ui): show type-aware seeded brief fields
```

---

## Task 15 — Update Strategist contract and prompt

**Files**

```text
lib/ai/prompts.ts
lib/ai/agents/strategist.ts
app/api/projects/[id]/chat/route.ts
```

**Work**

- Add V3 fields to AI schema.
- Include ebook type in prompt context.
- Add type-specific questioning rules.
- Do not re-ask seeded facts.
- Keep contextual replies in the user’s language.

**Acceptance criteria**

- Lead Strategist asks about missing promise/angle, not known funnel goal.
- Bonus Strategist grounds advice in the parent product.
- AI cannot output unknown Strategy keys.
- Suggested reply field enum supports V3.

**Tests**

Parser tests and prompt/context builder tests.

**Suggested commit**

```text
feat(ai): make strategist aware of ebook business type
```

---

## Task 16 — Update Planner and Writer context

**Files**

```text
lib/ai/prompts.ts
lib/ai/agents/planner.ts
lib/ai/agents/writer.ts
app/api/projects/[id]/outline/generate/route.ts
app/api/projects/[id]/sections/generate/route.ts
```

**Work**

- Pass ebook type and template metadata.
- Add type-specific outline defaults.
- Add type-specific writing constraints.
- Preserve existing shared Strategy context.

**Acceptance criteria**

- Lead Magnet does not default to an unnecessarily long textbook.
- Bonus content clearly supports the parent product.
- Sellable ebook still permits deeper content.
- No fabricated parent-product claims.

**Tests**

Prompt-input contract tests for each type.

**Suggested commit**

```text
feat(ai): propagate ebook purpose through planner and writer
```

---

## Task 17 — Documentation and cleanup

**Files**

```text
docs/user-flows.md
docs/ai-prompts.md
docs/database-schema.md
docs/api-spec.md
README.md
```

**Work**

- Document the wizard.
- Document Strategy V3.
- Document request V2.
- Document migration/RPC.
- Remove obsolete UI wording.
- Note legacy request deprecation.

**Acceptance criteria**

- Docs match actual request and state contracts.
- No docs call Bonus Pembelian a generic standalone ebook.
- Deployment notes list the new migration.

**Suggested commit**

```text
docs: document type-aware project creation flow
```

---

## Task 18 — Full verification

**Commands**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
```

Use the repository’s actual available scripts; do not invent a lint command if none exists.

**Required evidence**

- Test count and status.
- TypeScript clean.
- Production build clean.
- Screenshots for desktop and mobile.
- Database migration applied in test/staging.
- Manual creation evidence for all three types.

**Suggested commit**

```text
test(projects): cover type-aware project creation end to end
```

---

# 17. Test Matrix

## 17.1 Unit tests

### Schema

- Valid Lead Magnet.
- Lead required CTA URL missing.
- Lead invalid URL.
- Valid Bonus.
- Bonus missing product.
- Bonus missing usage moment.
- Valid Sellable.
- Type/context mismatch.
- Unknown key rejected.
- Empty strings normalized.

### Strategy V3

- Empty state per type.
- V2 → V3 migration.
- Required fields per type.
- Readiness per type.
- Safe merge.
- Unknown fields dropped.

### Template recommendation

- Lead quick win.
- Lead complex framework.
- Bonus implementation.
- Bonus ready-to-use assets.
- Sellable premium.
- Unsupported template hidden.
- Stable tie ordering.

### Project normalization

- Fallback title.
- Description generation.
- Initial CTA mapping.
- No fabricated promise/angle.
- Project/state data consistency.

## 17.2 Component tests

- Four-step navigation.
- Current step validation.
- Type switching confirmation.
- Common field persistence.
- Hidden field unregistration.
- Conditional CTA URL.
- Recommendation ranking display.
- Template selection.
- Review summary.
- Submit disabled/loading/error.
- Indonesian copy.

## 17.3 API tests

- Authentication required.
- V2 create success.
- Legacy create success.
- Invalid template rejected.
- Invalid CTA rejected before database call.
- RPC error returned.
- Atomic rollback.
- Initial state is non-empty and normalized.
- Owner is authenticated user.

## 17.4 E2E journeys

Do not call live AI in these creation tests.

### Journey A — Lead Magnet

```text
Create Lead Magnet
→ enter acquisition and CTA context
→ choose Checklist
→ review
→ create
→ Strategy page
→ seeded fields visible
→ no repeated question for known audience/goal
```

### Journey B — Bonus Pembelian

```text
Create Bonus Pembelian
→ enter parent product, role, usage moment
→ choose Implementation Guide
→ review
→ create
→ Strategy page
→ product and bonus context visible
```

### Journey C — Ebook Berbayar

```text
Create Ebook Berbayar
→ enter sales positioning
→ choose Playbook
→ create
→ Strategy remains functional
```

### Journey D — Failure preservation

```text
Submit
→ server returns 500
→ remain on Review
→ all form data remains
→ retry is possible
```

---

# 18. Analytics and Product Signals

Optional but recommended.

Events:

```text
project_create_started
project_type_selected
project_brief_step_completed
project_template_recommended
project_template_selected
project_create_completed
project_create_failed
```

Properties:

```text
ebook_type
template_id
recommended_template_selected
step
validation_error_field
```

Do not send free-text brief contents to analytics.

Success metrics:

- Project creation completion rate.
- Time to first project.
- Percentage selecting recommended format.
- Strategy turns required before outline readiness.
- Drop-off by wizard step.
- Lead vs Bonus vs Sellable distribution.

The strongest expected product metric is:

```text
fewer Strategist turns before outline readiness
```

because the initial state is no longer empty.

---

# 19. Accessibility Requirements

- Every input has a visible label.
- Type cards use buttons and `aria-pressed`.
- Step progress announces current step.
- Validation errors are associated through `aria-describedby`.
- Error summary receives focus after failed Next/Submit.
- Dialog focus is trapped and restored.
- Color is not the only selected-state indicator.
- Template recommendations include visible text, not only stars/colors.
- Mobile tap targets are at least approximately 44px.
- All screen-reader labels are Indonesian.

---

# 20. Security and Integrity

- Validate all data server-side.
- Reject unknown keys with strict Zod schemas.
- Never trust `owner_id` from client.
- Never trust client readiness score.
- Never trust template compatibility from client.
- Do not send full CTA URL to AI by default.
- Store URLs only after HTTP/HTTPS validation.
- Create project and state transactionally.
- Keep RLS active.
- Log server failures without logging full user brief or sensitive URLs.
- Rate limiting remains the responsibility of existing API middleware/conventions.

---

# 21. Backward Compatibility

## 21.1 Existing projects

- Existing `projects.ebook_type` values remain valid.
- Existing Strategy V2 state is normalized to V3 lazily.
- Existing projects may show new fields as missing.
- Do not block opening or editing existing projects.

## 21.2 Existing templates

- Existing template IDs remain valid.
- Add compatibility metadata to existing catalog entries.
- Do not change saved `template_id`.

## 21.3 Existing API clients

- Support legacy flat `ProjectInput` for one compatibility period.
- Add a deprecation comment and optional warning log.
- New UI sends only V2.

## 21.4 Existing publication CTA

- Project CTA columns remain unchanged.
- Lead creation may prefill CTA goal and URL.
- Final CTA copy remains selected later in Review.

---

# 22. Rollout Plan

## Phase 1 — Domain and persistence

Tasks 1–6.

Feature flag optional:

```text
NEXT_PUBLIC_NEW_PROJECT_WIZARD_V2
```

Use only if production rollout risk is high. Avoid maintaining two flows longer than necessary.

## Phase 2 — Wizard UI

Tasks 7–13.

Deploy to staging and validate all three flows.

## Phase 3 — Agent propagation

Tasks 14–16.

Verify no regression to existing Strategy, Planner, and Writer flows.

## Phase 4 — Documentation and release

Tasks 17–18.

Apply migration before deploying application code that calls the RPC.

Deployment order:

```text
1. Database migration
2. Server/API code
3. Client UI
4. Smoke tests
```

---

# 23. Rollback Plan

If UI issues occur:

- Re-enable old page through feature flag.
- Keep V2 API and RPC deployed; they are backward compatible.

If RPC issues occur:

- Disable V2 UI.
- Route legacy create requests through the existing path temporarily.
- Do not remove the migration immediately; functions are additive.

If Strategy V3 issues occur:

- Normalize V3 fields as optional.
- Continue reading existing V2 values.
- Do not downgrade or delete stored state fields.

Never roll back by deleting user-created projects or project state.

---

# 24. Definition of Done

This initiative is complete only when all statements below are true.

## UX

- [ ] New Project uses `Tujuan → Brief → Format → Tinjau`.
- [ ] All visible and accessibility copy is Indonesian.
- [ ] Lead Magnet and Bonus Pembelian have different business-context fields.
- [ ] Title is optional and clearly provisional.
- [ ] Author is prefilled from the user profile.
- [ ] Templates are recommended after the brief.
- [ ] Template selection does not silently overwrite brief fields.
- [ ] Mobile and desktop flows are usable.

## Data

- [ ] Create request uses a strict discriminated union.
- [ ] Project state is seeded from the form.
- [ ] Strategy V3 supports type-specific context.
- [ ] Readiness is type-aware.
- [ ] Project and state are created atomically.
- [ ] CTA URL validation is enforced server-side.
- [ ] Existing projects and templates remain compatible.

## Agents

- [ ] Strategist receives ebook type and seeded state.
- [ ] Strategist does not re-ask known facts.
- [ ] Planner adapts structure to ebook purpose.
- [ ] Writer receives type-specific context.
- [ ] Bonus content supports the parent product.
- [ ] Lead Magnet content remains conversion-oriented and appropriately concise.

## Quality

- [ ] Unit tests cover all discriminated union paths.
- [ ] Component tests cover conditional fields and navigation.
- [ ] API tests cover atomic creation and validation.
- [ ] E2E covers all three ebook types without live AI spending.
- [ ] TypeScript is clean.
- [ ] Production build succeeds.
- [ ] CI is green.
- [ ] Documentation matches implementation.
- [ ] New migration is included in deployment documentation.

---

# 25. Non-Goals

Do not expand this implementation into unrelated scope.

Not included:

- AI-generated title during project creation.
- Live AI template recommendation.
- Pricing/payment checkout for Ebook Berbayar.
- Full landing-page builder.
- New claim-page redesign.
- Nested chapter architecture.
- Template marketplace.
- Custom user template editor.
- Full funnel analytics.
- Automatic CTA copy generation during creation.
- Replacing the existing five-stage workspace.

These can be separate initiatives after the type-aware creation foundation is stable.

---

# 26. Coding Agent Execution Rules

1. Read this document fully before changing code.
2. Inspect the latest branch before assuming file contents.
3. Do not rewrite working workspace components unnecessarily.
4. Implement tasks in dependency order.
5. Add or update tests in the same commit as behavior changes.
6. Do not use mocked AI output in production paths.
7. Do not silently fall back when a strict contract fails.
8. Do not skip server-side validation because the UI validates.
9. Do not rename internal ebook type values.
10. Do not change existing template IDs.
11. Do not overwrite user brief fields when selecting templates.
12. Do not return project creation success before project state exists.
13. Do not claim completion without:
    - test output,
    - `tsc` result,
    - build result,
    - changed-file summary,
    - migration status,
    - screenshots or E2E evidence.

---

# 27. Final Target Architecture

```text
New Project Wizard
│
├── Purpose selection
│   └── projects.ebook_type
│
├── Type-aware structured brief
│   ├── common strategy fields
│   ├── lead context
│   ├── bonus context
│   └── sellable context
│
├── Deterministic template recommendation
│   └── compatible template_id
│
├── Review
│
└── POST /api/projects (V2)
    │
    ├── strict server validation
    ├── deterministic normalization
    ├── initial Strategy V3
    └── Postgres RPC transaction
        ├── insert projects
        └── insert project_states
                │
                ▼
Strategy Workspace
├── seeded brief visible immediately
├── type-aware readiness
├── contextual Strategist
│       ▼
Planner
│       ▼
Writer
│       ▼
Review / CTA / Publish
```

The product outcome should be:

> Publiora understands not only what ebook the user wants to write, but why it exists, how it supports the user’s business, and what format best serves that purpose.
