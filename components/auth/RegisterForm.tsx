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

export function RegisterForm() {
  const router = useRouter(); const signUp = useAuthStore((s) => s.signUp); const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false); const [error, setError] = React.useState<string | null>(null); const [confirmation, setConfirmation] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), shouldFocusError: true });
  const onSubmit = async (data: RegisterInput) => {
    if (submitting) return; setSubmitting(true); setError(null); setConfirmation(false);
    try { await signUp(data.name, data.email, data.password); pushToast({ title: "Akun berhasil dibuat", variant: "success" }); router.replace("/dashboard"); }
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
      {confirmation && <p role="status" className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-3 text-sm text-[var(--color-deep-gray)]">{authId.confirmationRequired}</p>}
      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" className="w-full min-h-11" loading={submitting} disabled={submitting}>{authId.signUp}</Button>
    </form>
  );
}
