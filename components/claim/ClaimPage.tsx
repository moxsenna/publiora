"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResolveClaim, READER_ID } from "@/lib/api/hooks";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { Input, Label } from "@/components/ui/Input";
import type { PublishedEbook } from "@/types";
import { BookOpen, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

type ClaimPreview =
  | { status: "ready"; ebook: PublishedEbook; token: string }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "limit_reached" }
  | { status: "not_found" };

interface ClaimPageProps {
  token: string;
  preview: ClaimPreview;
}

export function ClaimPage({ token, preview }: ClaimPageProps) {
  const profile = useAuthStore((s) => s.profile);
  const signIn = useAuthStore((s) => s.signIn);
  const initialized = useAuthStore((s) => s.initialized);
  const resolve = useResolveClaim();
  const pushToast = useUiStore((s) => s.pushToast);
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);

  if (!initialized) {
    return (
      <div className="min-h-full grid place-items-center text-sm text-[var(--color-medium-gray)]">
        Memuat…
      </div>
    );
  }

  if (preview.status !== "ready") {
    const copy: Record<Exclude<ClaimPreview["status"], "ready">, { title: string; desc: string }> = {
      not_found: {
        title: "Link akses tidak valid",
        desc: "Token claim tidak ditemukan. Minta creator membagikan link yang benar.",
      },
      expired: {
        title: "Link akses ini sudah kedaluwarsa",
        desc: "Hubungi creator untuk claim link baru.",
      },
      revoked: {
        title: "Link akses ini sudah tidak aktif",
        desc: "Creator menonaktifkan link ini.",
      },
      limit_reached: {
        title: "Kuota klaim untuk link ini sudah habis",
        desc: "Minta creator menaikkan max claims atau membuat link baru.",
      },
    };
    const c = copy[preview.status];
    return (
      <ClaimFrame>
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-10">
            <div className="h-12 w-12 rounded-2xl bg-[#FEF2F2] text-[var(--color-danger)] grid place-items-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[var(--color-publiora-black)]">{c.title}</h1>
            <p className="mt-2 text-sm text-[var(--color-medium-gray)]">{c.desc}</p>
            <Link href="/" className="inline-block mt-6">
              <Button variant="outline">Ke beranda</Button>
            </Link>
          </CardBody>
        </Card>
      </ClaimFrame>
    );
  }

  const { ebook } = preview;

  const doClaim = async (readerId: string) => {
    try {
      const result = await resolve.mutateAsync({ token, reader_id: readerId });
      if (result.status === "claimed" || result.status === "already_owned") {
        pushToast({
          title:
            result.status === "claimed"
              ? "Added to your library"
              : "Ebook ini sudah ada di library kamu",
          variant: "success",
        });
        router.push(`/read/${result.ebook.slug}`);
        return;
      }
      pushToast({ title: `Claim gagal: ${result.status}`, variant: "danger" });
    } catch {
      pushToast({ title: "Claim gagal", variant: "danger" });
    }
  };

  const onAuthAndClaim = async () => {
    setAuthLoading(true);
    try {
      const p = await signIn(email, password);
      await doClaim(p.email ?? READER_ID);
    } catch {
      pushToast({ title: "Login gagal", variant: "danger" });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <ClaimFrame>
      <Card className="max-w-md w-full overflow-hidden">
        <div className="h-40 p-6 flex flex-col justify-end text-white" style={{ background: ebook.cover_color }}>
          <div className="text-xs uppercase tracking-wide opacity-70">Publiora Claim</div>
          <h1 className="text-2xl font-bold leading-tight mt-1">{ebook.title}</h1>
          {ebook.subtitle && <p className="text-sm opacity-85 mt-1">{ebook.subtitle}</p>}
        </div>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)]">
            <BookOpen className="h-4 w-4" />
            oleh {ebook.author} · {ebook.sections.length} sections
          </div>

          {!profile ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-medium-gray)]">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                Login singkat untuk menambahkan ebook ke library.
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={onAuthAndClaim} loading={authLoading || resolve.isPending}>
                Masuk & tambah ke library
              </Button>
              <p className="text-xs text-center text-[var(--color-medium-gray)]">
                Belum punya akun?{" "}
                <Link href="/register" className="underline">
                  Daftar dulu
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-publiora-emerald)]" />
                Masuk sebagai {profile.email ?? profile.name}
              </div>
              <Button
                className="w-full"
                onClick={() => doClaim(profile.email ?? READER_ID)}
                loading={resolve.isPending}
              >
                Add to My Library
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </ClaimFrame>
  );
}

function ClaimFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-[var(--color-surface-2)]">
      <header className="border-b border-[var(--color-publiora-border)] bg-white">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo size="sm" href="/" />
          <Link href="/login" className="text-sm text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]">
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-12">{children}</main>
    </div>
  );
}
