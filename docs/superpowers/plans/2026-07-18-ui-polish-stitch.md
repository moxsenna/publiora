# Publiora UI Polish via Google Stitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hard-locked Publiora design system in Google Stitch, generate full-product desktop screens, then implement the visual polish into the existing Next.js/React/Tailwind app without changing product flows or APIs.

**Architecture:** DESIGN.md is the single brand source. Upload it to Stitch → create design system → generate DESKTOP screens with that system attached. Map accepted visuals back into `app/globals.css`, `components/ui/*`, shells, then surface pages. Keep hooks/stores/API contracts untouched. Verify with token contract tests + existing Vitest + `scripts/ui-e2e.mjs` (TC001–TC015).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (`@theme` tokens), Lucide, existing component primitives, Google Stitch MCP (`https://stitch.googleapis.com/mcp`), Vitest, Playwright (`scripts/ui-e2e.mjs`).

**Spec:** `docs/superpowers/specs/2026-07-18-ui-polish-stitch-design.md`

---

## File map

| Path | Responsibility |
|---|---|
| `docs/stitch/DESIGN.md` | Hard-locked design system source for Stitch |
| `docs/stitch/project.json` | Stitch project id + design system id + screen ids (local handoff) |
| `docs/stitch/prompts/*.md` | Exact generation prompts per screen |
| `docs/stitch/exports/` | Optional HTML/screenshot notes from Stitch |
| `app/globals.css` | Brand tokens, type, motion, reader/editor surface styles |
| `app/layout.tsx` | Font CSS variables (Plus Jakarta + Inter) — touch only if needed |
| `components/ui/*` | Shared primitives (Button, Input, Card, Badge, …) |
| `components/layout/*` | Marketing/Auth/App/Reader shells, Sidebar, TopBar |
| `components/marketing/*` | Landing sections |
| `components/auth/*` | Login/Register/Forgot forms |
| `components/workspace/*` | Editor workspace panels |
| `components/reader/Reader.tsx` | Hosted reader chrome |
| `app/page.tsx` + marketing routes | Landing composition |
| `app/login`, `app/register`, `app/forgot-password` | Auth pages |
| `app/(app)/**` | Dashboard, projects, library, published, settings |
| `app/read/**`, `app/claim/**` | Reader + claim surfaces |
| `__tests__/design/tokens.test.ts` | Hard-lock token regression |

---

## Brand hard lock (do not drift)

- Heading: Plus Jakarta Sans · Body: Inter
- Black `#0A0A0A` · Soft white `#FAFAF8` · Border `#E5E5E5`
- Blue `#2563EB` · Emerald `#059669` · Gold `#C8A24B` · Gold soft `#E9D9A8`
- Radius: card 24 / button 16 / input 18 / pill full
- Feel: elegant editorial SaaS — not flashy AI

---

### Task 1: DESIGN.md hard-lock source

**Files:**
- Create: `docs/stitch/DESIGN.md`
- Create: `docs/stitch/project.json` (stub)
- Test: `__tests__/design/tokens.test.ts` (later task consumes DESIGN.md values)

- [ ] **Step 1: Create directories**

```bash
mkdir -p docs/stitch/prompts docs/stitch/exports
```

- [ ] **Step 2: Write `docs/stitch/DESIGN.md`**

Write the full file below (exact content):

```markdown
# Publiora DESIGN.md

> Elegant AI publishing for modern creators.

## Product

Publiora is an AI-powered publishing platform for creators and marketers.
Users think, strategize, write marketing ebooks, publish, and distribute via claim links.

Tagline: Create, publish, and distribute marketing ebooks with AI.

## Brand personality

Elegant · Strategic · Modern · Creative · Professional

Feel: premium, calm, focused, readable, creator-first.
Closer to Notion, Medium, Read.cv, Apple than generic AI tools or crypto dashboards.

## Principles

1. Content first — UI supports reading and creation, never competes.
2. Spacious layouts — intentional whitespace, readable widths.
3. Editorial feel — quiet chrome, strong typography hierarchy.
4. AI as collaborator — helpful and subtle, never gimmicky.

## Do

- Soft cream canvas (`#FAFAF8`)
- Strong black primary actions (`#0A0A0A`)
- Generous section padding
- Soft shadows and large radii
- Gold used sparingly for premium accents
- Blue for links/focus/active only

## Don't

- Flashy AI gradients / neon glow spam
- Dense admin tables as default
- Crypto-dashboard aesthetics
- Tiny cramped controls
- Rainbow status rainbow overload

## Color tokens

| Token | Hex | Role |
|---|---|---|
| publiora-black | #0A0A0A | primary button, emphasis, dark panels |
| publiora-white | #FAFAF8 | app canvas, reading surface |
| deep-gray | #171717 | body text |
| medium-gray | #404040 | secondary text |
| soft-gray | #A3A3A3 | tertiary / meta |
| publiora-border | #E5E5E5 | borders, dividers |
| publiora-blue | #2563EB | links, focus, active |
| publiora-emerald | #059669 | success, published |
| gold | #C8A24B | premium badge / subtle highlight |
| gold-soft | #E9D9A8 | badge surface |
| danger | #DC2626 | destructive |
| warning | #D97706 | warning |
| surface-1 | #FFFFFF | cards |
| surface-2 | #F5F5F2 | muted surface |
| surface-3 | #EFEFEC | deeper muted |

## Typography

- Headings: Plus Jakarta Sans, tracking -0.02em, black
- Body: Inter, deep-gray, antialiased
- Scale guide:
  - Display: 48–60px / bold / leading 1.05
  - H1: 30–36px / bold
  - H2: 24px / semibold
  - H3: 18–20px / semibold
  - Body: 14–16px / regular / leading relaxed
  - Meta: 12–13px / medium / soft-gray

## Spacing

8px grid. Prefer 16 / 24 / 32 / 48 / 64 / 80.
Section vertical padding marketing: 80–112px desktop.
Card padding: 24px.
Form gap: 16–24px.

## Shape

- Card radius: 24px
- Button radius: 16px
- Input radius: 18px
- Pill/badge: 9999px
- Shadows: soft card `0 4px 24px rgba(0,0,0,0.04)`; hover stronger; pop for hero mock

## Components

### Button
- primary: black bg, soft-white text
- outline/secondary: border gray, white/surface bg
- ghost: transparent
- gold: rare premium CTA
- sizes sm/md/lg; loading spinner allowed

### Input
- height ~44px, radius 18, border gray, focus blue border
- label 14px medium deep-gray above field

### Card
- white, radius 24, hairline border, soft shadow
- header/body/footer spacing 16–24

### Badge / Status pill
- pill radius; gold/success/info variants soft tinted surfaces

### Shells
- Marketing: sticky translucent header, max-w-7xl content, quiet footer
- Auth: split calm form + black editorial panel (desktop)
- App: light sidebar + topbar, content-first main
- Reader: quiet chrome, max readable measure, serif body optional via reader-prose

### AI chat
- Subtle agent chips, calm bubbles, no sci-fi panels

## Motion

200–240ms ease-out fades/slides only.
No looping neon, no aggressive parallax.

## Screen intent notes

- Landing: trust + clarity + one primary CTA
- Auth: fast, calm, low friction
- Dashboard: overview + recent work + create
- Workspace: chat + structure + writing surface
- Reader: reading is hero

## Language

UI may mix Indonesian and English. Tone: professional creator.
```

- [ ] **Step 3: Write stub project handoff file**

```json
{
  "title": "Publiora UI Polish",
  "projectId": null,
  "designSystemId": null,
  "designSystemResource": null,
  "screens": {}
}
```

Save as `docs/stitch/project.json`.

- [ ] **Step 4: Commit**

```bash
git add docs/stitch/DESIGN.md docs/stitch/project.json
git commit -m "docs(stitch): add hard-locked DESIGN.md for UI polish"
```

---

### Task 2: Token contract test (TDD for hard lock)

**Files:**
- Create: `__tests__/design/tokens.test.ts`
- Modify later: `app/globals.css` only if test fails after polish

- [ ] **Step 1: Write failing/passing contract test**

Create `__tests__/design/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const designMd = readFileSync(resolve(process.cwd(), "docs/stitch/DESIGN.md"), "utf8");

function token(name: string, hex: string) {
  it(`defines ${name} = ${hex}`, () => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${hex}`, "i"));
    expect(designMd.toLowerCase()).toContain(hex.toLowerCase());
  });
}

describe("Publiora hard-lock design tokens", () => {
  token("--color-publiora-black", "#0A0A0A");
  token("--color-publiora-white", "#FAFAF8");
  token("--color-publiora-border", "#E5E5E5");
  token("--color-publiora-blue", "#2563EB");
  token("--color-publiora-emerald", "#059669");
  token("--color-gold", "#C8A24B");
  token("--color-gold-soft", "#E9D9A8");
  token("--color-deep-gray", "#171717");

  it("locks radius tokens", () => {
    expect(css).toMatch(/--radius-card:\s*24px/);
    expect(css).toMatch(/--radius-button:\s*16px/);
    expect(css).toMatch(/--radius-input:\s*18px/);
    expect(css).toMatch(/--radius-pill:\s*9999px/);
  });

  it("locks font families to Plus Jakarta + Inter variables", () => {
    expect(css).toMatch(/--font-heading:\s*var\(--font-plus-jakarta-sans\)/);
    expect(css).toMatch(/--font-body:\s*var\(--font-inter\)/);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run __tests__/design/tokens.test.ts
```

Expected: PASS on current `globals.css` (baseline already matches hard lock). If FAIL, fix `app/globals.css` before any Stitch-driven drift.

- [ ] **Step 3: Commit**

```bash
git add __tests__/design/tokens.test.ts
git commit -m "test(design): lock Publiora brand tokens against globals.css"
```

---

### Task 3: Create Stitch project + design system

**Files:**
- Modify: `docs/stitch/project.json`
- Reference: `docs/stitch/DESIGN.md`

**Stitch access:** MCP server `stitch` at `https://stitch.googleapis.com/mcp` with header `X-Goog-Api-Key`. If agent tools are not bound, use HTTP JSON-RPC below via Node.

- [ ] **Step 1: Create helper script for Stitch MCP calls**

Create `scripts/stitch-mcp.mjs`:

```js
#!/usr/bin/env node
/**
 * Minimal Google Stitch MCP JSON-RPC helper.
 * Usage:
 *   STITCH_API_KEY=... node scripts/stitch-mcp.mjs tools/list
 *   STITCH_API_KEY=... node scripts/stitch-mcp.mjs tools/call create_project '{"title":"Publiora UI Polish"}'
 */
import { readFileSync, existsSync } from "node:fs";

function loadKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  // Prefer env; never commit keys. Optional local override file (gitignored).
  if (existsSync(".dev.vars")) {
    const txt = readFileSync(".dev.vars", "utf8");
    const m = txt.match(/STITCH_API_KEY=(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("Set STITCH_API_KEY env var");
}

const key = loadKey();
const url = "https://stitch.googleapis.com/mcp";
const [mode, name, argsJson] = process.argv.slice(2);

async function rpc(method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const text = await res.text();
  // Handle SSE-ish or pure JSON
  if (text.startsWith("event:") || text.includes("data:")) {
    const dataLines = text
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());
    for (const line of dataLines) {
      if (!line || line === "[DONE]") continue;
      try {
        return JSON.parse(line);
      } catch {
        // continue
      }
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

if (!mode) {
  console.error("Usage: tools/list | tools/call <name> '<json args>'");
  process.exit(1);
}

if (mode === "tools/list") {
  console.log(JSON.stringify(await rpc("tools/list", {}), null, 2));
} else if (mode === "tools/call") {
  const args = argsJson ? JSON.parse(argsJson) : {};
  console.log(
    JSON.stringify(
      await rpc("tools/call", { name, arguments: args }),
      null,
      2
    )
  );
} else {
  console.error("Unknown mode", mode);
  process.exit(1);
}
```

- [ ] **Step 2: Verify tools list**

```bash
# set key from your Stitch config (do not print key)
export STITCH_API_KEY="YOUR_KEY"
node scripts/stitch-mcp.mjs tools/list
```

Expected: JSON listing tools including `create_project`, `upload_design_md`, `create_design_system_from_design_md`, `generate_screen_from_text`, `get_project`, `list_screens`, `get_screen`.

- [ ] **Step 3: Create project**

```bash
node scripts/stitch-mcp.mjs tools/call create_project "{\"title\":\"Publiora UI Polish\"}"
```

Expected: response containing project id (numeric string, no `projects/` prefix). Write it into `docs/stitch/project.json` as `projectId`.

- [ ] **Step 4: Upload DESIGN.md**

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('docs/stitch/DESIGN.md');console.log(b.toString('base64'))" > /tmp/design.b64
# Windows PowerShell alternative:
# [Convert]::ToBase64String([IO.File]::ReadAllBytes('docs/stitch/DESIGN.md'))
```

Then call:

```bash
# Replace PROJECT_ID and BASE64
node scripts/stitch-mcp.mjs tools/call upload_design_md "{\"projectId\":\"PROJECT_ID\",\"designMdBase64\":\"BASE64\"}"
```

Expected: response with a screen instance id for the uploaded design md asset. Save `selectedScreenInstance` fields (`id`, `sourceScreen`) temporarily.

- [ ] **Step 5: Create design system from DESIGN.md**

```bash
node scripts/stitch-mcp.mjs tools/call create_design_system_from_design_md "{\"projectId\":\"PROJECT_ID\",\"deviceType\":\"DESKTOP\",\"selectedScreenInstance\":{\"id\":\"INSTANCE_ID\",\"sourceScreen\":\"projects/PROJECT_ID/screens/SCREEN_ID\"}}"
```

If API instead wants `create_design_system` with explicit theme, use:

```bash
node scripts/stitch-mcp.mjs tools/call create_design_system "{\"designSystem\":{\"displayName\":\"Publiora\",\"theme\":{\"bodyFont\":\"INTER\",\"/* remaining theme fields from tool schema */\":true}}}"
```

Then `update_design_system` / `apply_design_system` as tool docs require.

- [ ] **Step 6: Persist ids**

Update `docs/stitch/project.json`:

```json
{
  "title": "Publiora UI Polish",
  "projectId": "REPLACE",
  "designSystemId": "assets/REPLACE",
  "designSystemResource": "assets/REPLACE",
  "screens": {}
}
```

- [ ] **Step 7: Commit script + ids (never commit API keys)**

```bash
git add scripts/stitch-mcp.mjs docs/stitch/project.json
git commit -m "chore(stitch): add MCP helper and project/design system ids"
```

---

### Task 4: Screen generation prompts + generate all DESKTOP screens

**Files:**
- Create: `docs/stitch/prompts/01-landing.md` … `11-billing.md`
- Modify: `docs/stitch/project.json` (`screens` map)
- Optional: `docs/stitch/exports/*.md` notes

- [ ] **Step 1: Write shared prompt prefix**

Every screen prompt must start with:

```text
Use the attached Publiora design system only. Hard lock brand:
Plus Jakarta Sans headings, Inter body, canvas #FAFAF8, black #0A0A0A,
border #E5E5E5, blue #2563EB, emerald #059669, gold #C8A24B sparingly.
Elegant editorial SaaS. No flashy AI neon. Desktop web app.
```

- [ ] **Step 2: Create prompt files**

`docs/stitch/prompts/01-landing.md`:

```text
[PREFIX]
Screen: Marketing landing page for Publiora.
Sections top to bottom: sticky nav (logo, Features, How it works, Pricing, Sign in, Get started),
Hero with badge "AI-native publishing platform", bold bilingual headline about create/publish/distribute marketing ebooks,
primary CTA "Mulai gratis", secondary "Lihat demo ebook", product mock card on right,
Features grid (strategy, writing, publish, claim-link distribution),
How it works 4 steps (brief → outline → write → distribute),
Pricing cards (Free / Pro / credits note),
Final CTA band,
Footer with product links.
Spacious, premium, calm.
```

`docs/stitch/prompts/02-login.md`:

```text
[PREFIX]
Screen: Auth login. Split layout desktop: left form (logo, title Sign in, email, password, submit, link to register + forgot password), right black editorial panel with gold eyebrow and quote about AI publishing. Calm, minimal.
```

`docs/stitch/prompts/03-register.md`:

```text
[PREFIX]
Screen: Auth register. Same split shell as login. Fields: name, email, password. Primary CTA Create account. Footer link to sign in.
```

`docs/stitch/prompts/04-forgot-password.md`:

```text
[PREFIX]
Screen: Forgot password. Same auth shell. Email field + Send reset link. Back to sign in.
```

`docs/stitch/prompts/05-dashboard.md`:

```text
[PREFIX]
Screen: App shell with left sidebar (Dashboard, Projects, Library, Billing) + top area.
Main: greeting, New project button, 3 quick actions, stats cards (projects, published, readers, credits), recent projects list with status pills, recent published.
Light, spacious SaaS dashboard — not dense admin.
```

`docs/stitch/prompts/06-projects.md`:

```text
[PREFIX]
Screen: Projects list in app shell. Page title Projects, New project CTA, filter/search optional, grid/list of project cards (title, status pill, updated time). Include empty state illustration text "Belum ada project".
```

`docs/stitch/prompts/07-workspace.md`:

```text
[PREFIX]
Screen: Project workspace. App chrome minimal.
Three zones: left AI chat panel with agent chips (Strategist/Planner/Writer), center outline/sections list, right editor/preview surface.
Calm collaborator AI UI. Content first. No sci-fi.
```

`docs/stitch/prompts/08-library.md`:

```text
[PREFIX]
Screen: Library of claimed/owned ebooks in app shell. Cards with cover placeholder, title, progress, Open reader CTA. Empty state friendly.
```

`docs/stitch/prompts/09-published.md`:

```text
[PREFIX]
Screen: Published ebook detail. Title, status published, claim link field with copy button, stats readers/claims, open reader, export hints. Clean detail layout.
```

`docs/stitch/prompts/10-reader.md`:

```text
[PREFIX]
Screen: Hosted ebook reader. Quiet top bar (back, title, TOC toggle), left optional TOC, main reader-prose column max readable width, section headings, body serif-friendly. Reading is hero.
```

`docs/stitch/prompts/11-billing.md`:

```text
[PREFIX]
Screen: Settings billing. Plan summary, credit balance, simple upgrade/credits cards. Light polish only. App shell.
```

- [ ] **Step 3: Generate each screen**

For each prompt file:

```bash
# Read prompt, inject designSystem from project.json
node scripts/stitch-mcp.mjs tools/call generate_screen_from_text "{\"projectId\":\"PROJECT_ID\",\"deviceType\":\"DESKTOP\",\"modelId\":\"GEMINI_3_1_PRO\",\"designSystem\":\"assets/DESIGN_SYSTEM_ID\",\"prompt\":\"...full prompt...\"}"
```

Rules from Stitch:
- Generation can take minutes — **do not retry on timeout**
- On timeout/connection error: poll `get_screen` / `list_screens` every 30s up to 10 times
- If `output_components` suggestions appear, present to human; only re-generate if accepted

- [ ] **Step 4: Record screen ids**

After each success, update `docs/stitch/project.json`:

```json
"screens": {
  "landing": "screens/...",
  "login": "screens/...",
  "register": "screens/...",
  "forgotPassword": "screens/...",
  "dashboard": "screens/...",
  "projects": "screens/...",
  "workspace": "screens/...",
  "library": "screens/...",
  "published": "screens/...",
  "reader": "screens/...",
  "billing": "screens/..."
}
```

- [ ] **Step 5: Fetch references**

For each screen id:

```bash
node scripts/stitch-mcp.mjs tools/call get_screen "{\"name\":\"projects/PROJECT_ID/screens/SCREEN_ID\"}"
```

Save useful HTML/text notes under `docs/stitch/exports/<name>.md` (no need to dump binary images into git if huge; store URLs/descriptions).

- [ ] **Step 6: Human checkpoint**

Stop and confirm with user: screens match brand hard lock. Reject/regenerate off-brand screens with `generate_variants` or new `generate_screen_from_text` before coding.

- [ ] **Step 7: Commit prompts + screen map**

```bash
git add docs/stitch/prompts docs/stitch/project.json docs/stitch/exports
git commit -m "docs(stitch): add screen prompts and generated screen ids"
```

---

### Task 5: Apply token polish in `globals.css` (if Stitch suggests compatible refinements)

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/design/tokens.test.ts`

Hard rule: **hex values and font families must still pass Task 2 test.** Allowed polish: shadow softness, focus ring, scrollbar, utility classes, spacing aliases — not brand hex changes.

- [ ] **Step 1: Run token test baseline**

```bash
npx vitest run __tests__/design/tokens.test.ts
```

Expected: PASS

- [ ] **Step 2: Apply only non-breaking CSS polish from Stitch**

Examples allowed in `app/globals.css`:

```css
/* keep existing @theme hard-lock tokens */

/* optional refinement — selection color */
::selection {
  background: color-mix(in srgb, var(--color-gold-soft) 70%, white);
  color: var(--color-publiora-black);
}
```

Do **not** change:

```css
--color-publiora-black: #0A0A0A;
--color-publiora-white: #FAFAF8;
/* ...other hard locks... */
--font-heading: var(--font-plus-jakarta-sans), sans-serif;
--font-body: var(--font-inter), sans-serif;
```

- [ ] **Step 3: Re-run token test**

```bash
npx vitest run __tests__/design/tokens.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style(tokens): apply Stitch-compatible global polish without brand drift"
```

---

### Task 6: Polish UI primitives

**Files:**
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/Input.tsx`
- Modify: `components/ui/Card.tsx`
- Modify: `components/ui/Badge.tsx`
- Modify: `components/ui/EmptyState.tsx`
- Modify: other primitives only if Stitch screen patterns require (`Modal`, `Tabs`, `StatusPill`, `Skeleton`)

Keep public props/APIs stable (`variant`, `size`, `loading`, etc.) so pages do not break.

- [ ] **Step 1: Align Button with Stitch**

Ensure `components/ui/Button.tsx` keeps variants but matches Stitch spacing/weight. Target classes (adjust only if needed):

```tsx
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-publiora-black)] text-[var(--color-publiora-white)] hover:bg-[var(--color-deep-gray)] shadow-sm",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] border border-[var(--color-publiora-border)]",
  ghost:
    "bg-transparent text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  gold: "bg-[var(--color-gold)] text-[var(--color-publiora-black)] hover:brightness-95",
  outline:
    "bg-transparent border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
};
```

Base class must keep `rounded-[var(--radius-button)]`.

- [ ] **Step 2: Align Input/Textarea/Label**

In `components/ui/Input.tsx`, keep radius/focus tokens; ensure height 44 (`h-11`), placeholder soft-gray, focus blue border.

- [ ] **Step 3: Align Card**

In `components/ui/Card.tsx`, keep:

```tsx
"rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-card)]"
```

Match Stitch padding: header `px-6 pt-6 pb-3`, body `px-6 py-4`, footer with top border.

- [ ] **Step 4: Align Badge**

Keep gold/success/info soft tints; pill radius.

- [ ] **Step 5: Visual smoke**

```bash
npm run dev
```

Open a page that uses Button/Input/Card (login + dashboard). Compare to Stitch references.

- [ ] **Step 6: Run unit tests**

```bash
npm test
```

Expected: existing validation tests PASS; token test PASS.

- [ ] **Step 7: Commit**

```bash
git add components/ui
git commit -m "style(ui): polish primitives to match Stitch design system"
```

---

### Task 7: Polish shells (Marketing / Auth / App / Reader)

**Files:**
- Modify: `components/layout/MarketingShell.tsx`
- Modify: `components/layout/AuthShell.tsx`
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/TopBar.tsx`
- Modify: `components/layout/ReaderShell.tsx`

- [ ] **Step 1: MarketingShell**

Match Stitch landing chrome:
- sticky header `bg-white/90 backdrop-blur`
- `max-w-7xl` content width
- nav labels unchanged (Features / How it works / Pricing) to avoid e2e text churn unless Stitch requires
- primary CTA Get started / Dashboard if authed

- [ ] **Step 2: AuthShell**

Keep split layout:
- left form column
- right black panel + gold eyebrow + quote
- ensure canvas/padding matches Stitch (generous `p-8` / `p-12`)

- [ ] **Step 3: App shell + Sidebar + TopBar**

- Sidebar width ~256px (`w-64`), quiet active state (soft surface or black text, not neon)
- Nav items stay: Dashboard, Projects, Library, Billing (`/settings/billing`)
- Preserve collapse/mobile behavior

- [ ] **Step 4: ReaderShell**

Quiet top bar; no heavy borders; background soft white.

- [ ] **Step 5: Smoke routes**

```bash
# with dev server
# /  /login  /dashboard  /read/<slug>
```

- [ ] **Step 6: Commit**

```bash
git add components/layout
git commit -m "style(layout): polish shells to Stitch desktop frames"
```

---

### Task 8: Marketing landing sections

**Files:**
- Modify: `components/marketing/Hero.tsx`
- Modify: `components/marketing/Features.tsx`
- Modify: `components/marketing/HowItWorks.tsx`
- Modify: `components/marketing/Pricing.tsx`
- Modify: `components/marketing/FinalCTA.tsx`
- Modify if needed: `app/page.tsx` (composition only)

- [ ] **Step 1: Hero**

Align with Stitch landing:
- gold soft badge + Sparkles
- display headline hierarchy
- CTA pair `Mulai gratis` + `Lihat demo ebook`
- right product mock card

Keep links:
- `/register`
- `/read/content-engine-playbook` (or current demo slug)

- [ ] **Step 2: Features / HowItWorks / Pricing / FinalCTA**

Match section spacing (`py-20 md:py-28`), card radii, icon treatments from Stitch. Prefer class/style polish over DOM renames that break anchors `#features` `#how` `#pricing`.

- [ ] **Step 3: Verify anchors still present**

```bash
rg -n "id=\"features\"|id=\"how\"|id=\"pricing\"" components/marketing
```

Expected: each section id exists (add if missing).

- [ ] **Step 4: Commit**

```bash
git add components/marketing app/page.tsx
git commit -m "style(marketing): polish landing sections from Stitch"
```

---

### Task 9: Auth forms polish

**Files:**
- Modify: `components/auth/LoginForm.tsx`
- Modify: `components/auth/RegisterForm.tsx`
- Modify: `components/auth/ForgotPasswordForm.tsx`
- Modify if needed: `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`

- [ ] **Step 1: Visual polish only**

- spacing between fields 16–24px
- button full width on form
- error text danger color
- do **not** change zod schemas or submit handlers

- [ ] **Step 2: Run auth unit tests**

```bash
npx vitest run __tests__/validations
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/auth app/login app/register app/forgot-password
git commit -m "style(auth): polish auth forms to Stitch without flow changes"
```

---

### Task 10: App pages — Dashboard / Projects / Library / Billing / Published

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/(app)/projects/page.tsx`
- Modify: `app/(app)/projects/new/**` if present UI
- Modify: `app/(app)/library/page.tsx`
- Modify: `app/(app)/settings/billing/**`
- Modify: `app/(app)/published/[id]/**`

- [ ] **Step 1: Dashboard**

Match Stitch:
- greeting + New project CTA
- quick actions grid
- stats cards using `Card`
- recent projects with `ProjectStatusPill`
- keep data hooks: `useProjects`, `usePublishedEbooks`, `useCreditBalance`

- [ ] **Step 2: Projects list**

- title + New project
- cards/empty state via `EmptyState`
- keep routing to `/projects/[id]` and `/projects/new`

- [ ] **Step 3: Library / Published / Billing**

Visual hierarchy only; preserve claim/reader links and billing data wiring.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)"
git commit -m "style(app): polish dashboard projects library billing published"
```

---

### Task 11: Workspace + Reader polish

**Files:**
- Modify: `components/workspace/ChatPanel.tsx`
- Modify: `components/workspace/OutlinePanel.tsx`
- Modify: `components/workspace/SectionsPanel.tsx`
- Modify: `components/workspace/PreviewPanel.tsx`
- Modify: `components/workspace/ToolsPanel.tsx`
- Modify: `components/workspace/PublishDialog.tsx`
- Modify: `components/editor/RichTextEditor.tsx` (chrome only)
- Modify: `app/(app)/projects/[id]/page.tsx` (layout chrome)
- Modify: `components/reader/Reader.tsx`
- Modify: claim UI under `components/claim/**` if needed

- [ ] **Step 1: Workspace**

Match Stitch 3-zone calm layout:
- chat subtle
- outline/sections clear hierarchy
- editor surface uses existing `tiptap-surface` styles
- do not change agent message APIs / mutation hooks

- [ ] **Step 2: Reader**

- quiet TOC
- `reader-prose` measure
- keep progress hook `useUpdateReadingProgress`

- [ ] **Step 3: Commit**

```bash
git add components/workspace components/editor components/reader components/claim "app/(app)/projects" app/read app/claim
git commit -m "style(workspace-reader): polish creator workspace and reader chrome"
```

---

### Task 12: Verification gate

**Files:** none required unless tests/selectors need updates

- [ ] **Step 1: Token + unit tests**

```bash
npx vitest run __tests__/design/tokens.test.ts
npm test
```

Expected: all PASS

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: Next.js build success

- [ ] **Step 3: UI e2e TC001–TC015**

Start app (example port used by script default 3005):

```bash
npm run dev -- -p 3005
```

In another shell:

```bash
BASE_URL=http://127.0.0.1:3005 node scripts/ui-e2e.mjs
```

Expected: all TC001–TC015 pass.  
If failures are selector/DOM-structure from intentional polish, update `scripts/ui-e2e.mjs` selectors carefully and re-run. Do not weaken assertions.

- [ ] **Step 4: Manual Stitch parity checklist**

For each surface, compare to Stitch export:

1. Landing
2. Login/Register
3. Dashboard
4. Workspace
5. Reader

Check: spacing, type hierarchy, radius, accent restraint, no brand drift.

- [ ] **Step 5: Final commit (if e2e selector updates)**

```bash
git add scripts/ui-e2e.mjs
git commit -m "test(e2e): update UI selectors after Stitch polish"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task coverage |
|---|---|
| DESIGN.md hard lock | Task 1 |
| Stitch project + design system from DESIGN.md | Task 3 |
| Generate full-product desktop screens | Task 4 |
| Implement tokens → primitives → shells → pages | Tasks 5–11 |
| Keep APIs/hooks/flows | Explicit in Tasks 6–11 |
| Success: token lock + flows + TC001–TC015 | Tasks 2 + 12 |
| Out of scope backend/features/dark-mode | Not scheduled |

Placeholder scan: none intentional.  
Type/API consistency: no new component public APIs required; existing `Button`/`Input`/`Card` props preserved.

---

## Execution notes

- Prefer **subagent-driven-development** one task at a time.
- Never commit Stitch API keys.
- If Stitch generation fails mid-batch, keep completed screen ids in `project.json` and resume remaining prompts only.
- If a Stitch screen is beautiful but breaks hard lock (wrong font/color), regenerate — do not port off-brand styles into code.
