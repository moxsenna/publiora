"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useUiStore } from "@/store/projectStore";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/supabase/errors";

export function ForgotPasswordForm() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!hasSupabaseEnv()) {
        throw new Error("Supabase belum dikonfigurasi.");
      }
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw new Error(mapAuthError(error));
      setSent(true);
      pushToast({
        title: "Reset link dikirim",
        description: "Cek inbox email Anda.",
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal kirim reset link";
      pushToast({ title: message, variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#A7E9C5] bg-[#ECFDF3] p-5">
        <p className="text-sm text-[var(--color-deep-gray)]">
          Jika akun dengan email <strong>{email}</strong> ada, instruksi reset
          sudah dikirim. Cek inbox.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e);
      }}
      className="space-y-4"
      noValidate
    >
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Kirim reset link
      </Button>
    </form>
  );
}
