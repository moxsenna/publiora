"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function RegisterForm() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const pushToast = useUiStore((s) => s.pushToast);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const doRegister = async (data: RegisterInput) => {
    setSubmitting(true);
    setError(null);
    try {
      await signUp(data.name, data.email, data.password);
      pushToast({ title: "Account dibuat", variant: "success" });
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Register gagal. Coba lagi.";
      setError(message);
      // email-confirm path throws after account create — not hard fail toast
      if (message.includes("Cek email")) {
        pushToast({ title: message, variant: "success" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    await doRegister(data);
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleSubmit(onSubmit)(e);
  };

  const onButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const values = getValues();
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      void handleSubmit(onSubmit)();
      return;
    }
    await doRegister(parsed.data);
  };

  return (
    <form
      method="post"
      action="/register"
      onSubmit={onFormSubmit}
      className="space-y-3"
      noValidate
    >
      <div>
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          placeholder="Mox Demo"
          autoComplete="name"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-[var(--color-danger)] mt-1">
            {errors.name.message}
          </p>
        )}
      </div>
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="min 8 karakter"
          autoComplete="new-password"
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
        Create account
      </Button>
    </form>
  );
}
