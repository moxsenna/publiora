# Live AI + Client Always Live API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every AI feature call the real 9router gateway with a multi-model fallback chain, remove agent template “fake success” paths, and force the client to always use live `/api/*` (approach B).

**Architecture:** Server agents call `completeText` / `completeJson` in `lib/ai/provider.ts`, which tries primary then ordered fallback models against an OpenAI-compatible `/chat/completions` endpoint. Agents rethrow on failure. Client hooks and claim page drop all `shouldUseMock` branches. `lib/mock/*` stays on disk but has zero runtime imports from app/components/lib/api.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Zod env (`lib/env.ts`), Supabase server routes, fetch to OpenAI-compatible router.

**Spec:** `docs/superpowers/specs/2026-07-19-live-ai-no-mock-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/env.ts` | Parse `AI_MODEL_FALLBACKS`, default mock flags `false` |
| `lib/ai/provider.ts` | Multi-model chain, 60s timeout, throw if all fail |
| `lib/ai/agents/*.ts` | Call provider; throw; no template fallbacks |
| `lib/ai/agents/meta.ts` | `AGENT_LABELS` / `AGENT_COLORS` for UI |
| `app/api/.../enhance/route.ts` | Fail + refund; no silent keep-after-charge |
| `lib/api/hooks.ts` | Live `apiFetch` only |
| `app/claim/[token]/page.tsx` | Live claim preview only |
| `lib/api/client.ts` | Drop obsolete mock production guard |
| `.env.example`, `.env.local` | Live defaults + fallbacks list |
| `lib/mock/README.md` | Do not import from app runtime |
| `__tests__/ai/provider.fallback.test.ts` | Unit tests for model list + fetch fallback |

---

### Task 1: Env — fallbacks list + live defaults

**Files:**
- Modify: `lib/env.ts`
- Modify: `.env.example`
- Modify: `.env.local` (local only; do not commit secrets if policy forbids — file already tracked/untracked per repo; update keys already present)

- [ ] **Step 1: Update `lib/env.ts` schema**

Replace the AI-related fields and mock defaults so the object looks like this (keep Supabase fields and `superRefine` as today):

```typescript
import { z } from "zod";

const serverSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

    /** gemini | openai | router (OpenAI-compatible gateway) */
    AI_PROVIDER: z.enum(["gemini", "openai", "router"]).default("router"),
    /** Primary model id for router, e.g. gcli/grok-4.5-high */
    AI_MODEL: z.string().min(1).default("gcli/grok-4.5-high"),
    /** Legacy single fallback (merged into FALLBACKS if present) */
    AI_MODEL_FALLBACK: z.string().min(1).optional(),
    /**
     * Comma-separated ordered fallbacks after AI_MODEL.
     * Default chain matches product router inventory.
     */
    AI_MODEL_FALLBACKS: z
      .string()
      .default(
        "ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol"
      ),
    /** OpenAI-compatible base URL ending with /v1 */
    AI_BASE_URL: z.string().url().optional(),
    /** API key for router / openai-compatible endpoint */
    AI_API_KEY: z.string().min(10).optional(),

    GEMINI_API_KEY: z.string().min(10).optional(),
    OPENAI_API_KEY: z.string().min(10).optional(),

    CREDITS_MOCK_TOPUP: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    USE_MOCK_API: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    NEXT_PUBLIC_USE_MOCK_API: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((val, ctx) => {
    if (
      !val.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !val.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

/** Ordered unique model list: primary, then FALLBACKS, then legacy FALLBACK. */
export function resolveAiModelChain(env: {
  AI_MODEL: string;
  AI_MODEL_FALLBACK?: string;
  AI_MODEL_FALLBACKS?: string;
}): string[] {
  const primary = env.AI_MODEL.trim();
  const fromList = (env.AI_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacy = env.AI_MODEL_FALLBACK?.trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of [primary, ...fromList, ...(legacy ? [legacy] : [])]) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  const data = parsed.data;

  if (!process.env.AI_BASE_URL && data.AI_PROVIDER === "router") {
    (data as { AI_BASE_URL?: string }).AI_BASE_URL =
      "https://9router.appvibe.web.id/v1";
  }

  if (!data.USE_MOCK_API) {
    if (data.AI_PROVIDER === "router") {
      if (!data.AI_API_KEY && !data.OPENAI_API_KEY) {
        throw new Error(
          "AI_API_KEY (or OPENAI_API_KEY) required when AI_PROVIDER=router and USE_MOCK_API=false"
        );
      }
    }
    if (
      data.AI_PROVIDER === "gemini" &&
      !data.GEMINI_API_KEY &&
      !data.AI_API_KEY
    ) {
      throw new Error(
        "GEMINI_API_KEY required when AI_PROVIDER=gemini and USE_MOCK_API=false"
      );
    }
    if (
      data.AI_PROVIDER === "openai" &&
      !data.OPENAI_API_KEY &&
      !data.AI_API_KEY
    ) {
      throw new Error(
        "OPENAI_API_KEY required when AI_PROVIDER=openai and USE_MOCK_API=false"
      );
    }
    if (!data.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY required when USE_MOCK_API=false"
      );
    }
  }
  return data;
}

export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return {
    supabaseUrl: url,
    supabaseAnonKey: key,
  };
}
```

- [ ] **Step 2: Update `.env.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI: router | openai | gemini
AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_API_KEY=
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
# Optional legacy single fallback (merged if not already in FALLBACKS)
# AI_MODEL_FALLBACK=

# Legacy direct providers (optional)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Billing: true = instant mock top-up; false = PayCore when configured
CREDITS_MOCK_TOPUP=false
# Client + server must use live API (mock branches removed from client)
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_LOGIN=false

# PayCore (AppVibe payment hub) — required when CREDITS_MOCK_TOPUP=false
PAYCORE_BASE_URL=https://pay-staging.appvibe.biz.id
PAYCORE_APP_ID=publiora
PAYCORE_KEY_ID=pk_staging_publiora_01
PAYCORE_APP_SECRET=
PAYCORE_WEBHOOK_SECRET=
PAYCORE_RETURN_URL=http://127.0.0.1:3005/billing/return
PAYCORE_MERCHANT_PROFILE_ID=appvibe_duitku_v2
PAYCORE_DEFAULT_PAYMENT_METHOD=BR
```

- [ ] **Step 3: Update `.env.local` AI block** (keep existing secrets)

Ensure these lines exist (do not change the API key value already present):

```env
AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_API_KEY=sk-3491eb8cf392ad19-iw6ksj-ed118ea4
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
```

Remove obsolete single-only `AI_MODEL_FALLBACK=...` or leave it; chain resolver dedupes.

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts .env.example
git commit -m "feat(env): live defaults and AI_MODEL_FALLBACKS chain"
```

Do **not** commit `.env.local` if it contains secrets and is gitignored. If it is tracked in this repo, include only if team already commits it (check `.gitignore`). Prefer not committing secrets.

---

### Task 2: Provider multi-model chain + unit tests

**Files:**
- Create: `__tests__/ai/provider.fallback.test.ts`
- Modify: `lib/ai/provider.ts`

- [ ] **Step 1: Write failing tests for model chain + fetch fallback**

Create `__tests__/ai/provider.fallback.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAiModelChain } from "@/lib/env";

describe("resolveAiModelChain", () => {
  it("orders primary then fallbacks and dedupes", () => {
    const chain = resolveAiModelChain({
      AI_MODEL: "gcli/grok-4.5-high",
      AI_MODEL_FALLBACKS:
        "ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol",
      AI_MODEL_FALLBACK: "ag/gemini-pro-agent",
    });
    expect(chain).toEqual([
      "gcli/grok-4.5-high",
      "ag/gemini-pro-agent",
      "ag/gemini-3.1-pro-low",
      "cx/gpt-5.6-terra",
      "cx/gpt-5.6-sol",
    ]);
  });

  it("includes legacy fallback when not in list", () => {
    const chain = resolveAiModelChain({
      AI_MODEL: "a",
      AI_MODEL_FALLBACKS: "b",
      AI_MODEL_FALLBACK: "c",
    });
    expect(chain).toEqual(["a", "b", "c"]);
  });
});

describe("completeText model fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tries next model when primary returns non-2xx", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "x".repeat(40);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "y".repeat(40);
    process.env.AI_PROVIDER = "router";
    process.env.AI_BASE_URL = "https://router.test/v1";
    process.env.AI_API_KEY = "sk-test-key-1234567890";
    process.env.AI_MODEL = "model-primary";
    process.env.AI_MODEL_FALLBACKS = "model-fallback";
    process.env.USE_MOCK_API = "false";
    process.env.NEXT_PUBLIC_USE_MOCK_API = "false";

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (body.model === "model-primary") {
        return new Response(JSON.stringify({ error: { message: "busy" } }), {
          status: 503,
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello from fallback" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    // Dynamic import after env set so getServerEnv sees process.env
    const { completeText } = await import("@/lib/ai/provider");
    const text = await completeText({
      system: "sys",
      user: "user",
    });
    expect(text).toBe("hello from fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when all models fail", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "x".repeat(40);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "y".repeat(40);
    process.env.AI_PROVIDER = "router";
    process.env.AI_BASE_URL = "https://router.test/v1";
    process.env.AI_API_KEY = "sk-test-key-1234567890";
    process.env.AI_MODEL = "model-primary";
    process.env.AI_MODEL_FALLBACKS = "model-fallback";
    process.env.USE_MOCK_API = "false";
    process.env.NEXT_PUBLIC_USE_MOCK_API = "false";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );

    vi.resetModules();
    const { completeText } = await import("@/lib/ai/provider");
    await expect(
      completeText({ system: "sys", user: "user" })
    ).rejects.toThrow(/AI error|all models|500/i);
  });
});
```

Note: if `getServerEnv` is cached or module already loaded, use `vi.resetModules()` before each `import("@/lib/ai/provider")` in both tests. Prefer `vi.resetModules()` at the start of each completeText test.

- [ ] **Step 2: Run tests — expect fail until provider updated**

```bash
npm test -- __tests__/ai/provider.fallback.test.ts
```

Expected: `resolveAiModelChain` may pass after Task 1; `completeText` tests fail (still single fallback or wrong behavior).

- [ ] **Step 3: Rewrite `lib/ai/provider.ts`**

Full file:

```typescript
// Server-only AI completion helpers.
// Supports: router (OpenAI-compatible), openai, gemini.

import { getServerEnv, resolveAiModelChain } from "@/lib/env";

const ATTEMPT_TIMEOUT_MS = 60_000;

function stripFences(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : t;
}

/** Parse OpenAI JSON or SSE stream body into assistant text. */
function extractAssistantText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as {
        choices?: {
          message?: { content?: string | null };
          delta?: { content?: string };
        }[];
        error?: { message?: string };
      };
      if (data.error?.message) throw new Error(data.error.message);
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      if (e instanceof Error && e.message && !e.message.includes("JSON")) throw e;
    }
  }

  if (trimmed.includes("data:")) {
    let acc = "";
    for (const line of trimmed.split(/\r?\n/)) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const payload = s.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: {
            delta?: { content?: string | null };
            message?: { content?: string | null };
          }[];
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        const msg = chunk.choices?.[0]?.message?.content;
        if (delta) acc += delta;
        else if (msg) acc = msg;
      } catch {
        // skip bad chunk
      }
    }
    return acc;
  }

  return trimmed;
}

export async function completeText(opts: {
  system: string;
  user: string;
}): Promise<string> {
  const env = getServerEnv();

  if (env.AI_PROVIDER === "gemini" && env.GEMINI_API_KEY && !env.AI_API_KEY) {
    return completeGemini(opts, env.GEMINI_API_KEY);
  }

  const baseUrl =
    env.AI_BASE_URL ||
    (env.AI_PROVIDER === "openai"
      ? "https://api.openai.com/v1"
      : "https://9router.appvibe.web.id/v1");
  const apiKey = env.AI_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No AI API key configured (AI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)"
    );
  }

  const models = resolveAiModelChain(env);
  const errors: string[] = [];

  for (const model of models) {
    try {
      return await completeOpenAICompatible(opts, {
        baseUrl,
        apiKey,
        model,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ai] model failed:", model, msg);
      errors.push(`${model}: ${msg}`);
    }
  }

  throw new Error(
    `AI all models failed (${models.join(" → ")}): ${errors.join(" | ")}`
  );
}

export async function completeJson<T>(opts: {
  system: string;
  user: string;
}): Promise<T> {
  const raw = await completeText({
    system: opts.system + "\n\nRespond with valid JSON only. No markdown.",
    user: opts.user,
  });
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("AI returned invalid JSON");
  }
}

async function completeOpenAICompatible(
  opts: { system: string; user: string },
  cfg: { baseUrl: string; apiKey: string; model: string }
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.7,
        stream: false,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(
        `AI error ${res.status} model=${cfg.model}: ${raw.slice(0, 400)}`
      );
    }

    const text = extractAssistantText(raw);
    if (!text) {
      throw new Error(`AI empty response model=${cfg.model}`);
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `AI timeout ${ATTEMPT_TIMEOUT_MS}ms model=${cfg.model}`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function completeGemini(
  opts: { system: string; user: string },
  apiKey: string
): Promise<string> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!text) throw new Error("Gemini empty response");
  return text;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- __tests__/ai/provider.fallback.test.ts
```

Expected: all PASS. If module cache causes flake, ensure both tests call `vi.resetModules()` before import.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/provider.ts __tests__/ai/provider.fallback.test.ts
git commit -m "feat(ai): multi-model fallback chain with timeout"
```

---

### Task 3: Agents — remove template fallbacks, throw

**Files:**
- Modify: `lib/ai/agents/strategist.ts`
- Modify: `lib/ai/agents/planner.ts`
- Modify: `lib/ai/agents/writer.ts`
- Modify: `lib/ai/agents/title.ts`
- Modify: `lib/ai/agents/cta.ts`

- [ ] **Step 1: Rewrite `strategist.ts`**

```typescript
import { completeJson } from "@/lib/ai/provider";
import { STRATEGIST_SYSTEM } from "@/lib/ai/prompts";

export type StrategistInput = {
  project: {
    title: string;
    description: string;
    audience: string;
    tone: string;
    niche: string;
  };
  history: { role: string; content: string }[];
  userMessage: string;
};

export type StrategistResult = {
  assistant_message: string;
  state_patch?: Record<string, unknown>;
  readiness_score?: number;
};

export async function runStrategist(
  input: StrategistInput
): Promise<StrategistResult> {
  const historyText = input.history
    .slice(-12)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const user = `Project:
title: ${input.project.title}
description: ${input.project.description}
audience: ${input.project.audience}
tone: ${input.project.tone}
niche: ${input.project.niche}

Recent conversation:
${historyText || "(none)"}

Latest user message:
${input.userMessage}`;

  const result = await completeJson<StrategistResult>({
    system: STRATEGIST_SYSTEM,
    user,
  });
  if (!result.assistant_message?.trim()) {
    throw new Error("Strategist returned empty assistant_message");
  }
  return result;
}
```

- [ ] **Step 2: Rewrite `planner.ts`**

```typescript
import { completeJson } from "@/lib/ai/provider";
import { PLANNER_SYSTEM } from "@/lib/ai/prompts";
import type { OutlineSection } from "@/types/outline";

export type PlannerProject = {
  title: string;
  description: string;
  audience: string;
  tone: string;
  niche: string;
};

export type PlannerResult = {
  title: string;
  description: string;
  sections: OutlineSection[];
};

function rid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function runPlanner(project: PlannerProject): Promise<PlannerResult> {
  const user = `Build outline for:
title: ${project.title}
description: ${project.description}
audience: ${project.audience}
tone: ${project.tone}
niche: ${project.niche}

Return 5-7 sections.`;
  const result = await completeJson<PlannerResult>({
    system: PLANNER_SYSTEM,
    user,
  });
  if (!result.sections?.length) {
    throw new Error("Planner returned no sections");
  }
  const sections = result.sections.slice(0, 10).map((s, i) => ({
    id: s.id || `sec_${i + 1}_${rid()}`,
    position: i + 1,
    title: s.title || `Section ${i + 1}`,
    summary: s.summary || "",
    key_points: Array.isArray(s.key_points) ? s.key_points.slice(0, 6) : [],
    estimated_words: s.estimated_words || 700,
    status: "pending" as const,
  }));
  return {
    title: result.title || project.title,
    description: result.description || "",
    sections,
  };
}
```

- [ ] **Step 3: Rewrite `writer.ts`**

```typescript
import { completeJson } from "@/lib/ai/provider";
import { WRITER_SYSTEM } from "@/lib/ai/prompts";

export type WriterInput = {
  project: { title: string; audience: string; tone: string; niche: string };
  section: {
    title: string;
    summary: string;
    key_points: string[];
  };
};

export type WriterResult = {
  title: string;
  content_html: string;
  word_count: number;
};

export async function runWriter(input: WriterInput): Promise<WriterResult> {
  const user = `Project: ${input.project.title}
audience: ${input.project.audience}
tone: ${input.project.tone}
niche: ${input.project.niche}

Write this section only:
title: ${input.section.title}
summary: ${input.section.summary}
key_points: ${JSON.stringify(input.section.key_points)}`;
  const result = await completeJson<WriterResult>({
    system: WRITER_SYSTEM,
    user,
  });
  if (!result.content_html?.trim()) {
    throw new Error("Writer returned empty content_html");
  }
  const word_count =
    result.word_count ||
    result.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean)
      .length;
  return {
    title: result.title || input.section.title,
    content_html: result.content_html,
    word_count,
  };
}
```

- [ ] **Step 4: Rewrite `title.ts`**

```typescript
import { completeJson } from "@/lib/ai/provider";
import { TITLE_SYSTEM } from "@/lib/ai/prompts";

export async function runTitleGenerator(project: {
  title: string;
  description: string;
  audience: string;
}): Promise<string[]> {
  const result = await completeJson<{ titles: string[] }>({
    system: TITLE_SYSTEM,
    user: `Current title: ${project.title}\nAudience: ${project.audience}\nBrief: ${project.description}`,
  });
  if (!result.titles?.length) {
    throw new Error("Title generator returned no titles");
  }
  return result.titles.slice(0, 8);
}
```

- [ ] **Step 5: Rewrite `cta.ts`**

```typescript
import { completeJson } from "@/lib/ai/provider";
import { CTA_SYSTEM } from "@/lib/ai/prompts";

export async function runCtaGenerator(project: {
  title: string;
  audience: string;
}): Promise<string[]> {
  const result = await completeJson<{ ctas: string[] }>({
    system: CTA_SYSTEM,
    user: `Ebook: ${project.title}\nAudience: ${project.audience}`,
  });
  if (!result.ctas?.length) {
    throw new Error("CTA generator returned no ctas");
  }
  return result.ctas.slice(0, 8);
}
```

- [ ] **Step 6: Grep for leftover fake fallbacks**

```bash
rg -n "function fallback|Saya baca brief|Ambil salinan gratis|The \$\{|Ringkas:" lib/ai/agents
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add lib/ai/agents/strategist.ts lib/ai/agents/planner.ts lib/ai/agents/writer.ts lib/ai/agents/title.ts lib/ai/agents/cta.ts
git commit -m "fix(ai): remove agent template fallbacks; throw on failure"
```

---

### Task 4: Enhance route — no silent success after charge

**Files:**
- Modify: `app/api/projects/[id]/sections/[sectionId]/enhance/route.ts`

- [ ] **Step 1: Replace AI try/catch block**

In the route, replace the block that currently does:

```typescript
    let content_html = String(section.content_html ?? "");
    try {
      const result = await completeJson<{ content_html: string }>({
        system:
          "You polish marketing ebook HTML. Keep structure, improve clarity, keep language. Return JSON { content_html } only. No script tags.",
        user: `Polish this HTML:\n${content_html.slice(0, 12000)}`,
      });
      if (result.content_html) content_html = result.content_html;
    } catch {
      // fallback: keep original
    }
```

with:

```typescript
    const original = String(section.content_html ?? "");
    const result = await completeJson<{ content_html: string }>({
      system:
        "You polish marketing ebook HTML. Keep structure, improve clarity, keep language. Return JSON { content_html } only. No script tags.",
      user: `Polish this HTML:\n${original.slice(0, 12000)}`,
    });
    if (!result.content_html?.trim()) {
      throw new Error("Enhancement returned empty content_html");
    }
    let content_html = result.content_html;
```

Keep the outer `try/catch` that refunds on failure (already present after charge). Do not catch AI errors inside the charged block without rethrowing.

- [ ] **Step 2: Commit**

```bash
git add "app/api/projects/[id]/sections/[sectionId]/enhance/route.ts"
git commit -m "fix(ai): enhance fails and refunds instead of silent keep"
```

---

### Task 5: Agent UI meta + ChatPanel import

**Files:**
- Create: `lib/ai/agents/meta.ts`
- Modify: `components/workspace/ChatPanel.tsx`
- Optional keep: `lib/mock/ai.ts` (leave mock helpers; labels can remain duplicated or re-export — prefer UI only uses meta)

- [ ] **Step 1: Create `lib/ai/agents/meta.ts`**

```typescript
import type { AgentName } from "@/types/message";

export const AGENT_LABELS: Record<AgentName, string> = {
  strategist: "Strategist",
  planner: "Planner",
  writer: "Writer",
  enhancement: "Enhancement",
  title: "Title",
  cta: "CTA",
};

export const AGENT_COLORS: Record<AgentName, string> = {
  strategist: "#0A0A0A",
  planner: "#2563EB",
  writer: "#059669",
  enhancement: "#C8A24B",
  title: "#7C3AED",
  cta: "#DC2626",
};
```

- [ ] **Step 2: Update ChatPanel import**

Change:

```typescript
import { AGENT_LABELS, AGENT_COLORS } from "@/lib/mock/ai";
```

to:

```typescript
import { AGENT_LABELS, AGENT_COLORS } from "@/lib/ai/agents/meta";
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai/agents/meta.ts components/workspace/ChatPanel.tsx
git commit -m "refactor(ai): move agent labels out of mock module"
```

---

### Task 6: Client hooks live-only

**Files:**
- Modify: `lib/api/hooks.ts` (full file rewrite of import + every branch)

- [ ] **Step 1: Remove mock import and helper**

At top of `lib/api/hooks.ts`:

- Delete: `import * as api from "@/lib/mock/api";`
- Delete: `function shouldUseMock() { ... }`
- Keep: `apiFetch`, types, `CREDIT_COSTS`, `READER_ID`, query keys

- [ ] **Step 2: Replace every hook body with live-only path**

Pattern for queries:

```typescript
export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => apiFetch<Project[]>("/api/projects"),
  });
}
```

Pattern for mutations:

```typescript
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}
```

Apply to **all** hooks currently using `shouldUseMock()`, including:

- projects CRUD
- outline / generate / update / approve
- sections / generate / generate all / update
- messages / sendMessage
- published / publish
- claim links / resolve claim
- library / reading progress
- exports
- billing (balance, txns, plans, packs, subscription, costs, change plan, purchase pack)
- templates
- titles / ctas / enhance

**`useEnhanceSection` live-only:**

```typescript
export function useEnhanceSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      sectionId,
    }: {
      projectId: string;
      sectionId: string;
    }) =>
      apiFetch<Section>(
        `/api/projects/${projectId}/sections/${sectionId}/enhance`,
        { method: "POST" }
      ),
    onSuccess: (data) => {
      if (data?.project_id) {
        qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
      }
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}
```

**`useResolveClaim` live-only:**

```typescript
export function useResolveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
    }: {
      token: string;
      reader_id?: string;
    }): Promise<ResolveClaimResult> => {
      return apiFetch<ResolveClaimResult>(`/api/claim/${token}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["reading-progress"] });
    },
  });
}
```

Keep `onSuccess` / `onError` behavior identical otherwise. Keep `isPaymentCheckout` helpers.

- [ ] **Step 3: Verify no mock references in hooks**

```bash
rg -n "shouldUseMock|lib/mock" lib/api/hooks.ts
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add lib/api/hooks.ts
git commit -m "feat(api): client hooks always use live /api"
```

---

### Task 7: Claim page live-only + client guard cleanup

**Files:**
- Modify: `app/claim/[token]/page.tsx`
- Modify: `lib/api/client.ts`

- [ ] **Step 1: Rewrite claim page query**

```tsx
"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClaimPage } from "@/components/claim/ClaimPage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PublishedEbook } from "@/types";
import { apiFetch } from "@/lib/api/client";

type ClaimPreview =
  | { status: "ready"; ebook: PublishedEbook; token: string }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "limit_reached" }
  | { status: "not_found" };

export default function ClaimRoutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-preview", token],
    queryFn: () =>
      apiFetch<ClaimPreview>(`/api/claim/${encodeURIComponent(token)}`),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-full grid place-items-center px-6">
        <Skeleton className="h-80 w-full max-w-md" />
      </div>
    );
  }

  return <ClaimPage token={token} preview={data} />;
}
```

- [ ] **Step 2: Simplify `lib/api/client.ts`**

```typescript
import { ApiError } from "./errors";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? res.statusText,
      body?.error?.code,
      res.status
    );
  }
  return body as T;
}
```

- [ ] **Step 3: Runtime import audit**

```bash
rg -n "from [\"']@/lib/mock|from [\"'].*lib/mock|shouldUseMock" app components lib/api
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add "app/claim/[token]/page.tsx" lib/api/client.ts
git commit -m "feat(api): claim page and client live-only; drop mock guard"
```

---

### Task 8: Mock README + deploy env examples

**Files:**
- Create: `lib/mock/README.md`
- Modify if present: `deploy/env.production.example` (already false — confirm)
- Modify if present: `Dockerfile` / `docker-compose.yml` defaults already false — confirm only

- [ ] **Step 1: Write `lib/mock/README.md`**

```markdown
# lib/mock (legacy / offline)

This tree is **not used by the live app runtime**.

- Client hooks always call `/api/*` via `apiFetch`.
- AI agents call `lib/ai/provider` (router), not `lib/mock/ai`.
- Do **not** import these modules from `app/`, `components/`, or `lib/api/`.

Kept on disk for historical reference and possible isolated tests only.
Approach C (full purge) may delete this directory later.
```

- [ ] **Step 2: Confirm deploy examples**

`deploy/env.production.example` should contain:

```env
NEXT_PUBLIC_USE_MOCK_API=false
USE_MOCK_API=false
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
```

Add `AI_MODEL_FALLBACKS` line if missing. Do not invent other secrets.

- [ ] **Step 3: Commit**

```bash
git add lib/mock/README.md deploy/env.production.example
git commit -m "docs: mark lib/mock unused; document AI fallbacks in deploy env"
```

---

### Task 9: Verification (definition of done)

- [ ] **Step 1: Unit tests**

```bash
npm test
```

Expected: all pass (including new provider tests).

- [ ] **Step 2: Import audit**

```bash
rg -n "from [\"']@/lib/mock|shouldUseMock" app components lib/api lib/ai
```

Expected: no hits (except possibly comments none).

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0. Fix any broken imports from removed mock usage.

- [ ] **Step 4: Manual smoke (dev server + real env)**

```bash
npm run dev
```

With valid session and credits:

1. Open project workspace → send strategist chat → reply is **not** the old fixed “Saya baca brief… Usulan pillar…” template (content varies with model).
2. Generate outline → sections reflect brief; if you temporarily set `AI_API_KEY=invalid`, expect error UI / 503 and **no** 5-section template saved.
3. After outline approve → generate one section → real HTML prose, not the short template with fixed blockquote about “pintu keluar”.
4. Titles / CTAs → arrays from model; failure surfaces error.
5. Enhance section with bad key → error + credit refund behavior; body not claimed polished if failed.
6. Claim page `/claim/{token}` → loads via `/api/claim/...` only.

- [ ] **Step 5: Final commit if verification fixes needed**

```bash
git add -A
git status
# commit only intentional verification fixes
git commit -m "fix: live AI verification follow-ups"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Multi-model chain (5 models) | Task 1–2 |
| Agents throw / no template success | Task 3 |
| Enhance fail + refund | Task 4 |
| Labels out of mock | Task 5 |
| Hooks live-only | Task 6 |
| Claim live-only | Task 7 |
| client mock guard removed | Task 7 |
| Env defaults false + fallbacks | Task 1, 8 |
| lib/mock README / zero runtime import | Task 5–8 |
| Timeout 60s | Task 2 |
| Verification checklist | Task 9 |
| Billing/PayCore untouched | — (no task edits paycore) |
| No full mock delete (not C) | — (mock kept) |

---

## Self-review notes (plan author)

- No TBD/TODO placeholders in steps.
- `resolveAiModelChain` defined in Task 1 and used in Task 2 tests/provider — same name.
- Chat route already returns 503 on throw after agent change; no route edit required unless error code polish desired (YAGNI).
- Outline/section refund already on throw — agents throwing is sufficient.
- Tests use `vi.resetModules()` guidance for env-sensitive imports.
