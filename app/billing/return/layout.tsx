import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { metadataId } from "@/lib/i18n/id/metadata";

export const metadata: Metadata = metadataId.routes.payment;

export default function BillingReturnLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<div className="p-8 text-center text-sm">Memuat…</div>}>{children}</Suspense>;
}
