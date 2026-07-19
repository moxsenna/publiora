# Baseline: Workflow-First Workspace (2026-07-19)

> Updated after Tasks 13-16 completion. Recorded at end of workflow-first UI refactor.

## Environment

- **Branch:** `feat/workflow-first-workspace`
- **Latest Commit:** `ded3dda` (`test: cover workflow-first ebook creation journey`)
- **Node:** v22
- **Next.js:** 16.2.6 (Turbopack)
- **React:** 19.2.4
- **Test runner:** Vitest 4.1.8

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

- **Playwright config:** Not present (no `playwright.config.*` file).
- **E2E script in package.json:** None.
- **Note:** E2E testing is deferred. No Playwright suite exists and none was created.

## Known Limitations

1. **E2E Testing:** Deferred -- no Playwright configuration exists. All coverage is via unit tests (266 tests).
2. **Windows Build Flake:** Intermittent Turbopack worker crash on `npm run build` during page data collection (exit code 3221226505). Consistently recovers on retry.
3. **Mobile Responsiveness:** WorkspaceStepNav uses mobile dropdown selector at <640px. Section picker in SectionsPanel has similar pattern. No additional breakpoint optimization at 320px beyond existing responsive patterns.
4. **Focus Trap in EnhancementReviewDialog:** Relies on Modal component's built-in Tab cycling (not a dedicated focus-trap library). Adequate for current use.
5. **Mock Layer:** `lib/mock/` directory exists as legacy reference only -- not imported by any live code path. Future cleanup can remove it entirely.

## Documentation

Documentation updated in Task 16:
- `docs/ai-prompts.md` -- Five stages, internal capability mapping, HTML fragment, Strategy V2, non-destructive enhancement, structured title/CTA
- `docs/user-flows.md` -- Strategy -> Outline -> Write -> Review -> Publish
- Deprecated terms (ChatPanel, ToolsPanel, agent picker, Planner chat, Tools tab) removed from active documentation
