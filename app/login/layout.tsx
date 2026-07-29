import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metadataId } from "@/lib/i18n/id/metadata";

export const metadata: Metadata = metadataId.routes.login;

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
