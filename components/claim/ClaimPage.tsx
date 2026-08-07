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
import { getClaimPreviewCopy, getClaimResultCopy, readerId } from "@/lib/i18n/id/reader";
import { getUiErrorMessage } from "@/lib/i18n/id/errors";
import { signupEntryUrl } from "@/lib/auth/return-path";

type ClaimPreview =
  | { status: "ready"; ebook: PublishedEbook }
  | { status: "expired" | "revoked" | "limit_reached" | "not_found" };

export function ClaimPage({ token, preview }: { token: string; preview: ClaimPreview }) {
  const profile = useAuthStore((s) => s.profile);
  const signIn = useAuthStore((s) => s.signIn);
  const initialized = useAuthStore((s) => s.initialized);
  const resolve = useResolveClaim();
  const pushToast = useUiStore((s) => s.pushToast);
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; form?: string }>({});
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  if (!initialized) return <div className="min-h-full grid place-items-center text-sm text-[var(--color-medium-gray)]">Memuat…</div>;

  if (preview.status !== "ready") {
    const copy = getClaimPreviewCopy(preview.status);
    return <ClaimFrame token={token}><Card className="max-w-md w-full"><CardBody className="text-center py-10">
      <div className="h-12 w-12 rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-danger)] grid place-items-center mx-auto"><AlertTriangle className="h-6 w-6" /></div>
      <h1 className="mt-4 text-xl font-bold text-[var(--color-publiora-black)]">{copy.title}</h1>
      <p className="mt-2 text-sm text-[var(--color-medium-gray)]">{copy.description}</p>
      <Link href="/" className="inline-block mt-6"><Button variant="outline">Ke beranda</Button></Link>
    </CardBody></Card></ClaimFrame>;
  }

  const doClaim = async (readerId: string) => {
    try {
      const result = await resolve.mutateAsync({ token, reader_id: readerId });
      const copy = getClaimResultCopy(result.status);
      pushToast({ title: copy.title, variant: result.status === "claimed" || result.status === "already_owned" ? "success" : "danger" });
      if (result.status === "claimed" || result.status === "already_owned") router.push(`/read/${result.ebook.slug}`);
    } catch (error) {
      setErrors((value) => ({ ...value, form: getUiErrorMessage(error) }));
    }
  };

  const onAuthAndClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Masukkan alamat email yang valid.";
    if (!password.trim()) nextErrors.password = "Masukkan kata sandi.";
    setErrors(nextErrors);
    if (nextErrors.email) { emailRef.current?.focus(); return; }
    if (nextErrors.password) { passwordRef.current?.focus(); return; }
    setAuthLoading(true);
    try {
      const authenticated = await signIn(email, password);
      await doClaim(authenticated.email ?? READER_ID);
    } catch (error) {
      setErrors({ form: getUiErrorMessage(error) });
    } finally { setAuthLoading(false); }
  };

  const { ebook } = preview;
  return <ClaimFrame token={token}><Card className="max-w-md w-full overflow-hidden">
    <div className="h-40 p-6 flex flex-col justify-end text-white" style={{ background: ebook.cover_color }}><div className="text-xs uppercase tracking-wide opacity-70">Klaim Publiora</div><h1 className="text-2xl font-bold leading-tight mt-1">{ebook.title}</h1>{ebook.subtitle && <p className="text-sm opacity-85 mt-1">{ebook.subtitle}</p>}</div>
    <CardBody className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)]"><BookOpen className="h-4 w-4" />{readerId.by} {ebook.author} · {ebook.sections.length} {readerId.section}</div>
      {!profile ? <form className="space-y-3" onSubmit={onAuthAndClaim} noValidate>
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-medium-gray)]"><Lock className="h-4 w-4 mt-0.5 shrink-0" />Masuk untuk menambahkan ebook ke Pustaka.</div>
        <div><Label htmlFor="email">Email</Label><Input ref={emailRef} id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p id="email-error" className="mt-1 text-xs text-[var(--color-danger)]">{errors.email}</p>}</div>
        <div><Label htmlFor="password">{readerId.password}</Label><Input ref={passwordRef} id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} />{errors.password && <p id="password-error" className="mt-1 text-xs text-[var(--color-danger)]">{errors.password}</p>}</div>
        {errors.form && <p role="alert" className="text-sm text-[var(--color-danger)]">{errors.form}</p>}
        <Button type="submit" className="w-full" loading={authLoading || resolve.isPending}>{readerId.signInAndClaim}</Button>
        <p className="text-xs text-center text-[var(--color-medium-gray)]">Belum punya akun?{" "}
          <Link href={signupEntryUrl(`/claim/${token}`)} className="underline">{readerId.signUpForClaim}</Link>
        </p>
      </form> : <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)]"><CheckCircle2 className="h-4 w-4 text-[var(--color-publiora-emerald)]" />Masuk sebagai {profile.email ?? profile.name}</div>{errors.form && <p role="alert" className="text-sm text-[var(--color-danger)]">{errors.form}</p>}<Button className="w-full" onClick={() => doClaim(profile.email ?? READER_ID)} loading={resolve.isPending}>{readerId.addToLibrary}</Button></div>}
    </CardBody>
  </Card></ClaimFrame>;
}

function ClaimFrame({ children, token }: { children: React.ReactNode; token?: string }) {
  const loginHref = token
    ? `/login?return_to=${encodeURIComponent(`/claim/${token}`)}`
    : "/login";
  return <div className="min-h-full flex flex-col bg-[var(--color-surface-2)]"><header className="border-b border-[var(--color-publiora-border)] bg-white"><div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between"><Logo size="sm" href="/" /><Link href={loginHref} className="text-sm text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]">{readerId.signIn}</Link></div></header><main className="flex-1 grid place-items-center px-4 py-12">{children}</main></div>;
}
