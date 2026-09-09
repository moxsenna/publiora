"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { authId, isRegistrationConfirmation, mapSafeAuthError } from "@/lib/i18n/id/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { withSignupReturnPath } from "@/lib/auth/return-path";

const fields = [
  { name: "name", label: authId.name, type: "text", placeholder: "Nama lengkap", autoComplete: "name" },
  { name: "email", label: authId.email, type: "email", placeholder: "nama@contoh.id", autoComplete: "email" },
  { name: "password", label: authId.password, type: "password", placeholder: "Minimal 8 karakter", autoComplete: "new-password" },
] as const;

export function RegisterForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");
  const [marketingConsent, setMarketingConsent] = React.useState(false);
  const messageRef = React.useRef<HTMLDivElement | HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (error || confirmation) messageRef.current?.focus();
  }, [error, confirmation]);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    shouldFocusError: true,
  });

  const onSubmit = async (data: RegisterInput) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setConfirmation(false);
    try {
      const res = await signUp(data.name, data.email, data.password, marketingConsent);
      if (res && "confirmationRequired" in res && res.confirmationRequired) {
        setSubmittedEmail(data.email);
        setConfirmation(true);
        return;
      }
      pushToast({ title: "Akun berhasil dibuat", variant: "success" });
      router.replace(returnTo);
    } catch (err) {
      if (isRegistrationConfirmation(err)) {
        setSubmittedEmail(data.email);
        setConfirmation(true);
      } else {
        setError(mapSafeAuthError(err, "register"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div
        ref={messageRef as React.RefObject<HTMLDivElement>}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        className="rounded-2xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] p-6 text-center space-y-4 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-[var(--color-publiora-black)]">
            Periksa Email Anda
          </h3>
          <p className="text-sm text-[var(--color-deep-gray)] leading-relaxed">
            Tautan konfirmasi telah dikirim ke{" "}
            <strong className="font-semibold text-[var(--color-publiora-black)]">
              {submittedEmail}
            </strong>
            . Buka email dan klik tautan untuk mengaktifkan akun Anda.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={withSignupReturnPath("/login", returnTo)}
            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-3.5 text-sm font-medium text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] transition-all duration-150 ease-out"
          >
            Kembali ke halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      method="post"
      action="/register"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit(onSubmit)(event);
      }}
      className="space-y-4"
      noValidate
    >
      {fields.map((field) => {
        const fieldError = errors[field.name];
        const errorId = `${field.name}-error`;
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              spellCheck={field.name === "email" ? false : undefined}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? errorId : undefined}
              {...register(field.name)}
            />
            {fieldError && (
              <p id={errorId} className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">
                {fieldError.message}
              </p>
            )}
          </div>
        );
      })}
      <label className="flex items-start gap-2.5 text-sm text-[var(--color-medium-gray)]" htmlFor="marketing-consent">
        <span className="relative mt-0.5 h-4 w-4 shrink-0">
          <input
            id="marketing-consent"
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={
              marketingConsent
                ? "pointer-events-none grid h-4 w-4 place-items-center rounded border-2 border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)] text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-publiora-blue)]"
                : "pointer-events-none grid h-4 w-4 place-items-center rounded border-2 border-[var(--color-medium-gray)] bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-publiora-blue)]"
            }
          >
            {marketingConsent ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
        </span>
        <span className="min-w-0">{authId.marketingConsentLabel}</span>
      </label>
      {error && (
        <p
          ref={messageRef as React.RefObject<HTMLParagraphElement>}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full min-h-11" loading={submitting} disabled={submitting}>
        {authId.signUp}
      </Button>
    </form>
  );
}