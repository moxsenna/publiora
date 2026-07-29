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
