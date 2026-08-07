"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { authId, isRegistrationConfirmation, mapSafeAuthError } from "@/lib/i18n/id/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const fields = [
  { name: "name", label: authId.name, type: "text", placeholder: "Nama lengkap", autoComplete: "name" },
  { name: "email", label: authId.email, type: "email", placeholder: "nama@contoh.id", autoComplete: "email" },
  { name: "password", label: authId.password, type: "password", placeholder: "Minimal 8 karakter", autoComplete: "new-password" },
] as const;

export function RegisterForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const router = useRouter(); const signUp = useAuthStore((s) => s.signUp); const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false); const [error, setError] = React.useState<string | null>(null); const [confirmation, setConfirmation] = React.useState(false);
  const [marketingConsent, setMarketingConsent] = React.useState(false);
  const messageRef = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    if (error || confirmation) messageRef.current?.focus();
  }, [error, confirmation]);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), shouldFocusError: true });
  const onSubmit = async (data: RegisterInput) => {
    if (submitting) return; setSubmitting(true); setError(null); setConfirmation(false);
    try { await signUp(data.name, data.email, data.password, marketingConsent); pushToast({ title: "Akun berhasil dibuat", variant: "success" }); router.replace(returnTo); }
    catch (err) { if (isRegistrationConfirmation(err)) setConfirmation(true); else setError(mapSafeAuthError(err, "register")); }
    finally { setSubmitting(false); }
  };
  return (
    <form method="post" action="/register" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void handleSubmit(onSubmit)(event); }} className="space-y-4" noValidate>
      {fields.map((field) => { const fieldError = errors[field.name]; const errorId = `${field.name}-error`; return <div key={field.name}>
        <Label htmlFor={field.name}>{field.label}</Label>
        <Input id={field.name} type={field.type} placeholder={field.placeholder} autoComplete={field.autoComplete} spellCheck={field.name === "email" ? false : undefined} aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? errorId : undefined} {...register(field.name)} />
        {fieldError && <p id={errorId} className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{fieldError.message}</p>}
      </div>; })}
      <label className="flex items-start gap-2.5 text-sm text-[var(--color-medium-gray)]" htmlFor="marketing-consent">
        <span className="relative mt-0.5 h-4 w-4 shrink-0">
          <input id="marketing-consent" type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0" />
          <span aria-hidden="true" className={marketingConsent ? "pointer-events-none grid h-4 w-4 place-items-center rounded border-2 border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)] text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-publiora-blue)]" : "pointer-events-none grid h-4 w-4 place-items-center rounded border-2 border-[var(--color-medium-gray)] bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-publiora-blue)]"}>{marketingConsent ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}</span>
        </span>
        <span className="min-w-0">{authId.marketingConsentLabel}</span>
      </label>
      {confirmation && <p ref={messageRef} role="status" tabIndex={-1} className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-3 text-sm text-[var(--color-deep-gray)] focus-visible:outline-2 focus-visible:outline-offset-2">{authId.confirmationRequired}</p>}
      {error && <p ref={messageRef} role="alert" tabIndex={-1} className="rounded-xl border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)] focus-visible:outline-2 focus-visible:outline-offset-2">{error}</p>}
      <Button type="submit" className="w-full min-h-11" loading={submitting} disabled={submitting}>{authId.signUp}</Button>
    </form>
  );
}