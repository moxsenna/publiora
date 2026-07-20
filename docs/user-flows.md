# user-flows.md -- Publiora (Workflow-First)

## 1. Overview

Publiora core flow:

```
Create Ebook -> Generate -> Publish -> Share Claim Link -> Reader Access
```

Primary users:
- Creator
- Reader / Buyer

---

## 2. Creator Flow -- Create Ebook (Five-Stage Workspace)

### Goal

Creator builds a marketing-ready ebook with AI through a structured five-stage workspace.

### Workspace Stages

```
Strategy -> Outline -> Write -> Review -> Publish
```

### Steps

**1. Login**
User navigates to `app.publiora.web.id` and authenticates.

**2. Dashboard**
User views existing projects, published ebooks, and a "Create New Ebook" button.

**3. Create New Ebook (offer-aware wizard at `/projects/new`)**

Three-step wizard: `Tujuan → Ide & Produk → Format`.

1. **Tujuan** — choose purpose: Lead Magnet (`lead_magnet`), Bonus Pembelian (`bonus_product`), Ebook Berbayar (`sellable_ebook`).
2. **Ide & Produk** — idea + Offer picker / quick create / no-offer (Lead only); type-specific context (lead goal, bonus intent chips, sellable role modes). Selecting an offer prefills audience/niche/CTA without overwriting user-edited fields.
3. **Format** — template recommendations + compact summary + **Buat Proyek**.

Offer rules:

- Lead Magnet: primary offer optional (`Belum ada produk`).
- Bonus Pembelian: saved or quick-created offer required (`bonus_for`).
- Ebook Berbayar: standalone (no offer) \| bundle (`bundle_component`) \| entry (`upsells_to`).

Server: `POST /api/projects` prefers **Create Project V3** (offer_context + atomic RPC `create_project_with_context_v3`). V2 and legacy flat still accepted. Redirect `/projects/{id}?stage=strategy`.

**3b. Produk & Penawaran library (`/offers`)**

Sidebar: **Produk & Penawaran**. List/search/filter, create/edit/archive, linked projects, shortcuts “Buat Lead Magnet / Bonus” with `?ebook_type=&offer_id=` preselection.

When an offer changes, linked projects show **Produk telah diperbarui**. User opens sync dialog, picks fields, applies explicitly — Strategy/CTA may update; generated sections and published ebooks do not.

**4. Stage 1 -- Strategy (AI-Guided Brief Builder)**

The Strategy stage is an AI-guided brief builder, not a generic chatbot. The interface has two panels:

- **Left panel:** Conversation with the AI Strategist. The assistant asks one strategic question per turn in Bahasa Indonesia (default) or English.
- **Right panel (desktop):** Structured brief (Brief Ebook) with type-aware labels/fields + readiness score card (Kesiapan Strategi). On mobile, the brief is accessible via a bottom sheet.

Key UX features:
- **Seeded brief:** Creation already fills known strategy fields so Strategist does not re-ask known facts.
- **Contextual quick replies:** The latest assistant message shows clickable chip suggestions (2-4 per turn). Each chip sends a complete first-person reply.
- **Starter chips (empty state):** When the conversation is empty, 3 static starter chips appear ("Cari topik ebook", "Saya sudah punya topik", "Ebook untuk leads").
- **Indonesian-first UI:** Labels, placeholders, buttons, and helper text are in Bahasa Indonesia. The assistant name is "Asisten Strategi" and the brief is "Brief Ebook".
- **Manual brief editing:** Users can click "Edit brief" or tap a field to open StrategyFieldEditor. Manual edits update `strategy.updated_at`, which invalidates old assistant chips as stale context.
- **Type-aware outline gate:** Required fields = base 6 + type extras. Outline unlocks when readiness_score >= 70 AND no required fields missing.
- **Mobile brief sheet:** On screens <lg, a compact trigger opens a bottom sheet with the brief and readiness card.
- **No raw markdown in assistant bubble:** Assistant messages are rendered through `AssistantMessageContent`.

Strategy V3 fields:

Core (base required):
- Ebook topic (topik)
- Target audience (target pembaca)
- Primary problem (masalah utama)
- Desired outcome (hasil yang diinginkan)
- Core promise (janji utama)
- Unique angle (sudut unik)

Type extras (required by type):
- Lead Magnet: funnel_goal
- Bonus Pembelian: product_or_offer, bonus_role, usage_moment
- Ebook Berbayar: sales_positioning

Advanced / enrichment (type-filtered):
- Audience sophistication, pain points, content pillars, CTA goal, tone
- Lead: traffic_source, next offer
- Bonus: parent product / role / usage moment
- Sellable: sales positioning, buyer objections

Output: Structured strategy with readiness score. When readiness >= 70 and all type-required fields are filled, the Outline stage unlocks.

**5. Stage 2 -- Outline**
AI Planner generates a section-structured outline from the approved strategy.
User can:
- Edit section titles and summaries
- Reorder sections
- Add/remove sections
- Regenerate outline (with regeneration safety confirmation)

Output: Approved outline with sections.

**6. Stage 3 -- Write**
AI Writer generates content per section. User can:
- Edit content via RichTextEditor
- Regenerate individual sections
- Apply AI enhancements (expand, shorten, simplify, persuasive, professional, examples, checklist)
- Review enhancement suggestions side-by-side before accepting

Output: All sections generated and edited.

**7. Stage 4 -- Review**
User reviews the complete ebook:
- Readiness checklist showing blockers, warnings, and passed checks
- Final title and subtitle editing
- Title suggestions (one per style)
- CTA composer (goal, text, URL, placement)
- Live HTML preview

Output: All blockers resolved, final title and CTA set.

**8. Stage 5 -- Publish**
User publishes the ebook:
- Publication summary (title, author, sections, CTA)
- Blockers/warnings display
- Visibility selection (public/private)
- Publish action creates snapshot in `published_ebooks`

Output: Ebook URL at `publiora.web.id/read/:slug`.

---

## 3. Creator Flow -- Publish Ebook

### Goal

Creator publishes ebook as a hosted reader with claim link support.

### Visibility Options

- **Public**: Anyone can read via the slug.
- **Private**: Only accessible via claim links.

### Output

`publiora.web.id/read/:slug`

---

## 4. Creator Flow -- Create Claim Link

### Goal

Creator creates a managed access link for buyers from external platforms.

### Flow

```
Open Published Ebook -> Access Settings -> Create Claim Link -> Configure -> Share
```

### Claim Link Settings

- Link name
- Max claims
- Expiration date
- Active/inactive
- Target ebook

### Distribution Channels

Creator can share claim links on:
- Scalev thank you page
- Lynk.id product page
- Email autoresponder
- WhatsApp auto-reply
- Telegram group
- Bonus delivery page

---

## 5. Reader Flow -- Claim Ebook

### Goal

Buyer gets instant access to purchased ebook.

### Steps

1. Open Claim Link (`publiora.web.id/claim/:token`)
2. View claim page (ebook title, creator, description)
3. Login/Register if needed
4. Access granted (entitlement created)
5. Ebook added to library (`app.publiora.web.id/library`)
6. Open reader

---

## 6. Reader Flow -- Read Ebook

### Goal

Reader reads ebook online in the Publiora reader.

### Reader Features (MVP)

- Section navigation
- Reading progress tracking
- Mobile-friendly layout
- Clean typography
- CTA block from creator

---

## 7. Creator Flow -- Manage Claim Links

### Goal

Creator manages distribution access for published ebooks.

### Actions

- Create new claim link
- Copy link
- Enable/disable link
- Set max claims
- Set expiry date
- View claim count

---

## 8. Creator Flow -- Update Published Ebook

### Goal

Creator updates ebook content without sending new file.

### Flow

```
Open Project -> Edit Content -> Preview -> Republish -> Reader sees latest version
```

Readers with existing access automatically see the latest version after republish.

---

## 9. Error Flows

### Invalid Claim Link
> Link akses tidak valid atau sudah tidak aktif.

### Expired Claim Link
> Link akses ini sudah kedaluwarsa.

### Max Claims Reached
> Kuota klaim untuk link ini sudah habis.

### Already Claimed
> Ebook ini sudah ada di library kamu.

### Private Ebook Without Access
> Kamu belum memiliki akses ke ebook ini.

### Insufficient Credits
> Kredit tidak cukup. Upgrade plan atau beli top-up untuk lanjut generate.

### Publish Blocked
> Publish blocked -- resolve issues before publishing. Shows specific blockers with links to relevant stages.

---

## 10. MVP Success Flow

Creator creates ebook -> Publishes ebook -> Creates claim link -> Shares on external platform -> Buyer claims ebook -> Buyer reads inside Publiora -> Creator keeps using Publiora

---

## 11. Primary UX Principle

Publiora should make creators feel:
> "Saya tidak perlu kirim PDF manual lagi."

And readers feel:
> "Bonus saya langsung rapi dan mudah dibaca."
