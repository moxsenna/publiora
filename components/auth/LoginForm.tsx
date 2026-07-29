"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { authId, mapSafeAuthError } from "@/lib/i18n/id/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, shouldFocusError: true,
  });

  const onSubmit = async (data: LoginInput) => {
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      await signIn(data.email, data.password);
      pushToast({ title: "Selamat datang kembali", variant: "success" });
      router.replace("/dashboard");
    } catch (err) {
      setError(mapSafeAuthError(err, "login"));
    } finally { setSubmitting(false); }
  };

  return (
    <form method="post" action="/login" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void handleSubmit(onSubmit)(event); }} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">{authId.email}</Label>
        <Input id="email" type="email" placeholder="nama@contoh.id" autoComplete="email" spellCheck={false} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email && <p id="email-error" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{errors.email.message}</p>}
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">{authId.password}</Label>
          <Link href="/forgot-password" className="min-h-11 inline-flex items-center text-xs font-semibold text-[var(--color-publiora-blue)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{authId.forgotPassword}</Link>
        </div>
        <Input id="password" type="password" placeholder="Masukkan kata sandi" autoComplete="current-password" aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
        {errors.password && <p id="password-error" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{errors.password.message}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" className="w-full min-h-11" loading={submitting} disabled={submitting}>{authId.signIn}</Button>
    </form>
  );
}
