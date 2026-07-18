import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Pembayaran",
};

export default function BillingReturnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>{children}</Suspense>;
}
