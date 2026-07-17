# sprint-plan.md — Publiora MVP

## Overview

Sprint plan ini mengikuti 6 build phases dari ARCHITECTURE.md,
dipecah menjadi sprint 1 minggu per sprint.

Stack: Next.js + Tailwind + Supabase + Cloudflare Pages
AI: platform-managed models + subscription credits
Infrastruktur: Cloudflare Pages Functions + Supabase Edge Functions

Total estimasi MVP: **10 Sprint (10 Minggu)**

Core loop yang harus selesai:
```
Create Ebook → Generate → Publish → Share Claim Link → Reader Access
```

---

## Sprint 1 — Project Setup & Auth
**Phase: Foundation**
**Goal:** Proyek bisa dijalankan, user bisa register dan login.

### Tasks

**Setup & Infrastruktur**
- [ ] Init Next.js project (App Router, TypeScript, Tailwind CSS)
- [ ] Setup Supabase project (Auth, Postgres, Storage)
- [ ] Setup Cloudflare Pages deployment
- [ ] Konfigurasi environment variables
- [ ] Setup folder structure (app/, components/, lib/, types/)
- [ ] Install dependencies: Zustand, TanStack Query, Lucide icons

**Database**
- [ ] Buat migration: `profiles` table
- [ ] Setup Supabase Auth (email/password)
- [ ] Setup trigger: auto-create profile on user signup
- [ ] Row Level Security (RLS) untuk `profiles`

**Auth UI**
- [ ] Halaman `/login` — form email + password
- [ ] Halaman `/register` — form name + email + password
- [ ] Auth redirect logic (protected routes)
- [ ] Session management dengan Supabase Auth SDK
- [ ] Layout dasar: app shell, sidebar placeholder

**Design System Bootstrap**
- [ ] Setup Tailwind config: warna (#0A0A0A, #FAFAF8, #E5E5E5, #2563EB, #059669)
- [ ] Setup font: Plus Jakarta Sans (heading) + Inter (body)
- [ ] Komponen dasar: Button (primary, secondary, ghost), Input, Card

### Definition of Done
- User bisa register, login, logout
- Session persists setelah refresh
- Protected route redirect ke login jika belum auth
- Design system dasar terpasang

---

## Sprint 2 — Dashboard & Project Management
**Phase: Foundation**
**Goal:** Creator bisa membuat dan mengelola ebook projects.

### Tasks

**Database**
- [ ] Migration: `projects` table + indexes
- [ ] Migration: `project_states` table
- [ ] RLS untuk `projects` (user hanya lihat project miliknya)
- [ ] Check constraints: `ebook_type`, `status`

**API / Edge Functions**
- [ ] `POST /projects` — create project
- [ ] `GET /projects` — list user projects
- [ ] `GET /projects/:id` — project detail
- [ ] `PATCH /projects/:id` — update title/metadata
- [ ] `DELETE /projects/:id` — delete project

**Dashboard UI**
- [ ] Halaman `/dashboard` — recent projects, quick actions
- [ ] Halaman `/projects` — project list (card grid)
- [ ] Komponen: ProjectCard (title, status badge, updated date)
- [ ] Modal: Create New Ebook (pilih ebook type: Lead Magnet / Bonus Product / Sellable Ebook)
- [ ] Empty state: "Buat ebook marketing pertama kamu."
- [ ] Status badge: draft, generating, ready, published

**Billing & Credits**
- [ ] Migration: `subscriptions`, `credit_balances`, `credit_transactions`
- [ ] Halaman `/settings/billing`
- [ ] `GET /billing/balance` · `GET /billing/plans` · `GET /billing/packs`
- [ ] `POST /billing/change-plan` · `POST /billing/purchase-pack`
- [ ] UI: saldo kredit, plan cards, top-up packs, riwayat
- [ ] Charge credits on outline/section/title/CTA generation
- [ ] Error `insufficient_credits` di UI generate

### Definition of Done
- Creator bisa buat project baru dengan memilih ebook type
- Project list tampil di dashboard
- Billing page menampilkan plan + saldo kredit
- Generate menolak request jika kredit tidak cukup

---

## Sprint 3 — AI Strategist Chat
**Phase: AI Generator**
**Goal:** Creator bisa brainstorming ebook dengan AI strategist.

### Tasks

**Database**
- [ ] Migration: `messages` table + indexes
- [ ] RLS untuk `messages`

**AI Orchestration**
- [ ] Setup platform AI client (server-side only, env keys)
- [ ] Check credit balance before generation
- [ ] Implementasi Conversation Strategist Agent prompt (dari ai-prompts.md)
- [ ] Input builder: `{ structured_state, conversation_summary, latest_user_message }`
- [ ] Output parser: `{ assistant_message, state_patch, readiness_score, next_action }`
- [ ] Update `project_states.state_json` dengan state_patch
- [ ] Update `project_states.readiness_score`
- [ ] Simpan messages ke `messages` table

**API**
- [ ] `POST /projects/:id/chat` — kirim pesan ke AI strategist
- [ ] `GET /projects/:id/messages` — ambil chat history

**Chat UI**
- [ ] Halaman `/projects/:id` — workspace layout
- [ ] Komponen: ChatInterface (AI bubble, user bubble, input)
- [ ] AI thinking state: animated dots
- [ ] Suggested prompt chips (contoh: "Saya mau bikin lead magnet", "Ini untuk bonus produk")
- [ ] Readiness score indicator (subtle progress bar)
- [ ] Tombol "Generate Outline" muncul saat `readiness_score >= 70`
- [ ] Error handling: INSUFFICIENT_CREDITS, PROVIDER_ERROR

**Credit Handling**
- [ ] Deduct credits on successful generation
- [ ] Tampilkan pesan: "Kredit tidak cukup. Upgrade plan atau beli top-up."
- [ ] Link cepat ke `/settings/billing`

### Definition of Done
- Creator bisa chat dengan AI strategist
- AI memberikan respons strategis (bukan generic chatbot)
- Structured state terupdate setelah setiap pesan
- Readiness score naik seiring percakapan
- Tombol generate outline muncul saat siap

---

## Sprint 4 — Outline Generation & Review
**Phase: AI Generator**
**Goal:** AI bisa generate outline ebook, creator bisa review dan approve.

### Tasks

**Database**
- [ ] Migration: `outlines` table
- [ ] Migration: `generation_jobs` table + indexes
- [ ] RLS untuk `outlines` dan `generation_jobs`

**AI Orchestration**
- [ ] Implementasi Planner Agent prompt (dari ai-prompts.md)
- [ ] Input: `structured_state` dari `project_states`
- [ ] Output parser: `{ title, subtitle, chapters[] }`
- [ ] Validasi: max 10 chapters, max 6 sections per chapter
- [ ] Simpan outline ke `outlines` table
- [ ] Buat generation job: type `outline`, status tracking

**API**
- [ ] `POST /projects/:id/outline/generate` — trigger outline generation
- [ ] `GET /projects/:id/outline` — ambil outline
- [ ] `PATCH /projects/:id/outline` — update outline manual
- [ ] `POST /projects/:id/outline/approve` — approve outline

**Outline Review UI**
- [ ] Komponen: OutlineReview — tampilkan chapter + section list
- [ ] Edit inline: chapter title, section title
- [ ] Reorder chapters (drag atau up/down button)
- [ ] Delete section
- [ ] Tombol "Regenerate Outline"
- [ ] Tombol "Approve & Start Generation"
- [ ] Loading state saat outline sedang di-generate
- [ ] Update project title dari outline title yang di-generate

### Definition of Done
- AI bisa generate outline dari structured state
- Creator bisa edit, reorder, delete sections
- Creator bisa approve outline sebelum generation dimulai
- Outline tersimpan di database

---

## Sprint 5 — Chunked Ebook Generation
**Phase: AI Generator**
**Goal:** AI generate ebook section by section dengan progress tracking.

### Tasks

**Database**
- [ ] Migration: `ebook_sections` table + indexes
- [ ] RLS untuk `ebook_sections`

**Generation Pipeline**
- [ ] Implementasi Writer Agent prompt (dari ai-prompts.md)
- [ ] Input per section: `{ ebook_context, chapter_title, chapter_goal, section_title, target_words, tone }`
- [ ] Output parser: `{ heading, body_markdown, examples[], action_steps[], summary }`
- [ ] Simpan ke `ebook_sections` dengan status tracking
- [ ] Generation job per section (type: `section`)
- [ ] Polling mechanism: `GET /projects/:id/generation-status`
- [ ] Retry logic untuk failed sections
- [ ] Pause on rate limit, resume dari section terakhir
- [ ] Max 1 active generation job per project

**API**
- [ ] `POST /projects/:id/generate` — start generation (mode: full_ai)
- [ ] `GET /projects/:id/generation-status` — status + progress
- [ ] `GET /projects/:id/sections` — list sections
- [ ] `PATCH /projects/:id/sections/:sectionId` — update section manual
- [ ] `POST /projects/:id/sections/:sectionId/regenerate` — regenerate section

**Generation UI**
- [ ] Progress bar: "Generating Chapter 2 Section 1... (5/12)"
- [ ] Section cards muncul satu per satu saat selesai di-generate
- [ ] Status per section: pending, generating, completed, failed
- [ ] Tombol retry untuk failed sections
- [ ] Pesan rate limit yang informatif
- [ ] Tidak pernah tampilkan blank loading screen

### Definition of Done
- AI generate semua sections secara berurutan
- Progress terlihat realtime
- Failed sections bisa di-retry tanpa regenerate ulang semua
- Rate limit ditangani dengan graceful

---

## Sprint 6 — Editor, Enhancement & HTML Preview
**Phase: Editor + Preview**
**Goal:** Creator bisa edit konten dan lihat preview HTML realtime.

### Tasks

**HTML Renderer**
- [ ] Implementasi `renderEbookHtml(document, templateSlug): string`
- [ ] Template: `minimal` (default MVP)
- [ ] Template: `editorial`
- [ ] CSS: typography, spacing, CTA blocks, chapter headers
- [ ] Sanitize HTML output (prevent XSS)
- [ ] Responsive preview (desktop + mobile simulation)

**Enhancement Agent**
- [ ] Implementasi Enhancement Agent prompt (dari ai-prompts.md)
- [ ] Actions: expand, shorten, make_persuasive, make_professional, simplify, add_examples, add_checklist
- [ ] `POST /projects/:id/sections/:sectionId/enhance`
- [ ] Update section content setelah enhancement

**Editor UI**
- [ ] Layout: Section List | Editor | Live Preview (3-panel)
- [ ] Section card: title, word count, status, action buttons
- [ ] Action buttons per section: Regenerate, Expand, Simplify, Persuasive, Delete
- [ ] Manual edit: TipTap editor (minimal toolbar)
- [ ] Live preview panel: render HTML dari sections yang sudah selesai
- [ ] Preview update otomatis saat section selesai di-generate atau di-edit
- [ ] Template selector (minimal / editorial)
- [ ] Mobile preview toggle

**API**
- [ ] `GET /projects/:id/preview-html` — rendered HTML

### Definition of Done
- Creator bisa edit section secara manual
- Enhancement actions berfungsi (expand, simplify, dll)
- Live preview update realtime
- HTML output bersih dan aman dari XSS

---

## Sprint 7 — Publishing System & Hosted Reader
**Phase: Publishing**
**Goal:** Creator bisa publish ebook, reader bisa membaca online.

### Tasks

**Database**
- [ ] Migration: `published_ebooks` table + indexes
- [ ] RLS: creator bisa manage, reader bisa baca sesuai visibility
- [ ] Slug generation (dari title, unique)

**Publishing Service**
- [ ] `POST /projects/:id/publish` — render HTML final + simpan ke `published_ebooks`
- [ ] Visibility options: public, private, claim_required
- [ ] Generate slug dari title
- [ ] `PATCH /published-ebooks/:id` — update visibility
- [ ] Republish: overwrite `published_html` + increment version

**Public Reader**
- [ ] Route: `publiora.web.id/read/:slug` (atau `/read/[slug]`)
- [ ] Render `published_html` dengan reader layout
- [ ] Access check: public → allow, private/claim_required → auth + entitlement check
- [ ] Top bar: logo, ebook title, progress
- [ ] TOC sidebar: chapter list, active highlight
- [ ] Reading area: max-width 720px, font 18px, line-height 1.9
- [ ] CTA blocks rendering
- [ ] Mobile layout: floating TOC button
- [ ] Open Graph meta tags untuk public ebooks

**Post-Publish UI**
- [ ] Success state setelah publish: tampilkan URL ebook
- [ ] Tombol: Copy URL, View Reader, Create Claim Link
- [ ] Published ebook card di dashboard

### Definition of Done
- Creator bisa publish ebook dengan visibility pilihan
- Public ebook bisa dibaca tanpa login
- Private ebook redirect ke login jika belum auth
- Reader terasa premium, bukan PDF viewer

---

## Sprint 8 — Claim Link System & Entitlement
**Phase: Distribution**
**Goal:** Creator bisa buat claim link, reader bisa claim dan langsung baca.

### Tasks

**Database**
- [ ] Migration: `claim_links` table + indexes
- [ ] Migration: `claim_events` table + indexes
- [ ] Migration: `entitlements` table + indexes
- [ ] RLS untuk semua tabel distribusi

**Claim Link Service**
- [ ] `POST /published-ebooks/:id/claim-links` — buat claim link (generate NanoID token)
- [ ] `GET /published-ebooks/:id/claim-links` — list claim links
- [ ] `PATCH /claim-links/:id` — update (isActive, maxClaims, expiresAt)
- [ ] Token: NanoID 21 chars, non-sequential

**Claim Flow**
- [ ] `POST /claim/:token` — proses klaim:
  - Validasi token (exists, active, not expired, not maxed)
  - Cek duplicate claim
  - Buat entitlement
  - Buat claim event
  - Increment claim_count
  - Return ebook info + redirect URL
- [ ] Rate limiting: IP throttling untuk `/claim/:token`

**Claim Page UI**
- [ ] Route: `publiora.web.id/claim/:token`
- [ ] Tampilkan: ebook cover, title, creator name, description, CTA button
- [ ] CTA: "Tambahkan ke Library Saya"
- [ ] Auth flow: jika belum login → redirect ke login → kembali ke claim
- [ ] Post-claim: toast "Ditambahkan ke library" + redirect langsung ke reader
- [ ] Error states: invalid, expired, disabled, max reached, already claimed

**Claim Link Management UI**
- [ ] Halaman manage claim links di project/ebook settings
- [ ] List: nama link, claim count, max claims, status, tanggal
- [ ] Actions: Copy Link, Edit, Disable
- [ ] Modal: Create Claim Link (nama, max claims, expiry)

**Entitlement Check**
- [ ] Middleware/helper: `checkEbookAccess(userId, ebookId)` → boolean
- [ ] Integrasi ke reader route untuk private/claim_required ebooks

### Definition of Done
- Creator bisa buat dan manage claim links
- Reader bisa claim ebook via link
- Post-claim langsung redirect ke reader
- Semua error states ditangani dengan pesan yang jelas
- Token aman dari brute force (rate limiting)

---

## Sprint 9 — Reader Library & Reading Progress
**Phase: Distribution**
**Goal:** Reader punya personal library dan progress tersimpan.

### Tasks

**Database**
- [ ] Migration: `reading_progress` table + indexes
- [ ] RLS untuk `reading_progress`

**Library API**
- [ ] `GET /library` — list ebooks yang dimiliki reader (via entitlements)
- [ ] `GET /library/:ebookId` — detail ebook + HTML untuk dibaca
- [ ] `PATCH /library/:ebookId/progress` — update reading progress

**Reading Progress**
- [ ] Track: current_chapter_id, progress_percent
- [ ] Auto-save progress saat scroll (debounced, setiap 5 detik)
- [ ] Resume dari posisi terakhir saat buka ebook

**Library UI**
- [ ] Route: `app.publiora.web.id/library`
- [ ] Card grid: cover, title, creator, progress bar, last opened
- [ ] Empty state: "Ebook yang kamu klaim akan muncul di sini."
- [ ] Tombol: Lanjut Membaca / Buka Ebook
- [ ] Continue reading dari chapter terakhir

**Reader Integration**
- [ ] Progress bar di top reader (thin, subtle)
- [ ] Chapter completion indicator di TOC
- [ ] "Progress tersimpan otomatis" feedback (subtle toast)
- [ ] Tombol "Kembali ke Library" di top bar

**Dashboard Update**
- [ ] Tambahkan section "Library" di sidebar navigasi
- [ ] Quick stats di dashboard: ebooks created, ebooks published, total claims

### Definition of Done
- Reader punya library yang berisi semua ebook yang sudah diklaim
- Reading progress tersimpan dan bisa dilanjutkan
- Library terasa seperti personal bookshelf, bukan file manager

---

## Sprint 10 — PDF Export & MVP Polish
**Phase: Export + Polish**
**Goal:** PDF export berfungsi, seluruh MVP loop bisa dijalankan end-to-end.

### Tasks

**Database**
- [ ] Migration: `exports` table + indexes
- [ ] RLS untuk `exports`

**PDF Export**
- [ ] `POST /projects/:id/export/pdf` — trigger export job
- [ ] `GET /exports/:id` — cek status export
- [ ] Implementasi: HTML → print CSS → PDF
  - Opsi A: Supabase Edge Function + external PDF API (misal: PDFShift, HTML/CSS to PDF)
  - Opsi B: Cloudflare Worker dengan Puppeteer (jika tersedia)
- [ ] Simpan file ke Supabase Storage
- [ ] Return download URL setelah selesai
- [ ] Status tracking: queued → processing → completed / failed
- [ ] Error handling + retry

**Export UI**
- [ ] Tombol "Export PDF" di project workspace
- [ ] Progress state: "Sedang membuat PDF..."
- [ ] Download button setelah selesai
- [ ] Export history (list exports per project)

**MVP End-to-End Polish**
- [ ] Test full loop: Create → Chat → Outline → Generate → Edit → Publish → Claim → Read
- [ ] Fix semua broken flows yang ditemukan
- [ ] Loading states konsisten di semua halaman
- [ ] Error messages konsisten (gunakan error codes dari api-spec.md)
- [ ] Empty states di semua halaman
- [ ] Mobile responsiveness: dashboard, reader, claim page, library
- [ ] Accessibility: focus states, semantic HTML, contrast check

**Security Checklist**
- [ ] Verifikasi API key tidak pernah di-log atau dikembalikan ke frontend
- [ ] Sanitize semua HTML output dari AI sebelum render
- [ ] Validasi project ownership di semua endpoints
- [ ] Entitlement check di semua reader routes
- [ ] Rate limiting aktif di claim endpoints

**Analytics Lite (MVP)**
- [ ] Counter di dashboard: ebooks created, ebooks published
- [ ] Claim count per link (sudah ada di `claim_links.claim_count`)
- [ ] Export count per project

### Definition of Done
- PDF export berfungsi dan bisa didownload
- Full MVP loop berjalan tanpa error
- Mobile experience layak untuk reader dan claim flow
- Tidak ada blank loading screens
- Security checklist selesai

---

## Ringkasan Sprint

| Sprint | Focus | Phase |
|--------|-------|-------|
| 1 | Project Setup, Auth, Design System | Foundation |
| 2 | Dashboard, Project Management, Billing & Credits | Foundation |
| 3 | AI Strategist Chat | AI Generator |
| 4 | Outline Generation & Review | AI Generator |
| 5 | Chunked Ebook Generation | AI Generator |
| 6 | Editor, Enhancement, HTML Preview | Editor + Preview |
| 7 | Publishing System, Hosted Reader | Publishing |
| 8 | Claim Link System, Entitlement | Distribution |
| 9 | Reader Library, Reading Progress | Distribution |
| 10 | PDF Export, End-to-End Polish | Export + Polish |

**Total: 10 Sprint / 10 Minggu**

---

## Dependencies Antar Sprint

```
Sprint 1 → Sprint 2 (auth diperlukan untuk dashboard)
Sprint 2 → Sprint 3 (project + credits diperlukan untuk chat)
Sprint 3 → Sprint 4 (structured state diperlukan untuk outline)
Sprint 4 → Sprint 5 (outline diperlukan untuk generation)
Sprint 5 → Sprint 6 (sections diperlukan untuk editor + preview)
Sprint 6 → Sprint 7 (preview HTML diperlukan untuk publishing)
Sprint 7 → Sprint 8 (published ebook diperlukan untuk claim links)
Sprint 7 → Sprint 9 (published ebook diperlukan untuk library)
Sprint 8 + Sprint 9 → Sprint 10 (semua fitur harus ada sebelum polish)
```

---

## Risiko & Mitigasi

| Risiko | Sprint | Mitigasi |
|--------|--------|----------|
| Credit exhaustion mid-generation | 3, 4, 5 | insufficient_credits + top-up path |
| PDF export kompleks | 10 | Gunakan external PDF API, bukan Playwright |
| Generation lambat | 5 | Polling setiap 2-3 detik, progress selalu terlihat |
| HTML sanitization | 6, 7 | DOMPurify atau server-side sanitize sebelum simpan |
| Mobile reader UX | 7, 9 | Test di mobile dari Sprint 7, bukan di Sprint 10 |

---

## MVP Success Checkpoint

Setelah Sprint 10, validasi dengan skenario ini:

1. Creator baru register → dapat grant kredit plan Free
2. Buat project "Bonus Affiliate TikTok" (type: bonus_product)
3. Chat dengan AI strategist sampai readiness_score ≥ 70
4. Generate outline → review → approve
5. Generate semua sections → edit 1-2 sections
6. Preview HTML → pilih template
7. Publish ebook (visibility: claim_required)
8. Buat claim link → copy URL
9. Buka claim link di browser lain (sebagai reader baru)
10. Register → claim → langsung baca di reader
11. Tutup browser → buka lagi → library masih ada, progress tersimpan
12. Kembali ke creator → export PDF → download

Jika semua 12 langkah ini berjalan tanpa error → **MVP selesai**.
