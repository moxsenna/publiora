"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const doLogin = async (email: string, password: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      pushToast({ title: "Selamat datang kembali", variant: "success" });
      router.replace(returnTo);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login gagal. Coba lagi.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: LoginInput) => {
    await doLogin(data.email, data.password);
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Always stop native navigation (prevents password leaking into query string).
    e.preventDefault();
    e.stopPropagation();
    void handleSubmit(onSubmit)(e);
  };

  const onButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const values = getValues();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      // Trigger RHF validation UI
      void handleSubmit(onSubmit)();
      return;
    }
    await doLogin(parsed.data.email, parsed.data.password);
  };

  return (
    <form
      method="post"
      action="/login"
      onSubmit={onFormSubmit}
      className="space-y-3"
      noValidate
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="nama@perusahaan.com…"
          autoComplete="email"
          spellCheck={false}
          {...register("email")}
          className={errors.email ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20" : ""}
        />
        {errors.email && (
          <p className="text-xs text-[var(--color-danger)] mt-1.5 font-medium">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
          >
            Lupa password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register("password")}
          className={errors.password ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20" : ""}
        />
        {errors.password && (
          <p className="text-xs text-[var(--color-danger)] mt-1.5 font-medium">
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <p
          className="text-sm text-[var(--color-danger)] p-3 rounded-xl bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/15"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        loading={submitting}
        onClick={onButtonClick}
      >
        Masuk ke workspace
      </Button>
    </form>
  );
}
