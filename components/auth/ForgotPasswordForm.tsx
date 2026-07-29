"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { authId } from "@/lib/i18n/id/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState(""); const [sent, setSent] = React.useState(false); const [loading, setLoading] = React.useState(false); const [emailError, setEmailError] = React.useState<string | null>(null);
  const statusRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (sent) statusRef.current?.focus();
  }, [sent]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); event.stopPropagation(); if (loading) return;
    const input = event.currentTarget.elements.namedItem("email") as HTMLInputElement;
    if (!input.validity.valid) { setEmailError("Masukkan alamat email yang valid."); input.focus(); return; }
    setEmailError(null); setLoading(true);
    try {
      if (hasSupabaseEnv()) {
        const redirectTo = `${window.location.origin}/login`;
        await createClient().auth.resetPasswordForEmail(email, { redirectTo });
      }
    } catch {
      // Preserve enumeration safety for provider and transport failures.
    } finally { setSent(true); setLoading(false); }
  };
  if (sent) return <div ref={statusRef} role="status" tabIndex={-1} className="rounded-2xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] p-5 text-sm text-[var(--color-deep-gray)] focus-visible:outline-2 focus-visible:outline-offset-2">{authId.resetSuccess}</div>;
  return <form method="post" action="/forgot-password" onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
    <div><Label htmlFor="forgot-email">{authId.email}</Label><Input id="forgot-email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@contoh.id" autoComplete="email" spellCheck={false} aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "forgot-email-error" : undefined} />{emailError && <p id="forgot-email-error" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{emailError}</p>}</div>
    <Button type="submit" className="w-full min-h-11" loading={loading} disabled={loading}>{authId.resetSubmit}</Button>
  </form>;
}
