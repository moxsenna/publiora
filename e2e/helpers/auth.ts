import type { Page, BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  createChunks,
  stringToBase64URL,
  DEFAULT_COOKIE_OPTIONS,
} from "@supabase/ssr";

export type E2ESession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: unknown;
};

export function requireE2ECreds(): {
  email: string;
  password: string;
  projectId?: string;
} {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
  }
  return {
    email,
    password,
    projectId: process.env.E2E_PROJECT_ID,
  };
}

export function getSupabasePublicEnv(): {
  url: string;
  key: string;
  projectRef: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and ANON/PUBLISHABLE key required for e2e auth",
    );
  }
  const projectRef = new URL(url).host.split(".")[0];
  return { url, key, projectRef };
}

/** Sign in via Supabase API (not the UI form). */
export async function fetchE2ESession(): Promise<{
  session: E2ESession;
  projectRef: string;
  storageKey: string;
}> {
  const { email, password } = requireE2ECreds();
  const { url, key, projectRef } = getSupabasePublicEnv();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`E2E signIn failed: ${error?.message ?? "no session"}`);
  }
  const session: E2ESession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type ?? "bearer",
    user: data.session.user,
  };
  return {
    session,
    projectRef,
    storageKey: `sb-${projectRef}-auth-token`,
  };
}

/**
 * Inject session the way @supabase/ssr createBrowserClient persists it:
 * chunked cookies, base64url-encoded JSON (`base64-...`).
 */
export async function injectSupabaseSessionCookies(
  context: BrowserContext,
  session: E2ESession,
  storageKey: string,
  baseURL: string,
): Promise<void> {
  const url = new URL(baseURL);
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const chunks = createChunks(storageKey, encoded);
  const expires = Math.floor(Date.now() / 1000) + (DEFAULT_COOKIE_OPTIONS.maxAge ?? 60 * 60 * 24 * 400);

  await context.addCookies(
    chunks.map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain: url.hostname,
      path: DEFAULT_COOKIE_OPTIONS.path ?? "/",
      sameSite: "Lax",
      httpOnly: false,
      secure: url.protocol === "https:",
      expires,
    })),
  );
}

export async function loginWithStorage(page: Page): Promise<{
  projectId?: string;
}> {
  const { session, storageKey } = await fetchE2ESession();
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3005";
  await injectSupabaseSessionCookies(page.context(), session, storageKey, baseURL);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  // Authenticated AppShell should not bounce to login
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
  // Wait until loading spinner is gone / main shell present
  await page
    .getByText("Memuat…")
    .waitFor({ state: "hidden", timeout: 20_000 })
    .catch(() => undefined);
  return { projectId: process.env.E2E_PROJECT_ID };
}

export async function openWorkspace(
  page: Page,
  projectId?: string,
): Promise<string> {
  let id = projectId || process.env.E2E_PROJECT_ID;
  if (id) {
    await page.goto(`/projects/${id}`);
  } else {
    await page.goto("/projects");
    const first = page.locator('a[href^="/projects/"]').first();
    await first.waitFor({ state: "visible", timeout: 15_000 });
    const href = await first.getAttribute("href");
    if (!href) throw new Error("No project link found");
    id = href.split("/").filter(Boolean).pop()!;
    await page.goto(`/projects/${id}`);
  }
  await page.waitForURL(/\/projects\/[^/]+/, { timeout: 15_000 });
  // Workspace step nav is the signal the feature shell loaded
  await page
    .getByRole("navigation", { name: "Workflow stages" })
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  return id!;
}
