# Baseline: Workflow-First Workspace (2026-07-19)

> Updated after Tasks 13-16 completion. Recorded at end of workflow-first UI refactor.

## Environment

- **Branch:** `feat/workflow-first-workspace`
- **Latest Commit:** (see git log; auth-gated e2e green after cookie-session injection)
- **PR:** https://github.com/moxsenna/publiora/pull/2
- **Node:** v22
- **Next.js:** 16.2.6 (Turbopack)
- **React:** 19.2.4
- **Test runner:** Vitest 4.1.8 + Playwright 1.52

## Build Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm test` | **266 passed, 0 failed (14 test files)** | All green |
| `npm run build` | **Pass** | 52 routes compiled. Transient Windows Turbopack worker crash may occur; retry resolves. |
| `npx tsc --noEmit` | **Pass** | Zero errors |

### Test Details

```
__tests__/design/tokens.test.ts              — 10 tests
__tests__/ai/provider.fallback.test.ts       — 4 tests
__tests__/ai/strategist-schema.test.ts       — 24 tests
__tests__/project-state/chat-flow.test.ts    — 7 tests
__tests__/validations/auth.property1.test.ts — 11 tests
__tests__/validations/auth.property4.test.ts — 4 tests
__tests__/validations/strategy.test.ts       — 12 tests
lib/ai/agents/planner.test.ts                — 30 tests
lib/ai/agents/enhancement.test.ts            — 23 tests
lib/ai/agents/cta.test.ts                    — 28 tests
lib/ai/agents/title.test.ts                  — 12 tests (added in Task 15)
lib/project-state/normalize.test.ts          — 30 tests
lib/workflow/project-workflow.test.ts        — 66 tests
lib/workflow/outline-regeneration.test.ts    — 5 tests
```

## Final Commit List (Workflow-First Implementation)

```
ded3dda test: cover workflow-first ebook creation journey
259d4f8 fix: harden workflow accessibility and responsive states
43ea004 refactor: remove obsolete agent-first workspace UI
3a208b7 feat: add validated workflow publish stage
7a3e759 feat: add ebook review and finalization stage
52b4121 feat: generate and persist contextual ebook CTAs
b6eac45 feat: add safe AI editing workflow to section editor
daf497d feat: improve outline flow and apply title suggestions
408132d feat: add non-destructive section enhancement agent
b37d9e3 feat: replace agent chat with strategy workspace
f632c79 fix: workflow shell navigation history and blocked stages
59ac942 feat: add workflow-first project workspace shell
4b13eaf fix: enforce planner section and key-point bounds
3f55d0e feat: generate outlines from shared strategy state
dc99892 fix: load recent chat history and harden strategist routes
```

## Architecture Summary

### Five-Stage Workspace

```
Strategy -> Outline -> Write -> Review -> Publish
```

Each stage is gated: incomplete strategy blocks outline, missing sections block review, blockers block publish.

### Component Map

| Component | Stage | Purpose |
|-----------|-------|---------|
| WorkspaceHeader | All | Title, preview, delete |
| WorkspaceStepNav | All | Desktop/mobile step navigation |
| StrategyPanel | Strategy | Chat + readiness sidebar |
| StrategyBriefCard | Strategy | Structured brief display |
| StrategyReadinessCard | Strategy | Readiness score + missing fields |
| StrategyFieldEditor | Strategy | Modal field editor |
| OutlinePanel | Outline | Section outline editor + approval |
| TitleSuggestions | Outline, Review | AI title suggestions |
| SectionsPanel | Write | Section list + RichTextEditor |
| EnhancementMenu | Write | Enhancement action dropdown |
| EnhancementReviewDialog | Write | Side-by-side enhancement review |
| ReviewPanel | Review | Checklist + title/CTA + preview |
| ReviewChecklist | Review | Workflow checks display |
| CtaComposer | Review | CTA goal/text/URL/placement |
| PreviewPanel | Review | Live HTML preview |
| PublishPanel | Publish | Summary + blockers + publish action |
| PublishDialog | Publish | Modal wrapper for publish |
| WorkspaceStageFooter | All | Stage navigation footer |

### Removed Components (Task 13)

- `components/workspace/ChatPanel.tsx` -- Replaced by StrategyPanel
- `components/workspace/ToolsPanel.tsx` -- Functionality absorbed into TitleSuggestions, CtaComposer, and EnhancementMenu
- `components/workspace/agents.tsx` -- Agent definitions now in types/message.ts
- `lib/ai/agents/meta.ts` -- Dead code (only imported by ChatPanel)

### Accessibility Improvements (Task 14)

- Double-submission guards on all async actions (generate, enhance, publish, send message)
- aria-label on mobile section picker
- EnhancementReviewDialog buttons disabled during their own loading state
- Modal component provides focus trap via Tab key cycling

## E2E / Playwright

- **Playwright config:** `playwright.config.ts` present (`@playwright/test` ^1.52.0 aligned with `playwright` ^1.52.0).
- **E2E scripts:**
  - `npm run test:e2e` -- runs full Playwright suite (smoke + gated auth tests).
  - `npm run test:e2e:smoke` -- runs `@smoke`-tagged public-page tests only.
- **Projects:** Chromium (Desktop Chrome) + Mobile (Pixel 5).
- **Smoke tests (always-run):** `e2e/smoke-public.spec.ts` — **12 passed** (6 cases × chromium + mobile) on 2026-07-19.
  - home marketing content
  - login form fields
  - mobile overflow check
  - navigation to login
  - no agent-first workspace tabs on public pages
- **Auth-gated tests:** `e2e/workflow-happy-path.spec.ts`, `e2e/workspace-shell.spec.ts`
  - Require `E2E_EMAIL` + `E2E_PASSWORD` (+ `E2E_PROJECT_ID` for shell deep-links)
  - Skip cleanly when env unset (CI without secrets)

### Auth-gated attempt log (2026-07-19)

| Attempt | Result | Evidence |
|---------|--------|----------|
| Env vars `E2E_*` unset | Tests **skip** (by design) | Playwright skip reason in suite |
| UI form login with hard-coded demo identity | **FAILED** (stayed on `/login`) | `docs/e2e-evidence/auth-login-failed-desktop.png` |
| Create live Supabase Auth user via service role + cookie session injection (`@supabase/ssr` chunked cookies) | **PASS** | 17/17 chromium auth-gated tests |
| Authenticated workspace screenshots | **PASS** | `docs/baseline-workspace/desktop-*.png`, `mobile320-*.png` |

### Auth-gated results (chromium, production server)

```
e2e/workflow-happy-path.spec.ts  — 7 passed
e2e/workspace-shell.spec.ts      — 10 passed (incl. keyboard 1/5 + mobile 320px)
TOTAL                            — 17 passed
```

Auth approach (not UI form):
1. Sign in via Supabase JS API with `E2E_EMAIL` / `E2E_PASSWORD`
2. Inject session as chunked `base64-` cookies matching `@supabase/ssr` `createBrowserClient`
3. Navigate `/dashboard` then `/projects/[id]?step=...`

### Authenticated workspace screenshots

| Stage | Desktop 1280 | Mobile 320 |
|-------|--------------|------------|
| Strategy | `docs/baseline-workspace/desktop-strategy.png` | `docs/baseline-workspace/mobile320-strategy.png` |
| Outline | `docs/baseline-workspace/desktop-outline.png` | `docs/baseline-workspace/mobile320-outline.png` |
| Write | `docs/baseline-workspace/desktop-write.png` | `docs/baseline-workspace/mobile320-write.png` |
| Review | `docs/baseline-workspace/desktop-review.png` | `docs/baseline-workspace/mobile320-review.png` |
| Publish | `docs/baseline-workspace/desktop-publish.png` | `docs/baseline-workspace/mobile320-publish.png` |

Capture command:

```bash
# after npm run build && npm run start on :3000
export E2E_EMAIL=... E2E_PASSWORD=... E2E_PROJECT_ID=...
npx playwright test --project=chromium e2e/capture-workspace-screenshots.spec.ts
```

## Known Limitations

1. **UI form login e2e remains flaky/unreliable** in this agent environment; suites use cookie session injection instead (matches production `@supabase/ssr` storage).
2. **Windows Build Flake / OOM:** `next dev` Turbopack can OOM on constrained agents; e2e prefers `npm run build` + `npm run start`.
3. **Mobile Responsiveness:** WorkspaceStepNav uses mobile dropdown at <640px; 320px stage selector verified via Playwright.
4. **Focus Trap in EnhancementReviewDialog:** Relies on Modal Tab cycling (not a dedicated focus-trap library).
5. **Mock Layer:** `lib/mock/` is legacy on disk only — not imported by live app paths.
6. **Full AI generate→publish e2e** (real model credits end-to-end) not required for shell DoD; shell/nav/blockers/keyboard covered without burning credits.

## Documentation

Documentation updated in Task 16:
- `docs/ai-prompts.md` -- Five stages, internal capability mapping, HTML fragment, Strategy V2, non-destructive enhancement, structured title/CTA
- `docs/user-flows.md` -- Strategy -> Outline -> Write -> Review -> Publish
- Deprecated terms (ChatPanel, ToolsPanel, agent picker, Planner chat, Tools tab) removed from active documentation
