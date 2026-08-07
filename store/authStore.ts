// Auth store — real Supabase email/password session.
// Graceful: missing/invalid env → initialized with no session.

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile, SignupOrigin, MarketingConsentSource } from "@/types/auth";
import type { PlanId } from "@/types/billing";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/supabase/errors";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (
    name: string,
    email: string,
    password: string,
    marketingEmailConsent?: boolean
  ) => Promise<Profile>;
  signOut: () => Promise<void>;
  /** Restore session from Supabase on first load. */
  initFromStorage: () => Promise<void>;
}

let authListenerBound = false;

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? "" };
}

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "creator" || value === "pro";
}

function isSignupOrigin(value: unknown): value is SignupOrigin {
  return (
    value === "unattributed" ||
    value === "landing_page" ||
    value === "claim_link" ||
    value === "direct_app" ||
    value === "legacy_unknown" ||
    value === "admin_created"
  );
}

function isConsentSource(value: unknown): value is MarketingConsentSource {
  return (
    value === "landing_signup" ||
    value === "claim_signup" ||
    value === "account_settings" ||
    value === "admin_import"
  );
}

const PROFILE_ATTRIB: Pick<Profile, "signup_origin"> = {
  signup_origin: "unattributed",
};

function mapProfileRow(row: Record<string, unknown>, fallbackEmail?: string | null): Profile {
  const planRaw = row.plan_id ?? row.plan;
  return {
    id: String(row.id),
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? fallbackEmail ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    role: row.role === "admin" ? "admin" : "user",
    plan: isPlanId(planRaw) ? planRaw : "free",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    signup_origin: isSignupOrigin(row.signup_origin)
      ? row.signup_origin
      : PROFILE_ATTRIB.signup_origin,
    initial_intent:
      row.initial_intent === "reader" || row.initial_intent === "creator"
        ? row.initial_intent
        : null,
    first_claim_link_id: (row.first_claim_link_id as string | null) ?? null,
    first_claim_ebook_id: (row.first_claim_ebook_id as string | null) ?? null,
    first_claim_creator_id: (row.first_claim_creator_id as string | null) ?? null,
    reader_activated_at: (row.reader_activated_at as string | null) ?? null,
    creator_activated_at: (row.creator_activated_at as string | null) ?? null,
    creator_subscribed_at: (row.creator_subscribed_at as string | null) ?? null,
    marketing_email_consent: Boolean(row.marketing_email_consent ?? false),
    marketing_email_consent_at: (row.marketing_email_consent_at as string | null) ?? null,
    marketing_email_consent_source: isConsentSource(row.marketing_email_consent_source)
      ? row.marketing_email_consent_source
      : null,
  };
}

function minimalProfileFromUser(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (user.email ? user.email.split("@")[0] : null);
  const now = new Date().toISOString();
  return {
    id: user.id,
    name,
    email: user.email ?? null,
    avatar_url: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    role: "user",
    plan: "free",
    created_at: now,
    updated_at: now,
    ...PROFILE_ATTRIB,
    initial_intent: null,
    first_claim_link_id: null,
    first_claim_ebook_id: null,
    first_claim_creator_id: null,
    reader_activated_at: null,
    creator_activated_at: null,
    creator_subscribed_at: null,
    marketing_email_consent: false,
    marketing_email_consent_at: null,
    marketing_email_consent_source: null,
  };
}

async function fetchProfile(user: User): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return minimalProfileFromUser(user);
  }
  return mapProfileRow(data as Record<string, unknown>, user.email);
}

async function applySession(
  set: (partial: Partial<AuthState>) => void,
  user: User | null
) {
  if (!user) {
    set({ user: null, profile: null });
    return;
  }
  const profile = await fetchProfile(user);
  set({ user: toAuthUser(user), profile });
}

/**
 * Finalize the immutable signup context after a session exists.
 * Best-effort: a missing/expired context is ignored, and a network failure
 * must not roll back an otherwise successful sign-up/sign-in.
 */
async function completeSignupContext(marketingEmailConsent: boolean): Promise<void> {
  try {
    await fetch("/api/auth/complete-signup-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ marketing_email_consent: marketingEmailConsent }),
    });
  } catch (err) {
    console.error("complete-signup-context failed", err);
  }
}

// Email-confirm signups have no session yet, so the consent checkbox is kept
// here until the first successful sign-in completes the context.
const PENDING_CONSENT_KEY = "publiora_pending_marketing_consent";

function stashPendingConsent(consent: boolean): void {
  try {
    window.localStorage.setItem(PENDING_CONSENT_KEY, consent ? "1" : "0");
  } catch {
    // storage unavailable — consent falls back to unchecked on sign-in
  }
}

function takePendingConsent(): boolean | null {
  try {
    const raw = window.localStorage.getItem(PENDING_CONSENT_KEY);
    window.localStorage.removeItem(PENDING_CONSENT_KEY);
    if (raw === null) return null;
    return raw === "1";
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (v) => set({ initialized: v }),

  signIn: async (email, password) => {
    if (!hasSupabaseEnv()) {
      throw new Error("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY.");
    }
    set({ loading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(mapAuthError(error));
      if (!data.user) throw new Error("Login gagal: user kosong");
      // A pending context from an email-confirmed signup is finalized here,
      // carrying the consent choice made at registration (if any).
      await completeSignupContext(takePendingConsent() ?? false);
      const profile = await fetchProfile(data.user);
      set({ user: toAuthUser(data.user), profile });
      return profile;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (name, email, password, marketingEmailConsent = false) => {
    if (!hasSupabaseEnv()) {
      throw new Error("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY.");
    }
    set({ loading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(mapAuthError(error));
      if (!data.user) throw new Error("Register gagal: user kosong");

      // Email confirm may leave session null — still hydrate if session present,
      // and finalize the signup context with the consent choice.
      if (data.session) {
        await completeSignupContext(marketingEmailConsent);
        const profile = await fetchProfile(data.user);
        set({ user: toAuthUser(data.user), profile });
        return profile;
      }

      const profile = minimalProfileFromUser(data.user);
      // no session yet (confirm email on) — clear auth UI state and keep the
      // context cookie alive for completion after the first login.
      stashPendingConsent(marketingEmailConsent);
      set({ user: null, profile: null });
      throw new Error(
        "Akun dibuat. Cek email untuk konfirmasi, lalu login."
      );
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      if (hasSupabaseEnv()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } finally {
      set({ user: null, profile: null });
    }
  },

  initFromStorage: async () => {
    if (get().initialized) return;

    if (!hasSupabaseEnv()) {
      set({ user: null, profile: null, initialized: true });
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applySession(set, session?.user ?? null);

      if (!authListenerBound) {
        authListenerBound = true;
        supabase.auth.onAuthStateChange(async (_event, nextSession) => {
          await applySession(set, nextSession?.user ?? null);
        });
      }
    } catch {
      set({ user: null, profile: null });
    } finally {
      set({ initialized: true });
    }
  },
}));
