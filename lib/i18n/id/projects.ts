import type { ProjectStatus } from "@/types/project";
import { getProjectStatusCopy } from "./status";

export type ProjectFilter = "all" | ProjectStatus;

const visibleFilterStatuses = ["draft", "generating", "generated", "published"] as const satisfies readonly ProjectStatus[];

export const projectFiltersId = [
  { id: "all", label: "Semua" },
  ...visibleFilterStatuses.map((id) => ({ id, label: getProjectStatusCopy(id).label })),
] as const satisfies readonly { id: ProjectFilter; label: string }[];

export const projectsId = {
  title: "Proyek",
  description: "Semua proyek ebook Anda.",
  total: "total",
  newProject: "Proyek Baru",
  searchLabel: "Cari proyek",
  searchPlaceholder: "Cari proyek…",
  empty: "Belum ada proyek",
  emptyDescription: "Mulai proyek pertama Anda sekarang.",
  noResults: "Proyek tidak ditemukan",
  noResultsDescription: "Coba kata kunci atau filter lain.",
  loadError: "Proyek belum dapat dimuat.",
  retry: "Coba lagi",
  updated: "Diperbarui",
  progress: "Progres pembuatan",
} as const;

export function formatSectionCount(count: number): string {
  return `${count.toLocaleString("id-ID")} bagian`;
}
