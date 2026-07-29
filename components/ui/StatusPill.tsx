import type { ProjectStatus } from "@/types/project";
import type { ClaimLinkStatus } from "@/types/claim-link";
import type { ExportStatus } from "@/types/export";
import {
  getClaimLinkStatusCopy,
  getExportStatusCopy,
  getProjectStatusCopy,
} from "@/lib/i18n/id/status";
import { Badge } from "./Badge";

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  const copy = getProjectStatusCopy(status);
  return (
    <Badge variant={copy.tone}>
      {(status === "generating" ||
        status === "publishing" ||
        status === "outline_draft") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
      )}
      {copy.label}
    </Badge>
  );
}

export function ClaimStatusPill({ status }: { status: ClaimLinkStatus }) {
  const copy = getClaimLinkStatusCopy(status);
  return <Badge variant={copy.tone}>{copy.label}</Badge>;
}

export function ExportStatusPill({ status }: { status: ExportStatus }) {
  const copy = getExportStatusCopy(status);
  return <Badge variant={copy.tone}>{copy.label}</Badge>;
}
