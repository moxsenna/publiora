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
    delete process.env.AI_MODEL_FALLBACK;

    vi.resetModules();

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
    delete process.env.AI_MODEL_FALLBACK;

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
