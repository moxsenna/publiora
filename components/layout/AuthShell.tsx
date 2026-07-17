"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  children,
  title,
  description,
  footer,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-full grid md:grid-cols-2 bg-white">
      <div className="flex flex-col justify-between p-8">
        <Logo size="md" href="/" />
        <div className="my-12 max-w-md">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-publiora-black)]">{title}</h1>
          {description && (
            <p className="mt-3 text-[var(--color-medium-gray)]">{description}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
        <div className="text-xs text-[var(--color-soft-gray)]">
          © 2026 Publiora. Crafted for creators.
        </div>
      </div>
      <div className="hidden md:flex bg-[var(--color-publiora-black)] text-white p-12 relative overflow-hidden">
        <div className="relative z-10 my-auto">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />
            AI-native publishing
          </div>
          <blockquote className="mt-8 text-3xl font-semibold leading-tight max-w-lg">
            &ldquo;Publiora mengubah satu brief menjadi ebook yang siap dibagikan — outline, tulisan, dan distribusi dalam satu workspace.&rdquo;
          </blockquote>
          <div className="mt-6 text-sm text-white/70">
            — Demo preview MVP
          </div>
        </div>
        <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-[var(--color-gold)]/20 blur-3xl" />
        <div className="absolute -left-24 bottom-12 h-80 w-80 rounded-full bg-[var(--color-publiora-blue)]/30 blur-3xl" />
      </div>
      {footer && <div className="col-span-2 px-8 py-4 text-sm text-[var(--color-soft-gray)]">{footer}</div>}
    </div>
  );
}

export function AuthSwitch({ question, href, label }: { question: string; href: string; label: string }) {
  return (
    <p className="text-sm text-[var(--color-medium-gray)] mt-6">
      {question}{" "}
      <Link href={href} className="font-semibold text-[var(--color-publiora-blue)] hover:underline">
        {label}
      </Link>
    </p>
  );
}
