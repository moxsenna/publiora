import type { BadgeProps } from "./Badge";
import { Badge } from "./Badge";
import type { ProjectStatus } from "@/types/project";
import type { ClaimLinkStatus } from "@/types/claim-link";
import type { ExportStatus } from "@/types/export";

const projectMap: Record<ProjectStatus, { variant: BadgeProps["variant"]; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  outline_draft: { variant: "warning", label: "Outline Draft" },
  approved: { variant: "info", label: "Approved" },
  generating: { variant: "info", label: "Generating" },
  generated: { variant: "success", label: "Generated" },
  publishing: { variant: "warning", label: "Publishing" },
  published: { variant: "success", label: "Published" },
  failed: { variant: "danger", label: "Failed" },
};

const claimMap: Record<ClaimLinkStatus, { variant: BadgeProps["variant"]; label: string }> = {
  active: { variant: "success", label: "Active" },
  expired: { variant: "default", label: "Expired" },
  revoked: { variant: "danger", label: "Revoked" },
};

const exportMap: Record<ExportStatus, { variant: BadgeProps["variant"]; label: string }> = {
  queued: { variant: "default", label: "Queued" },
  processing: { variant: "info", label: "Processing" },
  complete: { variant: "success", label: "Complete" },
  failed: { variant: "danger", label: "Failed" },
};

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  const m = projectMap[status] ?? { variant: "default", label: status };
  return (
    <Badge variant={m.variant}>
      {(status === "generating" ||
        status === "publishing" ||
        status === "outline_draft") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
      )}
      {m.label}
    </Badge>
  );
}

export function ClaimStatusPill({ status }: { status: ClaimLinkStatus }) {
  const m = claimMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function ExportStatusPill({ status }: { status: ExportStatus }) {
  const m = exportMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
