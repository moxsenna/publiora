import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metadataId } from "@/lib/i18n/id/metadata";

export const metadata: Metadata = metadataId.routes.library;

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return children;
}
