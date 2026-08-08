"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { publishedId } from "@/lib/i18n/id/published";
import type { ClaimCreateInput } from "@/types/claim-link";

export function CreateClaimLinkDialog({ open, onClose, ebookId, isPending, onSubmit }: { open: boolean; onClose: () => void; ebookId: string; isPending: boolean; onSubmit: (input: ClaimCreateInput) => Promise<boolean> }) {
  const [label, setLabel] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");
  const [expiresIn, setExpiresIn] = React.useState("");
  const [errors, setErrors] = React.useState<{ label?: string; max?: string; expires?: string }>({});
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    const nextErrors: typeof errors = {};
    if (!label.trim()) nextErrors.label = publishedId.claims.labelRequired;
    if (maxUses && Number(maxUses) < 1) nextErrors.max = publishedId.claims.maxError;
    if (expiresIn && Number(expiresIn) < 1) nextErrors.expires = publishedId.claims.expiresError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const created = await onSubmit({ ebook_id: ebookId, label: label.trim(), max_uses: maxUses ? Number(maxUses) : null, expires_in_days: expiresIn ? Number(expiresIn) : undefined });
    if (created) { setLabel(""); setMaxUses(""); setExpiresIn(""); setErrors({}); }
  };
  return <Modal open={open} onClose={onClose} preventClose={isPending} title={publishedId.claims.createTitle} description={publishedId.claims.createDescription} footer={<><Button variant="outline" disabled={isPending} onClick={onClose}>{publishedId.actions.cancel}</Button><Button type="submit" form="create-claim-link-form" loading={isPending}>{publishedId.actions.create}</Button></>}><form id="create-claim-link-form" noValidate className="space-y-3" onSubmit={(event) => void submit(event)}><div><Label htmlFor="claim-label">{publishedId.claims.label}</Label><Input id="claim-label" required maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={publishedId.claims.labelPlaceholder} aria-invalid={!!errors.label} aria-describedby={errors.label ? "claim-label-error" : undefined} />{errors.label && <p id="claim-label-error" className="mt-1 text-xs text-[var(--color-danger)]">{errors.label}</p>}</div><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="claim-max">{publishedId.claims.maxUses}</Label><Input id="claim-max" type="number" min={1} step={1} inputMode="numeric" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder={publishedId.claims.maxPlaceholder} aria-invalid={!!errors.max} aria-describedby={errors.max ? "claim-max-error" : undefined} />{errors.max && <p id="claim-max-error" className="mt-1 text-xs text-[var(--color-danger)]">{errors.max}</p>}</div><div><Label htmlFor="claim-expiry">{publishedId.claims.expiresDays}</Label><Input id="claim-expiry" type="number" min={1} step={1} inputMode="numeric" value={expiresIn} onChange={(event) => setExpiresIn(event.target.value)} placeholder={publishedId.claims.expiresPlaceholder} aria-invalid={!!errors.expires} aria-describedby={errors.expires ? "claim-expiry-error" : undefined} />{errors.expires && <p id="claim-expiry-error" className="mt-1 text-xs text-[var(--color-danger)]">{errors.expires}</p>}</div></div></form></Modal>;
}
