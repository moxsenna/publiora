# Publiora Workflow-First UI/UX & Agent Integration Implementation Plan

> **Status:** Ready for execution  
> **Repository baseline:** `moxsenna/publiora`, branch `master`, audited 2026-07-19  
> **Primary objective:** Replace the misleading agent-first workspace with a workflow-first ebook creation experience, then connect every AI capability to the correct stage and shared project state.  
> **Target workflow:** `Strategy → Outline → Write → Review → Publish`

---

## 0. Instructions for the Coding Agent

This document is the execution source of truth for this initiative. Implement tasks in order. Do not jump directly to visual polish before contracts, persistence, and workflow derivation are correct.

### Required working rules

1. Read `AGENTS.md` before changing code.
2. Because this repository uses a breaking-change Next.js version, inspect the relevant documentation under `node_modules/next/dist/docs/` before changing routing, server components, route handlers, caching, or request APIs.
3. Use a dedicated branch:

   ```bash
   git checkout -b feat/workflow-first-workspace
   ```

4. Preserve the existing live AI provider architecture in:
   - `lib/ai/provider.ts`
   - `lib/ai/agents/*`
5. Do not introduce mock AI fallbacks into production paths.
6. Client code must call `/api/*`; do not access Supabase directly from client components unless that is already an established repository pattern for the exact feature.
7. Validate every changed API request and AI structured output with Zod.
8. Preserve credit debit/refund semantics for all AI operations.
9. Never place API keys, cookies, tokens, service-role keys, or secrets in code, tests, fixtures, logs, or documentation.
10. Keep commits small and aligned with the task boundaries in this plan.
11. Run the relevant tests after every task, not only at the end.
12. Do not refactor unrelated areas.
13. Do not silently overwrite user-generated content.
14. Do not report a UI action as successful until the server has persisted it.
15. Use accessible labels, keyboard focus, loading states, and actionable error messages.

### Baseline commands

Run before implementation and record any existing failures in the PR description:

```bash
npm install
npm test
npm run build
```

If Playwright configuration is present, also run the existing end-to-end command. Do not invent a new command without updating `package.json`.

---

## 1. Executive Decision

### 1.1 Replace agent-first navigation with workflow-first navigation

Remove this user-facing mental model:

```text
Strategist | Planner | Writer | Enhancement | Title | CTA
```

Replace it with:

```text
Strategy → Outline → Write → Review → Publish
```

Agent names remain internal implementation capabilities:

| Workflow stage | Internal AI capability |
|---|---|
| Strategy | Strategist |
| Outline | Planner, with Title suggestions available contextually |
| Write | Writer and Enhancement |
| Review | Title, CTA, content checks, preview |
| Publish | Publish validation and immutable published snapshot |

The user must never need to decide which agent to invoke. The current page and action determine the correct capability.

### 1.2 Preserve the flat outline model in this implementation

The current database and TypeScript model store a flat `outline.sections` array. Do **not** combine this UI/UX refactor with a chapter hierarchy migration.

For this project:

- Keep the flat section structure.
- Improve section grouping and editing UX without adding `chapters` to persistence.
- Treat a future chapter hierarchy as a separate epic with its own migration and backward-compatibility plan.

This decision prevents scope explosion and reduces risk to section generation, ordering, and publishing.

### 1.3 Keep HTML as the canonical section content for now

The current editor and database use `content_html`. Keep that canonical representation in this implementation.

Requirements:

- AI Writer and Enhancement may return sanitized HTML fragments.
- Never return a full HTML document.
- Sanitize before persistence and before publication.
- Update AI documentation so it no longer conflicts with the actual canonical format.
- Markdown canonical-storage migration is explicitly out of scope.

### 1.4 Enhancement must become non-destructive

The current generic Enhancement operation must not immediately overwrite `ebook_sections.content_html`.

New flow:

```text
Choose action → Generate suggestion → Review original vs suggestion → Accept or Reject
```

Only **Accept** persists the suggestion through the normal section update mutation.

### 1.5 Workflow step is derived, not stored

Do not add a mutable `current_step` database field. Derive the recommended step from project state, outline state, and generated sections. This avoids stale or contradictory state.

The user may still revisit completed steps at any time.

---

## 2. Current-State Problems to Resolve

The implementation must explicitly resolve all of these issues:

1. `ChatPanel` displays six selectable agents, but the chat backend always invokes Strategist.
2. The user-facing UI implies six parallel chat personas even though most capabilities are button-driven utilities.
3. Strategist output does not fully match the intended structured contract.
4. Strategist state patches can replace existing state instead of safely merging with it.
5. Planner does not consume the Strategist’s current structured state.
6. Enhancement is generic, destructive, and implemented inline in a route rather than as a reusable agent runner.
7. Title and CTA results are copy-only utilities instead of project-level actions.
8. Tools are placed in a generic `Tools` tab instead of the workflow stages where they are needed.
9. Publish is globally available before the user has clearly completed review.
10. The workspace tabs represent implementation features rather than the user’s outcome-oriented process.

---

## 3. Product and UX Goals

### 3.1 Primary user outcome

A user should be able to go from a rough ebook idea to a reviewed and published ebook without understanding the internal multi-agent architecture.

### 3.2 UX principles

1. **One clear stage at a time.**
2. **One primary action per stage.**
3. **AI appears in context, not as a persona picker.**
4. **Structured state is visible and editable.**
5. **Every destructive AI change is reviewable.**
6. **Progress is based on actual persisted data.**
7. **Users can move backward without losing work.**
8. **Blocked actions explain exactly what is missing.**
9. **Generated suggestions can be applied, rejected, or regenerated.**
10. **Mobile layouts preserve the same workflow, not a reduced alternate product.**

### 3.3 Success criteria

The implementation is successful when:

- No global agent selector remains in the workspace.
- The five workflow stages are visible and navigable.
- A newly created project opens in Strategy.
- Strategist state survives refreshes and accumulates rather than being overwritten.
- Planner receives the normalized strategy state.
- Outline approval unlocks the expected writing flow.
- Enhancement never changes a section until the user accepts it.
- Title suggestions can be applied to the project.
- CTA suggestions can be applied and persist through publication.
- Review clearly shows blockers and warnings.
- Publish is gated by deterministic validation.
- All new API contracts have unit/integration coverage.
- The main workflow has Playwright coverage.

---

## 4. Scope

### 4.1 In scope

- Workspace information architecture.
- Five-stage navigation.
- Strategy workspace with chat, structured brief, readiness, and missing information.
- Versioned structured project state and safe merge behavior.
- Planner input integration with strategy state.
- Contextual title suggestions in Outline and Review.
- Writing workspace improvements.
- Seven Enhancement actions with non-destructive preview.
- Review stage with deterministic checks.
- Structured CTA generation and persistence.
- Publish stage and publication gating.
- Database migration required for persistent CTA data.
- Updated TypeScript types, Zod schemas, API hooks, unit tests, integration tests, and end-to-end tests.
- Removal of obsolete agent-selector and generic Tools UI.
- Documentation alignment.

### 4.2 Explicitly out of scope

- Chapter-based outline database migration.
- Changing the AI provider or model vendor.
- Adding a mock AI production fallback.
- Replacing TipTap.
- Markdown as canonical section storage.
- Full collaborative editing.
- Full document version history.
- AI-generated cover design.
- PDF, EPUB, or DOCX export redesign.
- Analytics dashboard redesign.
- Billing redesign.
- Claim-link redesign, except ensuring CTA fields do not break publication.
- Broad design-system replacement.

---

## 5. Target Information Architecture

### 5.1 Desktop shell

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Back  Project title              Saved        Preview               │
├─────────────────────────────────────────────────────────────────────┤
│ Strategy  Outline  Write  Review  Publish                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        Active stage content                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Current progress / blocker                         Primary CTA       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Mobile shell

```text
Project title
[Stage 2 of 5: Outline ▼]

Active stage content

[Sticky primary action]
```

Requirements:

- Do not force the five labels into an unreadable horizontal row.
- Use a compact step selector or horizontally scrollable step rail with clear active state.
- The primary action may be sticky at the bottom, but must not cover editable content.

### 5.3 Stage responsibilities

#### Strategy

- Strategist conversation.
- Structured ebook brief.
- Readiness score.
- Missing fields.
- Manual corrections to brief.
- Primary CTA: `Create outline`.

#### Outline

- Project title and subtitle.
- Generated flat section list.
- Edit, add, remove, and reorder sections.
- Regenerate using the current strategy.
- Title suggestions.
- Primary CTA: `Approve outline` or `Continue to Write`.

#### Write

- Section navigator.
- TipTap editor.
- Generate one or all remaining sections.
- Enhancement actions.
- Save state and generation progress.
- Primary CTA: `Review ebook` once all sections contain content.

#### Review

- Deterministic content checks.
- Title and subtitle finalization.
- CTA goal, URL, and text.
- CTA generation.
- Full preview.
- Primary CTA: `Continue to Publish`.

#### Publish

- Final validation.
- Public/private setting.
- Publication summary.
- Publish action and result link.

---

## 6. Domain Contracts

Create these contracts before UI work so components do not invent their own interpretation of state.

### 6.1 Workflow types

Create `types/workflow.ts`:

```ts
export type ProjectWorkflowStep =
  | "strategy"
  | "outline"
  | "write"
  | "review"
  | "publish";

export type WorkflowStepStatus =
  | "complete"
  | "current"
  | "available"
  | "blocked"
  | "needs_attention";

export interface WorkflowBlocker {
  code: string;
  message: string;
  targetStep: ProjectWorkflowStep;
}

export interface WorkflowCheck {
  id: string;
  label: string;
  severity: "pass" | "warning" | "blocker";
  message?: string;
  targetStep?: ProjectWorkflowStep;
}

export interface ProjectWorkflowState {
  recommendedStep: ProjectWorkflowStep;
  steps: Record<ProjectWorkflowStep, WorkflowStepStatus>;
  checks: WorkflowCheck[];
  blockers: WorkflowBlocker[];
  completedSectionCount: number;
  totalSectionCount: number;
  writingProgress: number;
  canPublish: boolean;
}
```

### 6.2 Strategy state

Create `types/strategy.ts`:

```ts
export const PROJECT_STATE_SCHEMA_VERSION = 2 as const;

export type StrategyNextAction =
  | "continue_strategy"
  | "create_outline"
  | "review_outline"
  | "start_writing";

export interface EbookStrategy {
  topic: string | null;
  audience: string | null;
  audience_sophistication: string | null;
  primary_problem: string | null;
  pain_points: string[];
  desired_outcome: string | null;
  core_promise: string | null;
  unique_angle: string | null;
  content_pillars: string[];
  product_or_offer: string | null;
  funnel_goal: string | null;
  cta_goal: string | null;
  tone: string | null;
}

export interface ProjectStateV2 {
  schema_version: typeof PROJECT_STATE_SCHEMA_VERSION;
  strategy: EbookStrategy;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary: string | null;
  updated_at: string;
}

export interface StrategistResult {
  assistant_message: string;
  state_patch: Partial<EbookStrategy>;
  readiness_score: number;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary?: string;
}
```

### 6.3 Legacy normalization

Create `lib/project-state/normalize.ts` with:

- `createEmptyProjectState()`
- `normalizeProjectState(raw: unknown): ProjectStateV2`
- `mergeProjectState(current, strategistResult): ProjectStateV2`

Rules:

1. Unknown keys are discarded.
2. Existing valid values are preserved when absent from the patch.
3. An explicit `null` may clear a scalar field.
4. Arrays in a patch replace the previous array; they are not blindly concatenated.
5. Trim strings.
6. Remove blank array items and duplicates.
7. Clamp readiness to `0..100`.
8. Convert legacy top-level strategy fields into the V2 nested structure.
9. Persist `schema_version: 2` on every successful write.
10. Do not trust AI-provided `updated_at`; generate it server-side.

### 6.4 Enhancement contracts

Create `types/ai-suggestions.ts`:

```ts
export type EnhancementAction =
  | "expand"
  | "shorten"
  | "simplify"
  | "persuasive"
  | "professional"
  | "add_examples"
  | "add_checklist";

export interface EnhancementSuggestion {
  action: EnhancementAction;
  original_html: string;
  suggested_html: string;
  summary: string;
  original_word_count: number;
  suggested_word_count: number;
}

export type TitleStyle =
  | "curiosity"
  | "authority"
  | "practical"
  | "contrarian"
  | "outcome";

export interface TitleSuggestion {
  style: TitleStyle;
  title: string;
  rationale: string;
}

export type CtaGoal =
  | "visit_product"
  | "join_whatsapp"
  | "claim_bonus"
  | "buy_product"
  | "follow_creator"
  | "custom";

export interface CtaSuggestion {
  goal: CtaGoal;
  text: string;
  placement: "ebook_end" | "claim_page" | "both";
  rationale: string;
}
```

### 6.5 Persistent CTA fields

`projects.subtitle` already exists. Add only the missing CTA persistence fields.

Create a new migration, using the next chronological migration number:

```sql
alter table public.projects
  add column if not exists cta_goal text,
  add column if not exists final_cta text,
  add column if not exists cta_url text;

alter table public.projects
  add constraint projects_cta_goal_check
  check (
    cta_goal is null or cta_goal in (
      'visit_product',
      'join_whatsapp',
      'claim_bonus',
      'buy_product',
      'follow_creator',
      'custom'
    )
  );

alter table public.published_ebooks
  add column if not exists cta_goal text,
  add column if not exists final_cta text,
  add column if not exists cta_url text;
```

Implementation notes:

- Make constraint creation idempotent using the project’s established migration style or a guarded `DO` block.
- Keep all fields nullable for backward compatibility.
- Update `types/project.ts` and `types/published-ebook.ts`.
- Update any serialization and database mappers.
- Include these fields in publication snapshots.

---

## 7. Workflow Derivation Rules

Create a pure function in `lib/workflow/project-workflow.ts`:

```ts
export function deriveProjectWorkflow(input: {
  project: Project;
  strategyState: ProjectStateV2;
  readinessScore: number;
  outline: Outline | null;
  sections: EbookSection[];
}): ProjectWorkflowState;
```

### 7.1 Strategy completeness

Strategy is complete when:

- `readinessScore >= 70`
- `strategy.topic` is non-empty
- `strategy.audience` is non-empty
- `strategy.primary_problem` is non-empty
- `strategy.desired_outcome` is non-empty
- `strategy.core_promise` is non-empty
- `strategy.unique_angle` is non-empty

CTA and product fields are not Strategy blockers. They become Review warnings or blockers based on the selected CTA goal.

### 7.2 Outline completeness

Outline is complete when:

- an outline exists,
- it contains at least three valid sections,
- each section has a non-empty title,
- `outline.approved === true`.

An unapproved outline is editable and available, but Write should display a clear blocker.

### 7.3 Write completeness

Write is complete when:

- outline is approved,
- the number of persisted ebook sections matches the approved outline section count,
- every required section has status `generated` or `edited`,
- every required section has non-empty sanitized text content.

Do not rely only on `project.sections_generated`; calculate from actual section records.

### 7.4 Review completeness

Review has no separate stored completion flag. It is complete enough to publish when:

- Write is complete.
- `project.title` is non-empty.
- No blocker-level content checks exist.
- If `project.cta_goal` is set, `project.final_cta` must be non-empty.
- If the CTA goal requires a destination, `project.cta_url` must be valid.

URL-required goals:

- `visit_product`
- `join_whatsapp`
- `claim_bonus`
- `buy_product`

`follow_creator` may accept a URL but still requires one for the initial implementation. `custom` requires a URL only when the user enters one; it is otherwise allowed.

### 7.5 Publish gating

`canPublish` is true only when all blocker-level checks pass.

The server must repeat the validation. Client-side gating is not sufficient.

### 7.6 Recommended step

Use the first incomplete stage:

1. Strategy incomplete → `strategy`
2. Strategy complete, outline unapproved or absent → `outline`
3. Outline approved, writing incomplete → `write`
4. Writing complete, review blockers/warnings unresolved → `review`
5. Ready → `publish`

If the project is already published, default to `publish` but preserve navigation to prior stages.

---

## 8. Target API Contracts

### 8.1 Strategy read

Create:

```text
GET /api/projects/[id]/strategy
```

Response:

```json
{
  "state": {
    "schema_version": 2,
    "strategy": {},
    "missing_fields": [],
    "next_action": "continue_strategy",
    "conversation_summary": null,
    "updated_at": "2026-07-19T00:00:00.000Z"
  },
  "readiness_score": 0
}
```

The route must return a normalized empty state when no `project_states` row exists.

### 8.2 Manual strategy correction

Create:

```text
PATCH /api/projects/[id]/strategy
```

Request:

```json
{
  "strategy_patch": {
    "audience": "Freelancer pemula"
  }
}
```

Behavior:

- Validate known fields.
- Merge safely.
- Do not call AI.
- Do not debit credits.
- Recalculate missing fields deterministically.
- Keep readiness score unless the repository introduces a deterministic readiness calculator. Do not fabricate an AI score.

### 8.3 Strategy chat

Change:

```text
POST /api/projects/[id]/chat
```

Request:

```json
{
  "content": "Saya ingin membuat ebook untuk..."
}
```

Remove `agent` from the client contract.

Server behavior:

1. Authenticate and verify project ownership.
2. Validate content.
3. Load current normalized project state.
4. Load recent conversation messages.
5. Provide current state, conversation summary, and latest message to Strategist.
6. Validate the structured Strategist result.
7. Merge the patch with existing state.
8. Store the user message with `agent: null` or `strategist`; use one convention consistently.
9. Store the assistant message with `agent: "strategist"`.
10. Upsert the merged state and readiness score.
11. Return message plus normalized state.
12. Preserve credit refund behavior when generation fails.

Response:

```json
{
  "message": {},
  "state": {},
  "readiness_score": 78,
  "next_action": "create_outline",
  "missing_fields": []
}
```

### 8.4 Outline generation

Keep the existing route path unless a rename has clear repository-wide value.

Required Planner input:

```ts
{
  project: {
    title: project.title,
    subtitle: project.subtitle,
    description: project.description,
    audience: project.audience,
    niche: project.niche,
    tone: project.tone,
    ebook_type: project.ebook_type
  },
  strategy: normalizedState.strategy,
  readiness_score: projectState.readiness_score,
  user_instruction?: string
}
```

Requirements:

- Reject generation with `409` and a structured blocker response if Strategy is not ready.
- The response remains a flat section outline for this implementation.
- Generate 5–10 sections unless the user explicitly asks otherwise.
- Return section title, summary, key points, and estimated words.
- Persist the outline.
- Reset approval when regenerating.
- Do not discard the Strategy state.

### 8.5 Enhancement generation

Change the existing section enhancement endpoint:

```text
POST /api/projects/[id]/sections/[sectionId]/enhance
```

Request:

```json
{
  "action": "add_examples",
  "selection_html": null,
  "instruction": null
}
```

Response:

```json
{
  "suggestion": {
    "action": "add_examples",
    "original_html": "...",
    "suggested_html": "...",
    "summary": "Added two practical examples.",
    "original_word_count": 420,
    "suggested_word_count": 560
  }
}
```

Critical behavior:

- Do **not** update `ebook_sections` in this endpoint.
- Sanitize both original and suggested HTML.
- Ensure the result remains an HTML fragment.
- Debit/refund using the `enhancement` job/credit category, not `title`.
- Support enhancing a selection when `selection_html` is present.
- When enhancing a selection, return a replacement fragment and enough metadata for the client to apply it safely.
- Initial acceptance may support whole-section enhancement first, but selection support must have an explicit follow-up task and must not be falsely exposed in UI before implemented.

Acceptance persistence uses the existing section update endpoint.

### 8.6 Title generation

Change title output from `string[]` to `TitleSuggestion[]`.

Request should include:

- normalized strategy,
- current title,
- audience,
- ebook type,
- desired outcome,
- tone.

Response example:

```json
{
  "suggestions": [
    {
      "style": "practical",
      "title": "7 Langkah Membangun Sistem Affiliate Pertama Anda",
      "rationale": "Concrete, outcome-led, and suitable for beginners."
    }
  ]
}
```

Applying a suggestion updates `projects.title` through the standard project update endpoint. `projects.title` is the publication source of truth.

### 8.7 CTA generation

Change CTA output from `string[]` to `CtaSuggestion[]`.

Request:

```json
{
  "goal": "join_whatsapp",
  "destination_url": "https://...",
  "placement": "ebook_end",
  "custom_instruction": null
}
```

Server enriches the prompt with:

- project title,
- ebook type,
- audience,
- sophistication,
- product/offer,
- core promise,
- desired outcome,
- selected goal.

Applying a suggestion updates:

- `projects.cta_goal`
- `projects.final_cta`
- `projects.cta_url`

### 8.8 Publish

Update the publish route so it:

1. Loads project, normalized strategy, outline, and all required sections.
2. Calls the same server-side workflow validator used by UI-derived logic.
3. Returns `409` with blocker details when not publishable.
4. Snapshots title, subtitle, author, cover, sections, CTA goal, final CTA, and CTA URL.
5. Sanitizes section content.
6. Keeps existing public/private behavior.
7. Does not set project status to `publishing` before validation passes.
8. Restores a safe status when snapshot insertion fails.

---

## 9. Component Architecture

### 9.1 New components

Create:

```text
components/workspace/
├── WorkspaceHeader.tsx
├── WorkspaceStepNav.tsx
├── WorkspaceStageFooter.tsx
├── StrategyPanel.tsx
├── StrategyBriefCard.tsx
├── StrategyReadinessCard.tsx
├── StrategyFieldEditor.tsx
├── TitleSuggestions.tsx
├── EnhancementMenu.tsx
├── EnhancementReviewDialog.tsx
├── ReviewPanel.tsx
├── ReviewChecklist.tsx
├── CtaComposer.tsx
└── PublishPanel.tsx
```

Do not create a giant all-purpose component. Keep server data orchestration in the project page or dedicated hooks; keep stage components focused on presentation and stage actions.

### 9.2 Existing components to modify

```text
app/(app)/projects/[id]/page.tsx
components/workspace/OutlinePanel.tsx
components/workspace/SectionsPanel.tsx
components/workspace/PreviewPanel.tsx
components/workspace/PublishDialog.tsx
lib/api/hooks.ts
store/projectStore.ts
```

### 9.3 Components to remove after migration

Remove only after no imports remain:

```text
components/workspace/ChatPanel.tsx
components/workspace/ToolsPanel.tsx
components/workspace/agents.tsx
```

If some presentation logic is reusable, move it into the new contextual components rather than keeping obsolete names.

### 9.4 Workspace store

Update `store/projectStore.ts`:

- Replace old tab union with `ProjectWorkflowStep`.
- Persist only lightweight UI state if already supported.
- Do not persist derived workflow completion.
- Store selected section ID.
- Store unsaved editor state only if the existing design already does so safely.
- Do not duplicate React Query server state in Zustand.

### 9.5 URL state

Use a query parameter for deep-linkable stages:

```text
/projects/[id]?step=outline
```

Rules:

- Invalid values fall back to `recommendedStep`.
- Browser Back/Forward should navigate between stages.
- Opening a blocked stage is allowed for visibility, but the stage must explain its blockers and disable invalid actions.
- Avoid redirect loops between project status and query state.

---

## 10. Detailed UX Specifications

### 10.1 Strategy panel

Layout on desktop:

```text
┌──────────────────────────┬──────────────────────────────┐
│ Strategy conversation    │ Ebook brief                  │
│                          │ Readiness: 72%               │
│ Messages                 │ ✓ Audience                   │
│                          │ ✓ Problem                    │
│ Composer                 │ ○ Offer                      │
│                          │ [Edit fields]                │
└──────────────────────────┴──────────────────────────────┘
```

Requirements:

- Header label: `Strategy Assistant`, not `Strategist Agent`.
- No agent chips or agent dropdown.
- Show loading skeleton separately for messages and strategy state.
- Show readiness as a percentage and text label.
- Show missing fields in plain language.
- Allow manual editing of structured fields.
- Suggestions should be task prompts, not persona switches.
- Suggested prompts should change according to missing fields.
- `Create outline` is enabled only when the deterministic Strategy gate passes.
- When readiness is below threshold, primary CTA becomes `Continue strategy` and focuses the composer.
- Preserve message history and scroll behavior.
- Use optimistic UI only for the user message; reconcile with server result.

### 10.2 Outline panel

Requirements:

- Remove copy that tells the user to use a Planner agent.
- Empty state explains that the outline will use the approved strategy.
- Display a compact strategy summary above generation.
- Add optional generation instruction input.
- Keep add/edit/delete/reorder.
- Preserve stable section IDs through reordering.
- Regeneration must require confirmation when an outline already exists.
- Confirmation must explain whether existing generated sections will be affected.
- Do not silently delete generated section content.
- If regeneration changes IDs, require an explicit migration strategy or block regeneration once writing exists.

Recommended safe rule:

- Allow free regeneration before any section content exists.
- Once content exists, offer:
  - `Edit current outline`, or
  - `Regenerate and reset written sections` with explicit destructive confirmation.

Title suggestions:

- Display structured style badges.
- Provide `Use this title`.
- Applying updates the project immediately and invalidates/refetches project queries.
- Copy remains a secondary action.

Approval:

- Require at least three valid sections.
- Disable approval during save or generation.
- After approval, primary CTA becomes `Continue to Write`.

### 10.3 Write panel

Desktop:

```text
┌──────────────────────┬──────────────────────────────────┐
│ Section navigator    │ Editor                           │
│ ✓ Introduction       │ Title                            │
│ ● Main topic         │ TipTap                           │
│ ○ Next step          │                                  │
│                      │ Save  Generate  Enhance           │
└──────────────────────┴──────────────────────────────────┘
```

Requirements:

- Keep clear generated/editing/failed/pending states.
- Show actual word counts.
- Disable generation for an already generating section.
- Show per-section retry when generation fails.
- `Generate remaining` must show progress and allow safe retry.
- Do not navigate away with unsaved changes without warning.
- Enhancement actions are presented as an editor dropdown or command menu.
- Enhancement labels must be user-facing verbs:
  - Expand
  - Shorten
  - Simplify
  - More persuasive
  - More professional
  - Add examples
  - Add checklist
- The action menu must explain whether it applies to the entire section.
- Do not expose selection-only behavior until correctly implemented.

### 10.4 Enhancement review

Use a dialog or full-width review drawer.

Must show:

- Action used.
- Short AI summary.
- Original word count.
- Suggested word count.
- Original content.
- Suggested content.
- Accept.
- Reject.
- Regenerate.

Safety rules:

- Render sanitized HTML.
- Do not use `dangerouslySetInnerHTML` without the repository sanitizer.
- Accept invokes the existing section update mutation.
- Reject closes without persistence.
- Regenerate keeps the original content as the source, not the prior suggestion.
- Closing the dialog is equivalent to rejecting the unsaved suggestion.
- After accept, update editor content only after server persistence succeeds.
- Provide an Undo affordance for the current session by retaining the prior HTML until another edit occurs. Undo must also persist through the section update endpoint.

A sophisticated textual diff library is optional. Side-by-side original and suggestion is sufficient for the initial implementation.

### 10.5 Review panel

Sections:

1. Readiness summary.
2. Content checks.
3. Final title and subtitle.
4. Final CTA.
5. Full preview.

Checks must be deterministic. Suggested checks:

| Check | Severity |
|---|---|
| Strategy readiness below threshold | Blocker before outline; warning during review if project has progressed through legacy data |
| Outline not approved | Blocker |
| Missing section | Blocker |
| Empty section content | Blocker |
| Failed section generation | Blocker |
| Title empty | Blocker |
| Subtitle empty | Warning |
| Section much shorter than median | Warning |
| Duplicate section title | Warning |
| CTA goal selected but CTA text empty | Blocker |
| URL-required CTA missing/invalid URL | Blocker |
| No CTA configured | Warning |

Do not block publishing solely because the subtitle is empty or no CTA is configured, unless business requirements later make CTA mandatory. Show a deliberate warning and let the user continue.

CTA composer:

- Select goal.
- Enter destination URL when applicable.
- Choose placement.
- Generate suggestions.
- Edit text manually.
- Apply and persist.
- Show current saved CTA.

### 10.6 Publish panel

Requirements:

- Show publication title, subtitle, author, section count, CTA status, and visibility.
- Show blockers inline with direct links to the relevant stage.
- Disable Publish while blockers exist.
- Publish button must have a pending state and prevent duplicate submission.
- On success, show the public/read URL if available.
- Preserve existing public/private semantics.
- A republish operation must clearly state that it replaces the previous publication snapshot for this project.

---

## 11. AI Agent Specifications

### 11.1 Strategist

Files:

- `lib/ai/agents/strategist.ts`
- `lib/ai/prompts.ts`
- related Zod schema file if separated

Input must include:

- normalized current strategy state,
- conversation summary,
- recent messages,
- latest user message,
- relevant project metadata.

Output must exactly match `StrategistResult`.

Prompt rules:

- Ask at most one or two high-value questions per response.
- Do not repeatedly ask for information already present in state.
- State patches contain facts inferred or confirmed in the latest turn.
- Do not invent a product, audience, or promise.
- Return missing fields separately.
- `next_action` is `create_outline` only when the strategy is sufficiently complete.
- The assistant message is natural language, while state fields remain concise.

### 11.2 Planner

Files:

- `lib/ai/agents/planner.ts`
- `lib/ai/prompts.ts`

Prompt rules:

- Use strategy as the primary source of truth.
- Respect audience sophistication, core promise, unique angle, tone, and desired outcome.
- Produce a coherent progression rather than unrelated section titles.
- Keep the existing flat persistence model.
- Every section includes:
  - stable generated ID,
  - title,
  - summary,
  - 2–5 key points,
  - estimated word count.
- Avoid generic filler sections unless they serve the promise.

### 11.3 Writer

Files:

- `lib/ai/agents/writer.ts`
- `lib/ai/prompts.ts`

Input must include:

- full normalized strategy,
- current outline,
- current section,
- neighboring section titles and summaries,
- previous section summary where available,
- tone and target words.

Output:

```ts
{
  content_html: string;
  word_count: number;
}
```

Rules:

- Generate one section only.
- Return an HTML fragment.
- No `<html>`, `<head>`, `<body>`, scripts, styles, forms, iframes, or event handlers.
- Avoid repeating the introduction in every section.
- Use headings below the section title level.
- Preserve continuity with neighboring sections.
- Word count is recalculated server-side after sanitization; do not trust AI count blindly.

### 11.4 Enhancement

Create:

- `lib/ai/agents/enhancement.ts`

Do not keep the full prompt inline in the route.

Action behavior:

| Action | Expected behavior |
|---|---|
| `expand` | Add useful depth without changing the core claim |
| `shorten` | Reduce length while preserving essential meaning |
| `simplify` | Use clearer language and shorter sentences |
| `persuasive` | Strengthen benefits, evidence, and flow without fabricating facts |
| `professional` | Improve structure, tone, and precision |
| `add_examples` | Add clearly labeled realistic examples; do not claim real data unless provided |
| `add_checklist` | Add an actionable checklist derived from the section |

Rules:

- Preserve valid HTML structure.
- Never add unsupported factual claims, testimonials, statistics, or guarantees.
- Return a short summary of changes.
- Use the current strategy and section purpose as context.

### 11.5 Title

Files:

- `lib/ai/agents/title.ts`
- `lib/ai/prompts.ts`

Generate one suggestion for each configured style. Avoid near-duplicates. The rationale must be concise and useful, not marketing filler.

### 11.6 CTA

Files:

- `lib/ai/agents/cta.ts`
- `lib/ai/prompts.ts`

Rules:

- Match the selected goal.
- Use the ebook promise and audience context.
- Avoid fake urgency, false scarcity, or fabricated proof.
- Return CTA copy without embedding an unsafe link.
- URL remains a separately validated field.

---

## 12. File Change Map

### 12.1 Create

```text
types/workflow.ts
types/strategy.ts
types/ai-suggestions.ts
lib/project-state/normalize.ts
lib/project-state/normalize.test.ts
lib/workflow/project-workflow.ts
lib/workflow/project-workflow.test.ts
lib/ai/agents/enhancement.ts
app/api/projects/[id]/strategy/route.ts
components/workspace/WorkspaceHeader.tsx
components/workspace/WorkspaceStepNav.tsx
components/workspace/WorkspaceStageFooter.tsx
components/workspace/StrategyPanel.tsx
components/workspace/StrategyBriefCard.tsx
components/workspace/StrategyReadinessCard.tsx
components/workspace/StrategyFieldEditor.tsx
components/workspace/TitleSuggestions.tsx
components/workspace/EnhancementMenu.tsx
components/workspace/EnhancementReviewDialog.tsx
components/workspace/ReviewPanel.tsx
components/workspace/ReviewChecklist.tsx
components/workspace/CtaComposer.tsx
components/workspace/PublishPanel.tsx
supabase/migrations/20260719000001_workflow_review_cta.sql
```

Add route/component tests following the repository’s existing test placement conventions.

### 12.2 Modify

```text
app/(app)/projects/[id]/page.tsx
app/api/projects/[id]/chat/route.ts
app/api/projects/[id]/outline/route.ts
app/api/projects/[id]/sections/[sectionId]/enhance/route.ts
app/api/projects/[id]/titles/route.ts
app/api/projects/[id]/ctas/route.ts
app/api/projects/[id]/publish/route.ts
app/api/projects/[id]/route.ts
components/workspace/OutlinePanel.tsx
components/workspace/SectionsPanel.tsx
components/workspace/PreviewPanel.tsx
components/workspace/PublishDialog.tsx
lib/ai/prompts.ts
lib/ai/agents/strategist.ts
lib/ai/agents/planner.ts
lib/ai/agents/writer.ts
lib/ai/agents/title.ts
lib/ai/agents/cta.ts
lib/api/hooks.ts
store/projectStore.ts
types/message.ts
types/project.ts
types/published-ebook.ts
docs/ai-prompts.md
docs/user-flows.md
```

### 12.3 Remove after cutover

```text
components/workspace/ChatPanel.tsx
components/workspace/ToolsPanel.tsx
components/workspace/agents.tsx
```

Do not remove them before the new components are integrated and all imports are migrated.

---

## 13. Implementation Tasks

Each task includes dependencies, concrete work, acceptance criteria, and a suggested commit.

### Task 0 — Establish baseline

**Dependencies:** none

- [ ] Read `AGENTS.md`.
- [ ] Inspect relevant Next.js 16 documentation under `node_modules/next/dist/docs/`.
- [ ] Create the feature branch.
- [ ] Run baseline tests and build.
- [ ] Record existing failures without fixing unrelated issues.
- [ ] Capture screenshots of current desktop and mobile workspace for regression reference.

**Acceptance criteria**

- Baseline results are recorded in the PR description.
- No production code changed except an optional implementation-plan file commit.

**Suggested commit**

```text
chore: record workflow workspace baseline
```

---

### Task 1 — Add domain types, normalization, and workflow derivation

**Dependencies:** Task 0

**Files**

- Create `types/workflow.ts`.
- Create `types/strategy.ts`.
- Create `types/ai-suggestions.ts`.
- Create `lib/project-state/normalize.ts`.
- Create `lib/project-state/normalize.test.ts`.
- Create `lib/workflow/project-workflow.ts`.
- Create `lib/workflow/project-workflow.test.ts`.
- Modify relevant shared exports.

**Steps**

- [ ] Implement empty V2 project state.
- [ ] Implement legacy state normalization.
- [ ] Implement safe merge semantics.
- [ ] Implement deterministic missing-field calculation.
- [ ] Implement workflow derivation.
- [ ] Add tests for all threshold and blocker cases.

**Required tests**

- Empty legacy state normalizes safely.
- Existing valid legacy fields are retained.
- Partial patch does not delete unrelated fields.
- Explicit null clears a scalar.
- Arrays replace and deduplicate.
- Invalid AI keys are discarded.
- Readiness is clamped.
- Workflow selects each of the five stages correctly.
- Publish is blocked when a section is empty.
- CTA URL rules work per goal.
- Published legacy project still opens in Publish.

**Acceptance criteria**

- Functions are pure and independent of React/Supabase.
- All new unit tests pass.

**Suggested commit**

```text
feat: add project strategy and workflow contracts
```

---

### Task 2 — Add CTA persistence migration and types

**Dependencies:** Task 1

**Files**

- Create Supabase migration.
- Modify `types/project.ts`.
- Modify `types/published-ebook.ts`.
- Modify database mappers and API serialization.

**Steps**

- [ ] Add nullable CTA fields to `projects`.
- [ ] Add CTA snapshot fields to `published_ebooks`.
- [ ] Add guarded CTA-goal constraint.
- [ ] Update generated/manual database types according to repository conventions.
- [ ] Ensure old rows deserialize with nulls.

**Acceptance criteria**

- Migration is idempotent under the project’s migration workflow.
- Existing projects and publications continue to load.
- TypeScript build succeeds.

**Suggested commit**

```text
feat: persist project and publication CTA settings
```

---

### Task 3 — Repair Strategist contract and shared state persistence

**Dependencies:** Tasks 1–2

**Files**

- `lib/ai/prompts.ts`
- `lib/ai/agents/strategist.ts`
- `app/api/projects/[id]/chat/route.ts`
- Create `app/api/projects/[id]/strategy/route.ts`
- `types/message.ts`
- `lib/api/hooks.ts`

**Steps**

- [ ] Define Zod schemas for Strategist result.
- [ ] Include normalized existing state in the prompt.
- [ ] Include conversation summary and recent messages.
- [ ] Add `missing_fields` and `next_action`.
- [ ] Replace state overwrite with safe merge.
- [ ] Add Strategy GET and PATCH routes.
- [ ] Remove `agent` from `SendMessageInput`.
- [ ] Ensure chat messages are attributed consistently to Strategist.
- [ ] Add route tests for ownership, validation, merge, and AI failure refund.

**Acceptance criteria**

- Repeated chat turns accumulate state.
- Refresh returns the same normalized strategy.
- Manual edits persist without AI credits.
- Chat cannot route to Planner/Writer/Title/CTA.
- Failed AI generation does not corrupt state.

**Suggested commit**

```text
fix: make strategist state cumulative and structured
```

---

### Task 4 — Connect Planner to Strategy

**Dependencies:** Task 3

**Files**

- `lib/ai/agents/planner.ts`
- `lib/ai/prompts.ts`
- `app/api/projects/[id]/outline/route.ts`
- outline tests

**Steps**

- [ ] Load normalized Strategy state in outline generation.
- [ ] Add Strategy readiness validation.
- [ ] Return structured blockers for unready projects.
- [ ] Improve Planner output schema while keeping flat sections.
- [ ] Preserve section IDs and valid estimated word counts.
- [ ] Reset approval on regeneration.
- [ ] Define safe behavior when written sections already exist.

**Acceptance criteria**

- Planner uses audience, promise, angle, and desired outcome from Strategy.
- An unready project cannot generate an outline through direct API calls.
- Existing written content is never silently deleted.
- Outline tests pass.

**Suggested commit**

```text
feat: generate outlines from shared strategy state
```

---

### Task 5 — Build the workflow workspace shell

**Dependencies:** Task 1; may proceed in parallel with Tasks 3–4 after contracts stabilize

**Files**

- `app/(app)/projects/[id]/page.tsx`
- `components/workspace/WorkspaceHeader.tsx`
- `components/workspace/WorkspaceStepNav.tsx`
- `components/workspace/WorkspaceStageFooter.tsx`
- `store/projectStore.ts`

**Steps**

- [ ] Replace old tab type with `ProjectWorkflowStep`.
- [ ] Add query-parameter stage navigation.
- [ ] Render five workflow stages.
- [ ] Derive status from actual project data.
- [ ] Add stage-level blocker UI.
- [ ] Replace global Publish button with Preview plus contextual next action.
- [ ] Update keyboard shortcuts so they map to the five workflow stages.
- [ ] Implement responsive stage navigation.

**Acceptance criteria**

- URL can deep-link to every stage.
- Back/Forward navigation works.
- Invalid step values fall back safely.
- Opening a blocked stage explains the blocker.
- Desktop and mobile layouts remain usable.
- Old tabs are no longer the primary navigation.

**Suggested commit**

```text
feat: add workflow-first project workspace shell
```

---

### Task 6 — Replace ChatPanel with StrategyPanel

**Dependencies:** Tasks 3 and 5

**Files**

- Create Strategy components.
- Integrate in project page.
- Migrate reusable message rendering from `ChatPanel.tsx`.

**Steps**

- [ ] Build strategy conversation area.
- [ ] Build structured brief card.
- [ ] Build readiness card.
- [ ] Build missing-field prompts.
- [ ] Add manual field editing.
- [ ] Remove all agent selection UI.
- [ ] Add contextual primary CTA.
- [ ] Handle message, state, and project update invalidation.
- [ ] Add loading, empty, and error states.

**Acceptance criteria**

- No six-agent selector exists.
- Strategy state updates after each assistant response.
- Manual edits survive refresh.
- The primary CTA changes correctly based on readiness.
- Keyboard and screen-reader usage are supported.

**Suggested commit**

```text
feat: replace agent chat with strategy workspace
```

---

### Task 7 — Refine Outline stage and contextual titles

**Dependencies:** Tasks 4–6

**Files**

- `components/workspace/OutlinePanel.tsx`
- Create `TitleSuggestions.tsx`
- `lib/ai/agents/title.ts`
- title route and hooks

**Steps**

- [ ] Remove Planner-agent language.
- [ ] Show strategy summary.
- [ ] Add optional Planner instruction.
- [ ] Preserve current outline editing features.
- [ ] Implement safe regeneration rules.
- [ ] Change Title AI output to structured suggestions.
- [ ] Add `Use this title` action.
- [ ] Apply selected title to the project and refetch.
- [ ] Make approval and next-step states explicit.

**Acceptance criteria**

- Titles are applied, not only copied.
- Existing section content cannot be erased without explicit confirmation.
- Outline approval unlocks Write.
- Flat outline compatibility remains intact.

**Suggested commit**

```text
feat: improve outline flow and apply title suggestions
```

---

### Task 8 — Implement reusable Enhancement agent and non-destructive API

**Dependencies:** Tasks 1 and 3

**Files**

- Create `lib/ai/agents/enhancement.ts`.
- Modify enhancement route.
- Modify prompt schemas.
- Add route/agent tests.

**Steps**

- [ ] Implement all seven actions.
- [ ] Move prompt logic out of route.
- [ ] Return `EnhancementSuggestion`.
- [ ] Stop writing to the section in the generation route.
- [ ] Correct credit/job category to Enhancement.
- [ ] Sanitize output.
- [ ] Recalculate word counts server-side.
- [ ] Add validation for unsupported actions and oversized content.
- [ ] Add refund-path tests.

**Acceptance criteria**

- Calling Enhance does not change persisted section HTML.
- Each action has a distinct prompt behavior.
- Invalid or unsafe AI output is rejected or sanitized.
- Credit accounting uses Enhancement semantics.

**Suggested commit**

```text
feat: add non-destructive section enhancement agent
```

---

### Task 9 — Upgrade Write stage and Enhancement review UX

**Dependencies:** Tasks 5 and 8

**Files**

- `components/workspace/SectionsPanel.tsx`
- Create `EnhancementMenu.tsx`.
- Create `EnhancementReviewDialog.tsx`.
- hooks and editor tests

**Steps**

- [ ] Reorganize section navigator and editor layout.
- [ ] Add enhancement action menu.
- [ ] Generate suggestion without changing editor content.
- [ ] Show original and suggestion side by side.
- [ ] Implement Accept, Reject, Regenerate, and session Undo.
- [ ] Persist only on Accept or Undo.
- [ ] Add unsaved-change navigation protection.
- [ ] Improve generate-all progress and retry.

**Acceptance criteria**

- Reject and close leave content untouched.
- Accept persists then updates editor.
- Undo persists the original content.
- Failed persistence leaves the suggestion open and explains the failure.
- Generate-all does not start duplicate jobs.

**Suggested commit**

```text
feat: add safe AI editing workflow to section editor
```

---

### Task 10 — Add structured CTA generation and project application

**Dependencies:** Tasks 2–3

**Files**

- `lib/ai/agents/cta.ts`
- `lib/ai/prompts.ts`
- CTA route
- `lib/api/hooks.ts`
- project update route/type schemas

**Steps**

- [ ] Define structured CTA request/response schemas.
- [ ] Include full strategy context.
- [ ] Validate CTA goal and URL separately.
- [ ] Return multiple differentiated suggestions.
- [ ] Add project persistence mutations.
- [ ] Add route tests and failure/refund tests.

**Acceptance criteria**

- CTA output is goal-aware.
- Apply persists goal, text, and URL.
- Invalid destination URLs are rejected.
- Existing projects with null CTA fields continue to work.

**Suggested commit**

```text
feat: generate and persist contextual ebook CTAs
```

---

### Task 11 — Build Review stage

**Dependencies:** Tasks 7, 9, and 10

**Files**

- Create `ReviewPanel.tsx`.
- Create `ReviewChecklist.tsx`.
- Create `CtaComposer.tsx`.
- Reuse/adapt `PreviewPanel.tsx`.

**Steps**

- [ ] Render deterministic checks from workflow state.
- [ ] Link every blocker to its relevant stage/section.
- [ ] Add final title/subtitle editing.
- [ ] Add Title suggestions.
- [ ] Add CTA configuration and suggestions.
- [ ] Add full preview.
- [ ] Add Continue to Publish CTA.
- [ ] Distinguish warnings from blockers.

**Acceptance criteria**

- Review contains no hidden AI-only checks.
- Blockers are reproducible from persisted data.
- Changes persist and update checks immediately.
- Users can continue with warnings but not blockers.

**Suggested commit**

```text
feat: add ebook review and finalization stage
```

---

### Task 12 — Build Publish stage and enforce server validation

**Dependencies:** Task 11

**Files**

- Create `PublishPanel.tsx`.
- Modify `PublishDialog.tsx` or replace its usage.
- Modify publish route.
- Modify public reader/published ebook types if CTA is rendered.

**Steps**

- [ ] Add publication summary.
- [ ] Add visibility selection.
- [ ] Enforce shared server-side validation.
- [ ] Include CTA fields in snapshot.
- [ ] Render final CTA at the end of the published ebook when configured.
- [ ] Sanitize CTA presentation and keep URL in a safe anchor.
- [ ] Add republish copy.
- [ ] Handle success and failure states.

**Security requirements**

- Validate URL protocol: allow `https:` and optionally `http:` only in local development if repository policy permits.
- Add `rel="noopener noreferrer"` for external links.
- Do not permit `javascript:`, `data:`, or other unsafe protocols.
- Escape CTA text.

**Acceptance criteria**

- Direct API publish requests cannot bypass blockers.
- CTA is preserved in the published snapshot.
- Existing publications without CTA render correctly.
- Duplicate publish clicks do not create inconsistent state.

**Suggested commit**

```text
feat: add validated workflow publish stage
```

---

### Task 13 — Remove obsolete agent-first UI

**Dependencies:** Tasks 6–12

**Files**

- Remove `ChatPanel.tsx`.
- Remove `ToolsPanel.tsx`.
- Remove `agents.tsx`.
- Remove dead types, imports, styles, and agent-selection state.

**Steps**

- [ ] Search the repository for all six agent-picker references.
- [ ] Remove unused prompt suggestions tied to persona selection.
- [ ] Remove obsolete `SendMessageInput.agent` use.
- [ ] Keep DB message agent values for history compatibility unless a migration is clearly required.
- [ ] Remove dead generic Tools routing.
- [ ] Run TypeScript/build to catch hidden imports.

**Acceptance criteria**

- No global agent selector appears anywhere.
- No dead component imports remain.
- Historical messages still deserialize.
- Build succeeds.

**Suggested commit**

```text
refactor: remove obsolete agent-first workspace UI
```

---

### Task 14 — Accessibility, responsive behavior, and failure states

**Dependencies:** Tasks 5–13

**Steps**

- [ ] Verify all stage navigation is keyboard accessible.
- [ ] Add visible focus states.
- [ ] Add accessible names to icon-only buttons.
- [ ] Use dialogs with focus trap and focus restoration.
- [ ] Announce AI generation and save results with appropriate live regions.
- [ ] Ensure color is not the sole status indicator.
- [ ] Test at 320 px width and common tablet/desktop widths.
- [ ] Add skeletons for first load.
- [ ] Add retry actions for network and AI errors.
- [ ] Preserve unsaved editor content during recoverable errors.
- [ ] Prevent double submissions.

**Acceptance criteria**

- Core workflow can be completed using keyboard only.
- No horizontal page overflow at 320 px.
- Dialogs restore focus to their trigger.
- Every async operation exposes pending, success, and failure states.

**Suggested commit**

```text
fix: harden workflow accessibility and responsive states
```

---

### Task 15 — Test the complete workflow

**Dependencies:** all feature tasks

#### Unit tests

Cover:

- State normalization and merge.
- Workflow derivation.
- URL validation.
- Prompt output schemas.
- Enhancement action validation.
- Word-count calculation after sanitization.

#### Route/integration tests

Cover:

- Unauthorized and wrong-owner access.
- Strategist state accumulation.
- Manual strategy patch.
- Outline readiness blocking.
- Planner receives strategy.
- Enhancement is non-destructive.
- Enhancement credit refund.
- Title structured output.
- CTA structured output and persistence.
- Publish blocker enforcement.
- CTA publication snapshot.

#### Playwright end-to-end scenarios

1. **New project happy path**
   - Open new project.
   - Complete Strategy.
   - Generate and approve outline.
   - Generate sections.
   - Enhance one section, reject once, then accept.
   - Apply a title.
   - Apply a CTA.
   - Review.
   - Publish.

2. **Refresh persistence**
   - Change Strategy field.
   - Refresh.
   - Verify it persists.
   - Apply title/CTA.
   - Refresh.
   - Verify both persist.

3. **Blocked publish**
   - Leave a section empty.
   - Verify Publish stage shows blocker.
   - Call publish API through UI.
   - Verify no publication is created.

4. **Enhancement safety**
   - Generate suggestion.
   - Close dialog.
   - Verify section unchanged.
   - Accept another suggestion.
   - Verify persisted change after refresh.

5. **Responsive flow**
   - Run key happy-path stage navigation at mobile viewport.

6. **AI/network failure**
   - Stub route failure according to existing test conventions.
   - Verify content and state remain intact.

**Acceptance criteria**

```bash
npm test
npm run build
```

must pass, plus the repository’s Playwright command.

**Suggested commit**

```text
test: cover workflow-first ebook creation journey
```

---

### Task 16 — Documentation and final cleanup

**Dependencies:** Task 15

**Files**

- `docs/ai-prompts.md`
- `docs/user-flows.md`
- optional architecture/API docs that now conflict
- `README.md` only if user-facing setup or commands changed

**Steps**

- [ ] Document five workflow stages.
- [ ] Document internal capability mapping.
- [ ] Document HTML fragment contract.
- [ ] Document Strategy state V2.
- [ ] Document non-destructive Enhancement flow.
- [ ] Document structured Title/CTA contracts.
- [ ] Remove or mark outdated six-agent chat diagrams.
- [ ] Verify no secrets are present.
- [ ] Search for outdated terms: `Tools`, global agent picker, Planner chat, Enhancement chat.
- [ ] Run final tests/build.
- [ ] Perform final manual QA.

**Acceptance criteria**

- Docs describe the shipped behavior.
- No known conflicting architecture statement remains.
- PR contains screenshots/video of desktop and mobile workflow.

**Suggested commit**

```text
docs: align agent architecture with workflow-first product
```

---

## 14. Testing Matrix

| Area | Scenario | Expected result |
|---|---|---|
| Strategy | First message | State row is created and normalized |
| Strategy | Later partial update | Existing fields remain intact |
| Strategy | Manual correction | Persists without AI call or credit debit |
| Strategy | AI malformed output | Request fails safely; state is unchanged; refund occurs |
| Outline | Strategy below threshold | Generation blocked with actionable fields |
| Outline | Regenerate before writing | Allowed after confirmation |
| Outline | Regenerate after writing | Explicit destructive flow required |
| Outline | Apply title | Project title persists and publish preview updates |
| Write | Generate section | Section is sanitized and persisted |
| Write | Generate duplicate click | Only one operation is active |
| Enhancement | Generate suggestion | Database content remains unchanged |
| Enhancement | Reject | Original remains |
| Enhancement | Accept | Suggested content persists |
| Enhancement | Save failure | Dialog remains open; original persisted state remains |
| Review | Empty section | Blocker points to exact section |
| Review | Missing subtitle | Warning only |
| CTA | URL-required goal without URL | Blocker/validation error |
| CTA | Apply suggestion | Goal, text, and URL persist |
| Publish | Client bypass attempt | Server returns 409 blockers |
| Publish | Successful snapshot | Sections and CTA are copied to published record |
| Legacy | Existing project without V2 state | Opens and normalizes safely |
| Legacy | Existing publication without CTA | Reader renders normally |
| Mobile | Five-stage navigation | Usable without overflow |
| Accessibility | Keyboard-only flow | All primary actions reachable |

---

## 15. Error and Loading-State Requirements

Use consistent messages and do not expose raw provider/database internals.

### Strategy

- Loading history.
- Loading structured state.
- Sending message.
- AI unavailable.
- State persistence failed.

### Outline

- Strategy incomplete.
- Generating.
- Insufficient credits.
- Regeneration conflict with written sections.
- Save/reorder failure.

### Write

- Generating one section.
- Generating multiple sections with count.
- Save pending.
- Enhancement pending.
- Enhancement failed.
- Concurrent edit warning when relevant.

### Review and Publish

- Loading checks.
- Save title/CTA pending.
- Invalid URL.
- Publish blocked.
- Publish pending.
- Publish failed with retry.
- Publish succeeded.

Errors should include a user action whenever possible: Retry, Edit Strategy, Open Section, Add URL, or Return to Review.

---

## 16. Credit and Job Accounting

Maintain explicit operation categories:

| Operation | Expected category |
|---|---|
| Strategist chat | Strategist/chat category already used by repository |
| Outline | `outline` |
| Section Writer | `section` |
| Enhancement | `enhancement` |
| Title | `title` |
| CTA | `cta` |
| Publish | Existing publish behavior; do not add AI charge |

Requirements:

- Debit once per attempted provider operation.
- Refund once when provider generation or required parsing fails.
- Do not refund after a successful generation merely because the client later rejects a suggestion.
- Do not charge for applying, rejecting, editing, or undoing existing suggestions.
- Log operation type, model, duration, success/failure, and job ID where available.
- Do not log full user content, full prompts, tokens, or secrets.

---

## 17. Security and Data Integrity

1. Verify project ownership in every route.
2. Validate UUID route params according to repository conventions.
3. Sanitize all AI-generated HTML before persistence and publication.
4. Use URL allowlisting for CTA destinations.
5. Never trust client-reported workflow completion.
6. Never trust AI-reported word counts or readiness outside schema bounds.
7. Do not accept arbitrary state keys from AI or manual PATCH.
8. Prevent oversized message/content payloads.
9. Prevent duplicate publish/generate submissions.
10. Keep legacy data readable.
11. Use safe rollback/status restoration on publish failure.
12. Avoid exposing provider error bodies to the client.

---

## 18. Performance Requirements

- Use React Query caching and invalidation rather than duplicate fetches.
- Avoid fetching all messages on every strategy edit.
- Limit chat context server-side while retaining a conversation summary.
- Memoize pure workflow derivation only where measurement shows value; do not prematurely optimize.
- Lazy-load heavy editor/review UI if compatible with current Next.js patterns.
- Avoid rendering sanitized full ebook preview on every keystroke; debounce or render from saved data.
- Generate all sections sequentially or with a safe bounded concurrency based on existing credit/provider constraints.
- Do not initiate AI requests during render.

---

## 19. Rollout Strategy

Use a single feature branch and staged commits. Do not maintain two permanent workspace implementations.

Recommended rollout:

1. Merge database-compatible backend changes first or in the same deployment as UI.
2. Ensure migration runs before routes attempt to write CTA fields.
3. Deploy to preview/staging.
4. Test at least:
   - one new project,
   - one legacy draft,
   - one project with generated sections,
   - one already published project.
5. Verify credit debit/refund records.
6. Verify public reader with and without CTA.
7. Deploy production.
8. Monitor route error rates and publish failures.

Rollback requirements:

- Nullable CTA columns make schema rollback unnecessary.
- UI rollback must continue to tolerate V2 project state and CTA fields.
- Do not drop old message agent values.
- Do not delete legacy Strategy fields during normalization.

---

## 20. Pull Request Structure

The final PR description must include:

### Summary

- Why the agent-first UX was misleading.
- The new workflow stages.
- Backend state and API changes.
- Enhancement safety changes.

### Database changes

- Migration name.
- Added columns and constraints.
- Backward compatibility.

### Screenshots or recording

- Strategy desktop/mobile.
- Outline.
- Write plus Enhancement review.
- Review.
- Publish.

### Test evidence

- Unit test result.
- Build result.
- Playwright result.
- Manual legacy-project verification.

### Known limitations

- Flat outline remains.
- No full version history.
- Selection enhancement status, if deferred.

---

## 21. Definition of Done

This initiative is complete only when all statements below are true.

### Product

- [ ] Workspace uses Strategy, Outline, Write, Review, Publish.
- [ ] Agent selector is removed.
- [ ] AI capabilities appear only in relevant contexts.
- [ ] Every stage has one clear primary action.
- [ ] Progress and blockers are derived from persisted data.

### Strategy and Planner

- [ ] Strategist state uses the V2 contract.
- [ ] State patches merge safely.
- [ ] Existing state is supplied to Strategist.
- [ ] Planner consumes Strategy state.
- [ ] Strategy readiness is enforced server-side for outline generation.

### Writer and Enhancement

- [ ] Writer generates sanitized HTML fragments one section at a time.
- [ ] Enhancement supports all seven actions.
- [ ] Enhancement generation is non-destructive.
- [ ] Accept, Reject, Regenerate, and Undo behave correctly.
- [ ] Enhancement uses the correct credit category.

### Title, CTA, Review, and Publish

- [ ] Title output is structured and can be applied.
- [ ] CTA output is structured and can be applied.
- [ ] CTA persists to project and publication snapshot.
- [ ] Review blockers and warnings are deterministic.
- [ ] Publish cannot be bypassed via direct API calls.
- [ ] Public reader handles CTA safely.

### Quality

- [ ] Unit tests pass.
- [ ] Route/integration tests pass.
- [ ] Playwright happy path passes.
- [ ] `npm run build` passes.
- [ ] Mobile layout is usable at 320 px.
- [ ] Keyboard-only core workflow works.
- [ ] No secrets or mock production fallbacks were introduced.
- [ ] Obsolete components and dead imports are removed.
- [ ] Docs match implementation.

---

## 22. Final Expected Architecture

```text
Project Workspace
│
├── Strategy
│   ├── Strategy Assistant chat
│   ├── Structured Strategy State V2
│   ├── Readiness and missing fields
│   └── Manual corrections
│
├── Outline
│   ├── Planner consumes Strategy State
│   ├── Flat editable sections
│   ├── Contextual Title suggestions
│   └── Approval gate
│
├── Write
│   ├── Writer per section
│   ├── TipTap editor
│   ├── Generate remaining
│   └── Enhancement suggestion review
│
├── Review
│   ├── Deterministic checks
│   ├── Final title/subtitle
│   ├── Contextual CTA composer
│   └── Full preview
│
└── Publish
    ├── Server-side validation
    ├── Visibility
    ├── Immutable publication snapshot
    └── Reader output with optional CTA
```

The final product should feel like a guided publishing workspace with contextual AI—not a chat application containing six loosely connected personas.
