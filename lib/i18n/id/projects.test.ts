import { describe, expect, it } from "vitest";
import type { ProjectStatus } from "@/types/project";
import { getProjectStatusCopy } from "./status";
import { formatSectionCount, projectFiltersId, projectsId } from "./projects";

describe("katalog proyek", () => {
  it("menyediakan filter status yang disetujui", () => {
    expect(projectFiltersId.map(({ label }) => label)).toEqual([
      "Semua",
      "Draf",
      "Sedang dibuat",
      "Siap ditinjau",
      "Terbit",
    ]);
  });

  it("mempertahankan nilai status mentah untuk filter", () => {
    expect(projectFiltersId.map(({ id }) => id)).toEqual([
      "all",
      "draft",
      "generating",
      "generated",
      "published",
    ] satisfies readonly ("all" | ProjectStatus)[]);
  });

  it("memetakan generated konsisten sebagai siap ditinjau", () => {
    expect(getProjectStatusCopy("generated").label).toBe("Siap ditinjau");
    expect(projectFiltersId.find(({ id }) => id === "generated")?.label).toBe(
      getProjectStatusCopy("generated").label,
    );
  });

  it("memformat jumlah bagian", () => {
    expect(formatSectionCount(0)).toBe("0 bagian");
    expect(formatSectionCount(12)).toBe("12 bagian");
  });

  it("memakai judul dan tindakan proyek alami", () => {
    expect(projectsId).toMatchObject({ title: "Proyek", newProject: "Proyek Baru" });
  });
});
