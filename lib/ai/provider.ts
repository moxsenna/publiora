// Server-only AI completion helpers.
// Supports: router (OpenAI-compatible), openai, gemini.

import { getServerEnv } from "@/lib/env";

function stripFences(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : t;
}

export async function completeText(opts: {
  system: string;
  user: string;
}): Promise<string> {
  const env = getServerEnv();

  if (env.AI_PROVIDER === "gemini" && env.GEMINI_API_KEY && !env.AI_API_KEY) {
    return completeGemini(opts, env.GEMINI_API_KEY);
  }

  // router | openai | gemini-with-AI_API_KEY → OpenAI-compatible chat completions
  const baseUrl =
    env.AI_BASE_URL ||
    (env.AI_PROVIDER === "openai"
      ? "https://api.openai.com/v1"
      : "https://9router.appvibe.web.id/v1");
  const apiKey = env.AI_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API key configured (AI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)");
  }

  const primary = env.AI_MODEL || "gcli/grok-4.5-high";
  const fallback = env.AI_MODEL_FALLBACK || "ag/gemini-pro-agent";

  try {
    return await completeOpenAICompatible(opts, {
      baseUrl,
      apiKey,
      model: primary,
    });
  } catch (primaryErr) {
    console.error("[ai] primary model failed:", primary, primaryErr);
    if (fallback && fallback !== primary) {
      console.warn("[ai] trying fallback model:", fallback);
      return await completeOpenAICompatible(opts, {
        baseUrl,
        apiKey,
        model: fallback,
      });
    }
    throw primaryErr;
  }
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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.7,
      // Some gateways ignore response_format; still request JSON in system prompt
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(
      `AI error ${res.status} model=${cfg.model}: ${errText.slice(0, 400)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`AI error: ${data.error.message}`);
  }

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`AI empty response model=${cfg.model}`);
  return text;
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
