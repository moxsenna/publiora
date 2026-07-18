import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/** Never return empty / literal "null" — Duitku emails show "Hi null" otherwise. */
export function sanitizeCustomerName(raw: unknown, email?: string | null): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined") {
    return s.slice(0, 50);
  }
  const fromEmail = email?.split("@")[0]?.trim();
  if (fromEmail && fromEmail.toLowerCase() !== "null") {
    return fromEmail.slice(0, 50);
  }
  return "Publiora User";
}

export async function resolveCheckoutCustomer(user: User): Promise<{
  email: string;
  name: string;
}> {
  const email = user.email?.trim() || `${user.id}@users.publiora.local`;
  const meta = user.user_metadata ?? {};
  let name = sanitizeCustomerName(
    meta.name ?? meta.full_name ?? meta.display_name,
    email
  );

  // Prefer profiles.name when auth metadata empty
  if (name === "Publiora User" || name === email.split("@")[0]) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.name) {
        name = sanitizeCustomerName(data.name, email);
      }
    } catch {
      /* keep fallback */
    }
  }

  return { email, name };
}
