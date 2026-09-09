"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { authId } from "@/lib/i18n/id/auth";
import { mapAuthError } from "@/lib/supabase/errors";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { useUiStore } from "@/store/projectStore";

export function ResetPasswordForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);

  const [checkingSession, setCheckingSession] = React.useState(true);
  const [hasValidSession, setHasValidSession] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        if (!hasSupabaseEnv()) {
          if (mounted) {
            setHasValidSession(false);
            setCheckingSession(false);
          }
          return;
        }

        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (mounted) {
          if (sessionError || !data?.session) {
            setHasValidSession(false);
          } else {
            setHasValidSession(true);
          }
          setCheckingSession(false);
        }
      } catch {
        if (mounted) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    shouldFocusError: true,
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (!hasSupabaseEnv()) {
        throw new Error("Supabase belum dikonfigurasi.");
      }

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      pushToast({
        title: authId.resetPasswordSuccess,
        variant: "success",
      });
      router.replace(returnTo);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingDots />
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] p-6 text-center space-y-4"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm text-[var(--color-deep-gray)] leading-relaxed">
            {authId.resetTokenInvalid}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-3.5 text-sm font-medium text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] transition-all duration-150 ease-out"
          >
            {authId.backToForgot}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit(onSubmit)(event);
      }}
      className="space-y-4"
      noValidate
    >
      <div>
        <Label htmlFor="password">Kata sandi baru</Label>
        <Input
          id="password"
          type="password"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">{authId.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Ulangi kata sandi baru"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id="confirmPassword-error" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full min-h-11"
        loading={submitting}
        disabled={submitting}
      >
        Simpan kata sandi
      </Button>
    </form>
  );
}
