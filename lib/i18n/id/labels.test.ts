import { describe, expect, it } from "vitest";
import {
  agentsId,
  commonId,
  ebookTypeLabelsId,
  generationId,
  navigationId,
  publishId,
  reviewId,
  sectionStatusLabelsId,
  workspaceId,
  workflowStepLabelsId,
} from "@/lib/i18n/id";

describe("id label maps", () => {
  it("covers section statuses", () => {
    expect(Object.keys(sectionStatusLabelsId).sort()).toEqual(
      ["edited", "failed", "generated", "generating", "pending"].sort(),
    );
  });

  it("covers ebook types", () => {
    expect(Object.keys(ebookTypeLabelsId).sort()).toEqual(
      ["bonus_product", "lead_magnet", "sellable_ebook"].sort(),
    );
  });

  it("defines exact Indonesian navigation labels", () => {
    expect(navigationId).toEqual({
      dashboard: "Dasbor",
      projects: "Proyek",
      offers: "Produk & Penawaran",
      library: "Pustaka",
      billing: "Tagihan",
      newProject: "Proyek Baru",
      workspace: "Ruang Kerja",
      published: "Terbit",
      signOut: "Keluar",
      openMenu: "Buka menu",
      closeMenu: "Tutup menu",
      collapseSidebar: "Ciutkan panel samping",
      expandSidebar: "Bentangkan panel samping",
      guest: "Pengguna",
    });
  });

  it("has non-empty Indonesian strings for key modules", () => {
    for (const value of Object.values(commonId)) {
      expect(String(value).length).toBeGreaterThan(0);
    }
    expect(workspaceId.approveOutline).toMatch(/outline/i);
    expect(generationId.start).toMatch(/Mulai/i);
    expect(reviewId.strategy).toBe("Strategi");
    expect(publishId.publish).toBe("Terbitkan");
    expect(agentsId.generateSuggestions).toBe("Buat saran");
    expect(workflowStepLabelsId.review).toBe("Review");
  });

  it("does not expose raw English enum tokens as labels", () => {
    expect(sectionStatusLabelsId.generated).not.toBe("generated");
    expect(sectionStatusLabelsId.pending).not.toBe("pending");
    expect(sectionStatusLabelsId.edited).not.toBe("edited");
  });
});
