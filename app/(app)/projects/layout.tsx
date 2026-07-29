import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metadataId } from "@/lib/i18n/id/metadata";

export const metadata: Metadata = metadataId.routes.projects;

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return children;
}
