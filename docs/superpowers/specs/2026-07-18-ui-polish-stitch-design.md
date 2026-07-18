# Publiora UI Polish via Google Stitch — Design Spec

Date: 2026-07-18  
Status: Approved for planning (pending user review of this file)

## 1. Goal

Polish the full Publiora product UI by creating a **new design system in Google Stitch** (hard-locked to existing brand), generating desktop screens for all primary surfaces, then implementing the visual system into the existing Next.js / React / Tailwind codebase.

This is a **visual + design-system polish**, not a product feature rewrite.

## 2. Decisions locked

| Decision | Choice |
|---|---|
| Scope | Full product: marketing + auth + app workspace + reader |
| Goal | New design system from Stitch |
| Brand constraint | Hard lock brand (fonts, palette, editorial feel) |
| Output workflow | Stitch → implement in codebase |
| Approach | **A — DESIGN.md first, then screens** |

## 3. Approach A (selected)

1. Create Stitch project `Publiora UI Polish`
2. Compose hard-locked `DESIGN.md` from Brand Guidelines + Design-system
3. Upload DESIGN.md → create design system from it
4. Generate prioritized desktop screens with design system attached
5. Map Stitch tokens/patterns into codebase
6. Implement in risk-low → high order: tokens → primitives → shells → pages

Rejected alternatives:

- **B Screen-first**: faster first visual, high brand drift risk on full product
- **C Token-only**: too shallow for full-product polish goal

## 4. Brand hard lock

### Personality / feel

- Elegant minimalism + editorial publishing + modern SaaS
- Premium, calm, focused, strategic, readable, creator-first
- Closer to Notion / Medium / Read.cv / Apple than generic AI tools
- AI UI = elegant collaborator, not gimmicky sci-fi

### Typography

- Heading: **Plus Jakarta Sans**
- Body: **Inter**
- Optional alternatives (not default): Sora, General Sans, Switzer

### Color tokens (exact)

| Role | Token | Hex |
|---|---|---|
| Pure black | `publiora-black` | `#0A0A0A` |
| Soft white / canvas | `publiora-white` | `#FAFAF8` |
| Deep gray text | `deep-gray` | `#171717` |
| Medium gray | `medium-gray` | `#404040` |
| Soft gray | `soft-gray` | `#A3A3A3` |
| Border | `publiora-border` | `#E5E5E5` |
| Elegant blue | `publiora-blue` | `#2563EB` |
| Emerald success | `publiora-emerald` / `success` | `#059669` |
| Gold accent | `gold` | `#C8A24B` |
| Gold soft | `gold-soft` | `#E9D9A8` |
| Danger | `danger` | `#DC2626` |
| Warning | `warning` | `#D97706` |
| Surface 1–3 | `surface-*` | `#FFFFFF` / `#F5F5F2` / `#EFEFEC` |

Gold and blue are accents — use sparingly. Content remains the hero.

### Shape & elevation

- Card radius: 24px
- Button radius: 16px
- Input radius: 18px
- Pill: 9999px
- Shadows: soft card / hover / pop (existing CSS variables)

### Spacing

- 8px grid
- Prefer breathing room, larger section padding, readable widths
- Avoid cramped dashboards and dense control clusters

## 5. DESIGN.md (Stitch source of truth)

Repo path: `docs/stitch/DESIGN.md`

Contents must include:

1. Product positioning and brand essence
2. Design principles (content first, spacious, editorial, AI as collaborator)
3. Explicit Do / Don't
4. Color tokens + roles
5. Typography scale (heading/body, sizes, weights, tracking)
6. Spacing system (8px grid, preferred section paddings)
7. Shape, border, shadow rules
8. Component recipes: Button, Input, Card, Badge/Pill, Modal, Tabs, Empty state, Sidebar, TopBar
9. Surface rules: Marketing, Auth, App workspace, Reader
10. Motion: soft fade/hover only; no aggressive AI glow spam
11. Voice/tone: professional creator; ID/EN mix allowed

Generate rules for every Stitch screen:

- Attach design system id
- Device type: `DESKTOP`
- Prompt must restate brand lock, surface purpose, key components, empty/loading states

## 6. Screen inventory (Stitch, desktop)

1. Marketing Landing — Hero, Features, How it works, Pricing, Final CTA + nav/footer
2. Login
3. Register
4. Forgot password
5. App shell + Dashboard (stats, recent projects, new project CTA)
6. Projects list + empty state
7. Project workspace — chat + outline/sections + editor/preview
8. Library
9. Published detail / claim-link manage
10. Reader (ebook reading view)
11. Settings billing (light polish)

## 7. Implementation map

### Order

1. Tokens — `app/globals.css` (+ layout font vars if needed)
2. Primitives — `components/ui/*`
3. Shells — `MarketingShell`, `AuthShell`, `AppShell`, `Sidebar`, `TopBar`, `ReaderShell`
4. Marketing sections — `components/marketing/*`
5. Auth forms — `components/auth/*`
6. Dashboard / Projects / Library pages
7. Workspace panels — `components/workspace/*`
8. Reader + claim surfaces

### Rules

- Stitch visuals = source of truth for polish
- Keep existing data hooks, stores, and API contracts
- No backend/API rewrite
- No new product features
- Match spacing, type, color, hierarchy; minor copy polish allowed
- Desktop primary; keep responsive behavior, not a mobile-first redesign
- Dark mode full pass is out of scope unless needed as Stitch reference only

### Code impact zones

- `app/globals.css`
- `components/ui/*`
- `components/layout/*`
- `components/marketing/*`
- `components/auth/*`
- `components/workspace/*`
- `components/reader/*`
- App routes under `app/` and `app/(app)/`

## 8. Stitch tool pipeline

Assumes Google Stitch MCP available (`https://stitch.googleapis.com/mcp`).

1. `create_project` — title `Publiora UI Polish`
2. Compose/write `docs/stitch/DESIGN.md`
3. `upload_design_md` with base64 DESIGN.md
4. `create_design_system_from_design_md`
5. Optionally `update_design_system` / `apply_design_system` if needed for display
6. `generate_screen_from_text` per inventory screen (DESKTOP, design system attached)
7. `get_screen` / `list_screens` for assets and HTML/reference
8. Translate accepted visuals into codebase

If MCP tools are not loaded in the current agent session, call the same Stitch HTTP MCP endpoint with the configured API key, or re-enable the `stitch` server and continue.

## 9. Success criteria

- Visuals align with Stitch screens within intentional code constraints
- Brand hard-lock tokens (hex + fonts) preserved
- Existing product flows remain intact: login/register, create project, workspace AI loop, publish, read/claim
- Playwright suite TC001–TC015 remains green, or selectors updated deliberately when DOM structure changes
- No unrelated refactors outside polish scope

## 10. Out of scope

- Backend / database / API contract changes
- New features (billing logic, new agents, new export formats)
- Full dark-mode product theme
- Mobile-first product redesign
- Rewriting TipTap editor architecture
- Marketing copy overhaul beyond light polish

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Stitch MCP unavailable in session | Use configured HTTP MCP / re-enable server; keep DESIGN.md + screen prompts reproducible |
| Brand drift during generation | Hard-lock DESIGN.md; restate tokens in every prompt; reject off-brand variants |
| Scope explosion across full product | Strict implement order; ship tokens/primitives first; surface polish can land in batches |
| Playwright breakage from DOM polish | Prefer class/style polish over structure changes; update tests when structure must change |
| Over-polishing workspace density | Keep content-first layout; avoid packing more chrome |

## 12. Deliverables

1. `docs/stitch/DESIGN.md`
2. Stitch project + design system + generated screens
3. Code polish PR(s) following implement order
4. This design spec + later implementation plan under `docs/superpowers/`

## 13. Next step

After user approves this written spec, invoke **writing-plans** to produce a detailed implementation plan before any code or Stitch generation work.
