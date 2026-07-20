"use client";

import { Button } from "@/components/ui/Button";

export function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-publiora-border)] bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
          {title}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

export function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3">
      <dt className="text-[var(--color-medium-gray)]">{label}</dt>
      <dd className="text-[var(--color-deep-gray)] break-words">{value}</dd>
    </div>
  );
}
