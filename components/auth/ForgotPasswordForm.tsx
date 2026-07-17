"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useUiStore } from "@/store/projectStore";

export function ForgotPasswordForm() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    pushToast({ title: "Reset link dikirim (mock)", variant: "success" });
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#A7E9C5] bg-[#ECFDF3] p-5">
        <p className="text-sm text-[var(--color-deep-gray)]">
          Jika akun dengan email <strong>{email}</strong> ada, instruksi reset sudah dikirim. Cek inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
