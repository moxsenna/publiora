export const dashboardId = {
  title: "Dasbor",
  summary: "Ringkasan aktivitas Publiora Anda.",
  newProject: "Proyek Baru",
  createProject: "Buat proyek",
  createProjectDescription: "Mulai ebook baru dari brief",
  billing: "Tagihan",
  billingDescription: "Langganan dan kredit pembuatan",
  library: "Pustaka",
  libraryDescription: "Ebook yang sudah diklaim",
  credit: "Kredit",
  projects: "Proyek",
  published: "Terbit",
  totalReaders: "Total pembaca",
  activeClaims: "Klaim aktif",
  recentProjects: "Proyek terbaru",
  publishedEbooks: "Ebook terbit",
  viewAll: "Lihat semua",
  noProjects: "Belum ada proyek",
  noProjectsDescription: "Mulai proyek pertama untuk membuat ebook.",
  noPublished: "Belum ada ebook terbit",
  noPublishedDescription: "Selesaikan dan tinjau proyek, lalu terbitkan ebook.",
  updated: "Diperbarui",
  loadError: "Data belum dapat dimuat.",
  retry: "Coba lagi",
} as const;

export function formatDashboardRelativeTime(iso: string, now = new Date()): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";
  const seconds = Math.max(0, Math.round((now.getTime() - timestamp) / 1000));
  if (seconds < 45) return "baru saja";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  if (days < 28) return `${Math.round(days / 7)} minggu lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function formatCreditBalance(count: number): string {
  return `${count.toLocaleString("id-ID")} kredit`;
}

export function formatReaderCount(count: number): string {
  return `${count.toLocaleString("id-ID")} pembaca`;
}

export function formatClaimCount(count: number): string {
  return `${count.toLocaleString("id-ID")} klaim`;
}
