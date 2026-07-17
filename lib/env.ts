import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(10).optional(),
  OPENAI_API_KEY: z.string().min(10).optional(),
  CREDITS_MOCK_TOPUP: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  USE_MOCK_API: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_USE_MOCK_API: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  // Only require AI keys when not in mock mode
  if (!parsed.data.USE_MOCK_API) {
    if (parsed.data.AI_PROVIDER === "gemini" && !parsed.data.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY required when AI_PROVIDER=gemini and USE_MOCK_API=false");
    }
    if (parsed.data.AI_PROVIDER === "openai" && !parsed.data.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY required when AI_PROVIDER=openai and USE_MOCK_API=false");
    }
    if (!parsed.data.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY required when USE_MOCK_API=false");
    }
  }
  return parsed.data;
}

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
