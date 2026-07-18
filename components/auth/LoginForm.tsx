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
import { Sparkles } from "lucide-react";

const DEMO_EMAIL = "mox@publiora.demo";
const DEMO_PASSWORD = "demo1234";
/** Opt-in only — never default on in live. */
const showDemoLogin = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

export function LoginForm() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
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
      pushToast({ title: "Welcome back", variant: "success" });
      router.replace("/dashboard");
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
    // Fallback path if form submit handler is not wired yet.
    const values = getValues();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      // Trigger RHF validation UI
      void handleSubmit(onSubmit)();
      return;
    }
    await doLogin(parsed.data.email, parsed.data.password);
  };

  const fillDemo = async () => {
    setValue("email", DEMO_EMAIL, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
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
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-[var(--color-danger)] mt-1">
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
        />
        {errors.password && (
          <p className="text-xs text-[var(--color-danger)] mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <Button
        type="submit"
        className="w-full"
        loading={submitting}
        onClick={onButtonClick}
      >
        Sign in
      </Button>
      {showDemoLogin && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          loading={submitting}
          onClick={fillDemo}
        >
          <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
          Masuk sebagai demo
        </Button>
      )}
      {showDemoLogin && (
        <p className="text-xs text-[var(--color-medium-gray)] text-center leading-relaxed">
          Demo credentials (butuh user di Supabase):{" "}
          <code className="text-[var(--color-medium-gray)]">{DEMO_EMAIL}</code>
        </p>
      )}
    </form>
  );
}
