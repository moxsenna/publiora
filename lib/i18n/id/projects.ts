import type { ProjectStatus } from "@/types/project";
import { getProjectStatusCopy } from "./status";

const visibleFilterStatuses = ["draft", "generating", "generated", "published"] as const satisfies readonly ProjectStatus[];

/** Curated collection filters; omitted statuses remain visible under `all`. */
export type ProjectCollectionFilter = "all" | (typeof visibleFilterStatuses)[number];
export type ProjectFilter = ProjectCollectionFilter;

export const projectFiltersId = [
  { id: "all", label: "Semua" },
  ...visibleFilterStatuses.map((id) => ({ id, label: getProjectStatusCopy(id).label })),
] as const satisfies readonly { id: ProjectCollectionFilter; label: string }[];

export const ebookTypeLabelsId = {
  lead_magnet: "Lead Magnet",
  bonus_product: "Bonus Pembelian",
  sellable_ebook: "Ebook Berbayar",
} as const;

export const projectWizardId = {
  createError: "Proyek belum dapat dibuat. Periksa data Anda lalu coba lagi.",
  validationSummary: "Perbaiki bidang yang ditandai sebelum lanjut.",
  noTemplate: "Tanpa template",
} as const;

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
