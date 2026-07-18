import { z } from "zod";

/** Empty / whitespace env vars → undefined so .optional() works. */
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalNonEmpty = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);

const optionalKey20 = z.preprocess(
  emptyToUndefined,
  z.string().min(20).optional()
);

const optionalKey10 = z.preprocess(
  emptyToUndefined,
  z.string().min(10).optional()
);

const serverSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    // Empty string in .env is common when only PUBLISHABLE_KEY is set
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalKey20,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalKey20,
    SUPABASE_SERVICE_ROLE_KEY: optionalKey20,

    /** gemini | openai | router (OpenAI-compatible gateway) */
    AI_PROVIDER: z.enum(["gemini", "openai", "router"]).default("router"),
    /** Primary model id for router, e.g. gcli/grok-4.5-high */
    AI_MODEL: z.string().min(1).default("gcli/grok-4.5-high"),
    /** Legacy single fallback (merged into FALLBACKS if present) */
    AI_MODEL_FALLBACK: optionalNonEmpty,
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
    AI_BASE_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().optional()
    ),
    /** API key for router / openai-compatible endpoint */
    AI_API_KEY: optionalKey10,

    GEMINI_API_KEY: optionalKey10,
    OPENAI_API_KEY: optionalKey10,

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
