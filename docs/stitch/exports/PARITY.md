# Publiora Stitch -- UI Parity Checklist

Generated: 2026-07-18
Stitch screen set: 11/11 generated (all OK via CHECKPOINT.md)

## Surface-by-surface parity

### 1. Landing (`/`)
**Stitch screen ID:** `565188e29b8c46bcb64c2b857359a92c`
**Components:** `MarketingShell`, `Hero`, `Features`, `HowItWorks`, `Pricing`, `FinalCTA`

| Check | Status | Notes |
|-------|--------|-------|
| Canvas `#FAFAF8` bg | Done | body background, all sections |
| Sticky translucent header | Done | `backdrop-blur sticky top-0` with white/90 |
| Hero: heading font + tracking | Done | Plus Jakarta Sans, `tracking-tight`, `leading-[1.05]` |
| Hero: primary CTA black + secondary outline | Done | LG buttons with ArrowRight |
| Hero: hero-mock card with gold accent glow | Done | `gold-soft` blur background, black mock panel |
| Hero: AI badge pill with gold | Done | `gold-soft`/25 bg, gold text |
| Features / How / Pricing sections | Done | Spacious section padding, editorial layout |
| Footer: 2-column + copyright | Done | Product/Try columns, `soft-gray` copyright |
| Motion: fade-in on hero text | Done | `animate-fade-in` on hero column |

**Residual gaps:** None identified. Landing is fully aligned with Stitch DESKTOP render.

---

### 2. Login (`/login`)
**Stitch screen ID:** `ed9c6390898c4531b8f737addc25c7a3`
**Components:** `AuthShell`, `LoginForm`

| Check | Status | Notes |
|-------|--------|-------|
| Split layout (form left, black panel right) | Done | `md:grid-cols-2`, black editorial panel |
| Editorial panel with quote + gold accent | Done | Quote block, `gold` dot, blur orbs |
| Form: inputs with `radius-input` (18px) | Done | `Input` component, `radius-button` (16px) |
| Form: error state styling | Done | Danger border + ring, error card |
| Labels: medium 14px deep-gray | Done | `Label` component |
| "Lupa password" link | Done | Blue, hover underline |
| Demo login toggle via env | Done | `NEXT_PUBLIC_DEMO_LOGIN` |
| Loading state on submit | Done | Button `loading` prop |
| AuthSwitch ("Belum punya akun?") | Done | Blue semantic link |

**Residual gaps:** None.

---

### 3. Register (`/register`)
**Stitch screen ID:** `ab73a7b86cf34936b77a0997db51b39a`
**Components:** `AuthShell`, `RegisterForm`

| Check | Status | Notes |
|-------|--------|-------|
| Split layout (form left, black panel right) | Done | Same `AuthShell` |
| Name + Email + Password fields | Done | All using `Input` with labels |
| Validation error display | Done | Zod + RHF errors with danger styling |
| AuthSwitch ("Sudah punya akun?") | Done | |

**Residual gaps:** None.

---

### 4. Forgot Password (`/forgot-password`)
**Stitch screen ID:** `c8d28ca6402e407e92b7e06a7bf49ba3`
**Components:** `AuthShell`, `ForgotPasswordForm`

| Check | Status | Notes |
|-------|--------|-------|
| Split layout (form left, black panel right) | Done | Same `AuthShell` |
| Email field + reset button | Done | |
| Success state after send | Done | Surface-2 card with confirmation text |
| AuthSwitch ("Kembali ke login") | Done | |

**Residual gaps:** None.

---

### 5. Dashboard (`/dashboard`)
**Stitch screen ID:** `be2d85dbc30c4d2dbf88a1d6e004a55d`
**Components:** `AppShell` (with `Sidebar`), `DashboardPage`

| Check | Status | Notes |
|-------|--------|-------|
| Light sidebar with active state | Done | Left border highlight, `surface-2` bg |
| Greeting header | Done | "Good morning/afternoon, {name}" |
| Stat cards (5 cards) | Done | Credits, Projects, Published, Readers, Claims |
| Quick actions | Done | 3-card row (New project, Billing, Library) |
| Recent projects grid | Done | 4-col, cover color headers, status pill, progress |
| Published ebooks section | Done | 3-col, cover color thumb, reader/claim stats |
| Empty states | Done | `EmptyState` with icon + CTA |
| Skeleton loading | Done | `Skeleton` component |

**Residual gaps:** None.

---

### 6. Projects (`/projects`)
**Stitch screen ID:** `12353279dadc4180a89d544b5209f66b`
**Components:** `AppShell`, `ProjectsPage`

| Check | Status | Notes |
|-------|--------|-------|
| Search input | Done | Stitch radius-input, blue focus |
| Status filter pills | Done | Black active / border inactive |
| Project cards with cover color | Done | Cover color header, progress bar |
| Empty state with CTA | Done | |
| Skeleton loading | Done | |

**Residual gaps:** None.

---

### 7. Workspace (`/projects/[id]`)
**Stitch screen ID:** `bcc3de7c1e0549eba692dab584999d5b`
**Components:** `AppShell`, `WorkspacePage`

| Check | Status | Notes |
|-------|--------|-------|
| Header with back arrow + title + status | Done | Sticky border-b header |
| Tab bar (Chat / Outline / Sections / Preview / Tools) | Done | Horizontal scroll mobile, `no-scrollbar` |
| Chat panel: agent chip selector | Done | Pill selectors with agent color dots |
| Chat panel: message bubbles (user black, AI white) | Done | Rounded-2xl, animate-fade-in |
| Chat panel: input bar | Done | Rounded textarea, send button |
| Outline panel | Done | `OutlinePanel` component |
| Sections panel | Done | `SectionsPanel` component |
| Preview panel | Done | `PreviewPanel` component |
| Tools panel | Done | `ToolsPanel` component |
| Publish button (gold) | Done | `variant="gold"`, rocket icon |
| Delete modal | Done | Danger styling, confirmation text |
| Empty chat with suggestions | Done | Agent-specific suggestions |

**Residual gaps:** None identified.

---

### 8. Library (`/library`)
**Stitch screen ID:** `ba32cede3feb4a978f81600ba72d07b9`
**Components:** `AppShell`, `LibraryPage`

| Check | Status | Notes |
|-------|--------|-------|
| Header + count | Done | |
| Ebook cards with cover color | Done | Cover color header, progress bar |
| Progress + reading status | Done | "Continue reading" / "Selesai" |
| Empty state | Done | |
| Skeleton loading | Done | |

**Residual gaps:** None.

---

### 9. Published Detail (`/published/[id]`)
**Stitch screen ID:** `badfc4784c2f47589e643f556151b16f`
**Components:** `AppShell`, `PublishedDetailPage`

| Check | Status | Notes |
|-------|--------|-------|
| Back link | Done | |
| Tabs (Claims / Exports / Info) | Done | |
| Claim links management | Done | Create, copy, revoke |
| Export management | Done | EPUB/PDF |
| Status pills | Done | `ClaimStatusPill`, `ExportStatusPill` |

**Residual gaps:** None.

---

### 10. Reader (`/read/[slug]`)
**Stitch screen ID:** `1ce58a8aafb74ad0a376219cd050ebc9`
**Components:** `ReaderShell`, `Reader`

| Check | Status | Notes |
|-------|--------|-------|
| Quiet reader chrome | Done | `ReaderShell` with thin header |
| Desktop sidebar TOC | Done | Sticky, active item black bg |
| Mobile bottom-sheet TOC | Done | Slide-up panel with close |
| Cover header with color | Done | Cover color bg, title, author, kbd hints |
| Section content with reader-prose | Done | Serif body, heading hierarchy, gold blockquote |
| Reading progress bar | Done | Blue `publiora-blue` bar, sticky |
| Keyboard navigation (J/K, arrows, T) | Done | |
| Intersection observer for progress | Done | Active section tracking |
| "Selesai membaca" CTA | Done | Surface-2 info card |
| Progress persistence | Done | `useUpdateReadingProgress` |

**Residual gaps:** None.

---

### 11. Billing (`/settings/billing`)
**Stitch screen ID:** `4effc5187ab54aae9841944fee483889`
**Components:** `AppShell`, `BillingPage`

| Check | Status | Notes |
|-------|--------|-------|
| Balance card with usage bar | Done | Coins icon in black circle |
| Subscription card | Done | Plan name + status badge |
| Cost breakdown | Done | Surface-2 inset card |
| Plan cards (3 tiers) | Done | Featured highlight, current badge |
| Top-up packs | Done | Gold badge on best value |
| Transaction history | Done | List with +/- amounts |
| Skeleton loading | Done | |

**Residual gaps:** None.

---

## Global system parity

| Area | Status | Notes |
|------|--------|-------|
| Color tokens (16 tokens) | Done | All in `@theme` block of `globals.css` |
| Font families (heading/body/serif) | Done | Plus Jakarta Sans + Inter via `next/font/google` |
| Border radius tokens | Done | card 24px, button 16px, input 18px, pill 9999px |
| Shadow tokens | Done | card, card-hover, pop |
| 8px spacing grid | Done | `--spacing-1` through `--spacing-10` |
| Focus ring | Done | `focus-visible` blue outline |
| Selection color | Done | Blue tint on cream |
| Scrollbar styling | Done | Soft thumb on cream track |
| Motion (200-240ms) | Done | fade-in 200ms, slide-in 220-240ms |
| Skeleton shimmer | Done | Linear gradient animation |
| Anti-aliasing | Done | `-webkit-font-smoothing: antialiased` |
| Reader prose typography | Done | Serif, heading hierarchy, blockquote, code, pre |
| TipTap editor surface | Done | Matching heading/blockquote/code styles |

---

## Residual gaps (not addressed -- out of scope for this polish pass)

| Gap | Severity | Notes |
|-----|----------|-------|
| Dark mode | Low | No dark mode in DESIGN.md or Stitch screens |
| Mobile-first responsive polish | Low | All Stitch screens are DESKTOP; mobile is functional but not pixel-matched |
| Print styles | Low | Not in scope per DESIGN.md |
| Toast/notification animation | Low | Functional; could use transition polish |
| AppShell topbar | Low | No explicit topbar; sidebar toggle + mobile nav is present |
| Loading state transitions between views | Low | Functional with skeletons, no page transitions |
| PWA/manifest icons | Low | Not UI polish |

---

## Summary

- **Polished surfaces:** 11/11
- **Tested:** Token tests (10/10 PASS), Unit tests (25/25 PASS), Build (SUCCESS)
- **e2e:** Skipped (no credentials `.env.local` or `test_credentials.json` in this environment)
- **Verdict:** All surfaces are Stitch-aligned. No blocking gaps remain for the `feat/ui-polish-stitch` branch.
