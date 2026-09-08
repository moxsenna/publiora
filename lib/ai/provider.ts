// Server-only AI completion helpers.
// Supports: router (OpenAI-compatible), openai, gemini.

import { getServerEnv, resolveAiModelChain } from "@/lib/env";

/** Per-model timeout. Short so hung models (e.g. some gcli/*) fail over quickly. */
const ATTEMPT_TIMEOUT_MS = 25_000;

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

/**
 * Attempt to repair common LLM JSON formatting flaws:
 * - Trailing commas before } or ]
 * - Raw unescaped control characters inside string literals
 */
function attemptJsonRepair(jsonStr: string): string {
  let repaired = jsonStr.trim();
  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Fix unescaped control chars and newlines only inside string literals
  let inString = false;
  let escaped = false;
  let out = "";
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
      } else if (ch === "\\") {
        escaped = true;
        out += ch;
      } else if (ch === '"') {
        inString = false;
        out += ch;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else if (ch.charCodeAt(0) < 32) {
        // Drop invalid control characters
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
    }
  }

  return out;
}

/**
 * Robust regex-based fallback extractor for writer responses.
 * Recovers fields even when unescaped double quotes inside HTML attributes
 * or Indonesian quotes break standard JSON.parse.
 */
function tryExtractWriterJson<T>(raw: string): T | null {
  if (!raw.includes("content_html")) return null;

  try {
    // Title
    const titleMatch = raw.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const title = titleMatch ? titleMatch[1].replace(/\\"/g, '"') : undefined;

    // Word count
    const wcMatch = raw.match(/"word_count"\s*:\s*(\d+)/);
    const word_count = wcMatch ? parseInt(wcMatch[1], 10) : undefined;

    // Section summary
    const summaryMatch = raw.match(
      /"section_summary"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"(?:generation_meta|terms_defined)"|\s*})/
    );
    const section_summary = summaryMatch
      ? summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n")
      : undefined;

    // Extract content_html: everything between `"content_html": "` and the next recognized JSON key
    const htmlMatch = raw.match(
      /"content_html"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"(?:word_count|section_summary|generation_meta)"\s*:|\s*})/
    );
    if (!htmlMatch) return null;

    let content_html = htmlMatch[1];
    // Unescape escaped quotes and newlines
    content_html = content_html
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    // Generation meta (optional)
    let generation_meta: unknown = undefined;
    const metaMatch = raw.match(/"generation_meta"\s*:\s*({[\s\S]*?})\s*}/);
    if (metaMatch) {
      try {
        generation_meta = JSON.parse(attemptJsonRepair(metaMatch[1]));
      } catch {
        generation_meta = {
          terms_defined: [],
          examples_used: [],
          frameworks_used: [],
          claims_or_numbers: [],
          offer_mention_count: 0,
          contains_cta: false,
        };
      }
    }

    return {
      title,
      content_html,
      word_count,
      section_summary,
      generation_meta,
    } as T;
  } catch {
    return null;
  }
}

export function safeParseJson<T>(raw: string): T {
  const cleaned = stripFences(raw);

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // proceed to recovery
  }

  // 2. Extract substring enclosed by first { ... } or [ ... ]
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  let sliced = "";
  if (firstBrace >= 0 && lastBrace > firstBrace && (firstBracket < 0 || firstBrace < firstBracket)) {
    sliced = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket >= 0 && lastBracket > firstBracket) {
    sliced = cleaned.slice(firstBracket, lastBracket + 1);
  }

  if (sliced) {
    try {
      return JSON.parse(sliced) as T;
    } catch {
      // 3. Attempt repair on sliced string
      try {
        const repaired = attemptJsonRepair(sliced);
        return JSON.parse(repaired) as T;
      } catch {
        // proceed
      }
    }
  }

  // 4. Writer-specific regex extractor for unescaped HTML quotes
  const extractedWriter = tryExtractWriterJson<T>(cleaned);
  if (extractedWriter) {
    return extractedWriter;
  }

  // 5. Attempt repair on cleaned string
  try {
    const repaired = attemptJsonRepair(cleaned);
    return JSON.parse(repaired) as T;
  } catch {
    // proceed to error
  }

  throw new Error(
    "AI mengembalikan format JSON yang tidak valid atau terpotong. Silakan coba generate ulang section ini."
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
  return safeParseJson<T>(raw);
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
