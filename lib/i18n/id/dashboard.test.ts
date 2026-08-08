import { describe, expect, it } from "vitest";
import { dashboardId, formatDashboardRelativeTime } from "./dashboard";

describe("katalog dasbor", () => {
  it("memakai label statistik dan bagian yang disetujui", () => {
    expect(dashboardId).toMatchObject({
      credit: "Kredit",
      projects: "Proyek",
      published: "Terbit",
      totalReaders: "Total pembaca",
      activeClaims: "Klaim aktif",
      recentProjects: "Proyek terbaru",
    });
  });

  it("memformat waktu relatif dengan Bahasa Indonesia", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    expect(formatDashboardRelativeTime("2026-07-29T11:59:40.000Z", now)).toBe("baru saja");
    expect(formatDashboardRelativeTime("2026-07-29T10:00:00.000Z", now)).toBe("2 jam lalu");
    expect(formatDashboardRelativeTime("2026-07-01T12:00:00.000Z", now)).toBe("1 Jul 2026");
    expect(formatDashboardRelativeTime("invalid", now)).toBe("");
  });
});
