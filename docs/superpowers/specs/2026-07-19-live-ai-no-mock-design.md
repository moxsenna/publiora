# Design: Live AI + Client Always Live API (Approach B)

**Date:** 2026-07-19  
**Status:** Approved for implementation planning  
**Goal:** AI features work fully against the real router; remove silent mock/template success paths; client never falls back to in-memory mock API.

---

## 1. Problem

Publiora already has real AI agents (`lib/ai/agents/*`) and OpenAI-compatible provider wiring (`lib/ai/provider.ts`) pointing at `https://9router.appvibe.web.id/v1`. However:

1. **Agents swallow AI failures** and return hard-coded template content (strategist, planner, writer, title, cta). Users can believe generation succeeded when the model never ran.
2. **Provider only tries one fallback model**, not the full chain requested.
3. **Client hooks default to mock** (`NEXT_PUBLIC_USE_MOCK_API !== "false"`) and import `lib/mock/api`, so a mis-set env re-enables fake data.
4. **Claim page** still branches into mock DB.
5. **UI agent labels** live in `lib/mock/ai.ts`, coupling presentation to the mock module.
6. **Enhance route** charges credits then silently keeps original HTML if AI fails.

`.env.local` already sets live flags and the router API key. The remaining work is code path correctness + multi-model resilience, not greenfield AI.

---

## 2. Goals / Non-goals

### Goals

- Every AI action (chat, outline, section write, title, CTA, enhance) calls the router; no template “success” on failure.
- Model chain: primary + ordered fallbacks until one returns usable content.
- Client runtime always uses live `/api/*` (no `shouldUseMock` branch).
- Clear errors to UI; credit refund paths remain correct when generation fails after charge.
- Env defaults and examples point to live mode.
- Risks from approach B are explicitly mitigated (see §7).

### Non-goals

- Full deletion of `lib/mock/*` (that is approach C).
- Changing PayCore / `CREDITS_MOCK_TOPUP` behavior beyond leaving current live config alone.
- Client token streaming / SSE rewrite.
- Prompt redesign beyond what is required for JSON reliability.
- New AI product features.

---

## 3. Architecture

### 3.1 AI completion chain

```
Agent (strategist | planner | writer | title | cta | enhance)
  → completeJson / completeText (lib/ai/provider.ts)
    → for model in [primary, ...fallbacks]:
         POST {AI_BASE_URL}/chat/completions
         if usable text → return
         else log + continue
    → if all fail → throw Error (message includes last status/body snippet)
```

**Models (ordered):**

1. `gcli/grok-4.5-high` (primary via `AI_MODEL`)
2. `ag/gemini-pro-agent`
3. `ag/gemini-3.1-pro-low`
4. `cx/gpt-5.6-terra`
5. `cx/gpt-5.6-sol`

**Config:**

| Env | Role |
|-----|------|
| `AI_PROVIDER=router` | OpenAI-compatible path |
| `AI_BASE_URL=https://9router.appvibe.web.id/v1` | Gateway |
| `AI_API_KEY` | Server-only secret |
| `AI_MODEL` | Primary model id |
| `AI_MODEL_FALLBACKS` | Comma-separated ordered fallbacks |
| `AI_MODEL_FALLBACK` | Legacy single fallback; merged into list if present and not already listed |

**Failure criteria per attempt:** non-2xx, empty assistant text, parse failure for JSON path (after extract), request timeout (default 60s).

**Success criteria:** non-empty assistant text; for `completeJson`, parseable JSON object (existing fence/brace recovery kept).

Gemini-native path remains only when `AI_PROVIDER=gemini` and no router key path is used; default remains router.

### 3.2 Agents — no fake success

| Agent | On AI/provider failure | On empty/invalid structured result |
|-------|------------------------|------------------------------------|
| strategist | throw | throw if no `assistant_message` |
| planner | throw | throw if no sections |
| writer | throw | throw if no `content_html` |
| title | throw | throw if no titles array / empty |
| cta | throw | throw if no ctas array / empty |
| enhance (route) | throw after charge → refund | throw; do not persist “success” with original body while charging |

Remove all local `fallback()` helpers that fabricate chat/outline/HTML/title/CTA strings.

### 3.3 API routes

Existing routes already call agents and refund on thrown errors for outline/section/enhance charge paths. After agents throw:

- **Chat** (`POST /api/projects/[id]/chat`): return 503 with error message. User message already inserted stays; UI shows error and allows resend (no auto-delete of user message).
- **Outline generate / section generate / titles / ctas / enhance:** propagate error; keep existing refund `try/catch` where charge already happened.
- Do not catch agent errors and convert them into 200 + fake payload.

### 3.4 Client always live

**`lib/api/hooks.ts`**

- Delete `import * as api from "@/lib/mock/api"`.
- Delete `shouldUseMock()`.
- Every `queryFn` / `mutationFn` uses `apiFetch` only.

**`app/claim/[token]/page.tsx`**

- Remove mock import branch; resolve claim via live API / server data only.

**`lib/api/client.ts`**

- Remove production-only “mock forbidden” special case once mock client path is gone (or reduce to no-op documentation). `apiFetch` remains the single client HTTP helper.

**Env defaults**

- `USE_MOCK_API` default `false`
- `NEXT_PUBLIC_USE_MOCK_API` default `false`
- `.env.example` and deploy examples show `false`
- `getServerEnv()` continues to require `AI_API_KEY` (router) and `SUPABASE_SERVICE_ROLE_KEY` when mock is false

**UI constants**

- New `lib/ai/agents/meta.ts` exports `AGENT_LABELS` and `AGENT_COLORS` (moved from `lib/mock/ai.ts`).
- `components/workspace/ChatPanel.tsx` imports from `@/lib/ai/agents/meta`.

**`lib/mock/*`**

- Remains on disk for possible tests / future purge (C).
- Must have **zero imports** from `app/`, `components/`, `lib/api/` runtime modules after this work.
- Add short `lib/mock/README.md`: not used in live mode; do not import from app runtime.

---

## 4. Data flow (post-change)

```
Browser hooks
  → apiFetch("/api/...")
    → app/api/* route
      → Supabase (auth, project, messages, outlines, sections, credits)
      → lib/ai/agents/* → lib/ai/provider → 9router chat/completions
```

No path: hooks → `lib/mock/api` → in-memory `lib/mock/db`.

---

## 5. Error handling & credits

1. Provider throws after all models fail with aggregated last error.
2. Agent does not catch-and-fake; may catch only to log then rethrow.
3. Routes that charged credits already refund on outer catch — keep that.
4. Enhance: if AI fails, refund and return error; never return 200 with unchanged content after a successful charge.
5. Client: existing `ApiError` surfaces `body.error.message`; workspace mutations should toast/show that message (use existing Toaster patterns where present; if a call site swallows errors, fix only AI-related call sites that would hide failures).

---

## 6. Configuration snapshot (local)

Already present in `.env.local` (keep; extend fallbacks):

```
AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_API_KEY=<server secret>
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
```

API key stays server-only. Never prefix with `NEXT_PUBLIC_`.

---

## 7. Risk mitigation matrix

| Risk | Mitigation |
|------|------------|
| All models down | Ordered chain; final throw; UI 503 + message |
| Silent fake outline/chat | Delete agent template fallbacks |
| Enhance charges without change | Throw + refund; no silent original keep after charge |
| Env re-enables mock | Defaults false; remove client mock branches entirely |
| Response shape mismatch mock vs live | Live-only paths; smoke checklist on each AI action |
| Timeout hangs request | Per-attempt timeout (~60s); then next model |
| Credits lost on AI fail | Agents throw; existing route refunds stay |
| Missing env at boot | `getServerEnv()` fail-fast when live |
| Secret leakage | Server env only for key |
| Claim page break | Live-only resolve; verify `/api/claim/[token]` (or current live path) |
| Billing regression | Do not change PayCore logic in this work |
| Dead mock confuses future edits | `lib/mock/README.md` + no runtime imports |
| Chat user message orphan on AI fail | Keep message; UI error; user can resend (documented) |

---

## 8. Files to touch

| File | Change |
|------|--------|
| `lib/ai/provider.ts` | Multi-model chain, timeout, env fallbacks list |
| `lib/env.ts` | `AI_MODEL_FALLBACKS`, mock defaults false, validation |
| `lib/ai/agents/strategist.ts` | Remove fallback; throw |
| `lib/ai/agents/planner.ts` | Remove fallback; throw |
| `lib/ai/agents/writer.ts` | Remove fallback; throw |
| `lib/ai/agents/title.ts` | Remove hardcode list; throw |
| `lib/ai/agents/cta.ts` | Remove hardcode list; throw |
| `lib/ai/agents/meta.ts` | **New** labels/colors |
| `app/api/projects/[id]/sections/[sectionId]/enhance/route.ts` | Fail + refund, no silent keep |
| `components/workspace/ChatPanel.tsx` | Import meta |
| `lib/api/hooks.ts` | Live-only |
| `app/claim/[token]/page.tsx` | Live-only |
| `lib/api/client.ts` | Drop mock production guard if obsolete |
| `.env.example` | Live defaults + fallbacks list |
| `.env.local` | Add `AI_MODEL_FALLBACKS` (key already set) |
| `lib/mock/README.md` | **New** dead-code notice |

Optional: chat route may attach a stable error code `ai_unavailable` for client handling — only if not already covered by generic 503.

---

## 9. Verification checklist (definition of done)

1. `rg "from \"@/lib/mock|from '@/lib/mock|lib/mock/api|shouldUseMock" app components lib/api` → no runtime hits (allow none).
2. Chat with real project → reply is model-generated, not the fixed “Saya baca brief…” template from old fallback.
3. Force bad primary model → logs show next model tried; success or final error without fake outline.
4. Outline generate with invalid key → non-2xx + credit refund (if charged), not 5-section template.
5. Enhance failure → refund + error, section body unchanged and not presented as polished success.
6. Claim page loads without importing mock modules.
7. Typecheck / existing unit tests still pass (or only fail tests that intentionally required mock client — adjust those tests to live mocks of `fetch` if any).

---

## 10. Implementation order

1. Env + provider multi-model chain.
2. Agent throw-on-fail + enhance route.
3. Agent meta + ChatPanel import.
4. Hooks + claim + client live-only.
5. Env example/local + mock README.
6. Verification checklist.

---

## 11. Open decisions (resolved)

| Decision | Choice |
|----------|--------|
| Approach | **B** (AI real + client always live; keep `lib/mock` files on disk) |
| Chat fail UX | Keep user message; return 503; UI error |
| Fallback config | `AI_MODEL_FALLBACKS` list; legacy `AI_MODEL_FALLBACK` still accepted |
| Billing mock | Out of scope; leave as-is |

---

## 12. Success criteria

- Creating/refining an ebook via strategist → planner → writer uses live models end-to-end.
- No successful HTTP 200 AI payload is fabricated without a model response.
- Misconfigured mock env cannot silently re-enable client mock API because the branches are removed.
- Operator can rotate models via env without code change.
