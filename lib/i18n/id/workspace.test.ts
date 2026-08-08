import { describe, expect, it } from "vitest";
import { getWorkflowBlockerCopy, workflowStepLabelsId, workspaceId } from "./workspace";

describe("copy ruang kerja", () => {
  it("memakai urutan tahap tetap dalam Bahasa Indonesia", () => {
    expect(workflowStepLabelsId).toEqual({
      strategy: "Strategi",
      outline: "Outline",
      write: "Tulis",
      review: "Tinjau",
      publish: "Terbit",
    });
  });

  it("memetakan blocker outline tanpa pesan backend mentah", () => {
    expect(getWorkflowBlockerCopy("outline_missing")).toEqual({
      title: "Outline belum siap",
      description: "Buat dan setujui outline sebelum menulis bagian.",
      action: "Buka Outline",
    });
  });

  it("memberi fallback aman untuk blocker dinamis", () => {
    const copy = getWorkflowBlockerCopy("missing_section_abc");
    expect(copy.description).not.toContain("abc");
    expect(copy).toMatchObject({ action: "Buka tahap terkait" });
  });

  it("menyediakan tindakan utama ruang kerja", () => {
    expect(workspaceId).toMatchObject({
      sections: "Bagian",
      generateOutline: "Buat Outline",
      writeSections: "Tulis Bagian",
      reviewEbook: "Tinjau Ebook",
      publishEbook: "Terbitkan Ebook",
      save: "Simpan",
      cancel: "Batal",
      preview: "Pratinjau",
    });
  });
});

describe("copy panel ruang kerja", () => {
  it("menyediakan label dan deskripsi tujuan CTA dalam Bahasa Indonesia", () => {
    expect(workspaceId.ctaGoalLabels).toEqual({
      visit_product: "Kunjungi Halaman Produk",
      join_whatsapp: "Gabung Komunitas WhatsApp",
      claim_bonus: "Klaim Bonus / Unduhan",
      buy_product: "Beli Produk",
      follow_creator: "Ikuti Kreator",
      custom: "CTA Kustom",
    });
    expect(workspaceId.ctaGoalDescriptions.visit_product).toContain("pembaca");
    expect(workspaceId.ctaGoalDescriptions.join_whatsapp).toContain("WhatsApp");
    expect(workspaceId.ctaGoalDescriptions.custom).toContain("kustom");
  });

  it("menyediakan label penempatan CTA dalam Bahasa Indonesia", () => {
    expect(workspaceId.placementLabels).toEqual({
      ebook_end: "Akhir ebook",
      claim_page: "Hanya halaman klaim",
      both: "Keduanya",
    });
  });

  it("menyediakan heading dan label formulir CTA", () => {
    expect(workspaceId.ctaHeading).toBe("Ajakan Bertindak (CTA)");
    expect(workspaceId.ctaGoalLabel).toBe("Tujuan");
    expect(workspaceId.saveCta).toBe("Simpan CTA");
    expect(workspaceId.currentCta).toBe("Saat ini: ");
    expect(workspaceId.suggestions).toBe("Saran");
    expect(workspaceId.copy).toBe("Salin");
  });

  it("menyediakan notifikasi CTA dalam Bahasa Indonesia", () => {
    expect(workspaceId.ctaUrlRequiredTitle).toBe("URL wajib diisi");
    expect(workspaceId.ctaUrlRequiredDesc).toContain("https://");
    expect(workspaceId.ctaApplied).toBe("CTA diterapkan");
    expect(workspaceId.ctaUrlInvalid).toBe("Masukkan URL yang valid");
    expect(workspaceId.ctaSaved).toBe("CTA disimpan");
    expect(workspaceId.ctaSaveFailed).toBe("Gagal menyimpan CTA");
    expect(workspaceId.ctaEmptyHint).toContain("saran CTA");
  });

  it("menyediakan copy pembuatan outline dalam Bahasa Indonesia", () => {
    expect(workspaceId.outlineCreated).toBe("Outline dibuat");
    expect(workspaceId.strategyNotReadyTitle).toBe("Strategi belum siap");
    expect(workspaceId.strategyNotReadyDesc).toContain("outline");
    expect(workspaceId.creditsInsufficientTitle).toBe("Kredit tidak cukup");
    expect(workspaceId.creditsInsufficientDesc).toContain("Tagihan");
    expect(workspaceId.outlineGenerateFailed).toBe("Gagal membuat outline");
    expect(workspaceId.generateOutlineFromStrategy).toContain("strategi");
    expect(workspaceId.generateOutlineBtn).toBe("Buat outline");
    expect(workspaceId.approveFailed).toBe("Gagal menyetujui outline");
    expect(workspaceId.addSection).toBe("Bagian");
  });

  it("menyediakan petunjuk dan dialog regenerasi outline", () => {
    expect(workspaceId.approveHint(3, 1)).toBe(
      "Tambahkan minimal 3 bagian berjudul untuk menyetujui. Saat ini: 1.",
    );
    expect(workspaceId.regenerateOutline).toBe("Buat ulang");
    expect(workspaceId.regenerateInstructionPlaceholder).toBe(
      "Instruksi opsional untuk membuat ulang…",
    );
    expect(workspaceId.regenerateResetTitle).toBe(
      "Buat ulang dan setel ulang bagian tertulis",
    );
    expect(workspaceId.regenerateResetDesc).toContain("permanen");
    expect(workspaceId.regenerateResetAction).toBe("Buat ulang dan setel ulang");
    expect(workspaceId.regenerateResetWarning).toContain("hilang");
  });

  it("menyediakan placeholder dan judul bagian baru", () => {
    expect(workspaceId.sectionTitlePlaceholder).toBe("Judul bagian…");
    expect(workspaceId.sectionSummaryPlaceholder).toBe("Ringkasan isi bagian…");
    expect(workspaceId.newSectionTitle).toBe("Bagian baru");
  });

  it("menyediakan copy pratinjau ebook", () => {
    expect(workspaceId.previewUnavailable).toBe("Pratinjau belum tersedia");
    expect(workspaceId.previewEmptyDesc).toContain("Bagian");
  });

  it("menyediakan copy saran judul", () => {
    expect(workspaceId.titleApplied).toBe("Diterapkan");
    expect(workspaceId.useThisTitle).toBe("Gunakan judul ini");
    expect(workspaceId.titleEmptyHint).toContain("saran judul");
  });

  it("menyediakan copy editor kaya", () => {
    expect(workspaceId.editorLoading).toBe("Memuat editor…");
    expect(workspaceId.toolbar).toEqual({
      bold: "Tebal",
      italic: "Miring",
      bulletList: "Daftar poin",
      orderedList: "Daftar bernomor",
      quote: "Kutipan",
      undo: "Urungkan",
      redo: "Ulangi",
    });
  });
});
