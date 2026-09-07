import { describe, expect, it } from "vitest";
import type { PublishedEbook } from "@/types/published-ebook";
import { buildPublishedReaderDocument } from "./build-published-reader-document";
import { buildProjectPreviewDocument } from "./build-project-preview-document";

const published: PublishedEbook = {
  id: "pub-1",
  project_id: "proj-1",
  slug: "my-book",
  title: "Buku Saya",
  author: "Penulis A",
  subtitle: "Subjudul",
  cover_color: "#123456",
  sections: [
    { id: "s2", position: 2, title: "Bab Dua", content_html: "<p>dua</p>" },
    { id: "s1", position: 1, title: "Bab Satu", content_html: "<p>satu</p>" },
  ],
  published_at: "2026-08-01T00:00:00Z",
  total_readers: 3,
  active_claims: 1,
  is_public: false,
  cta_goal: null,
  final_cta: "Beli ebook",
  cta_url: "https://example.com/checkout",
};

describe("buildPublishedReaderDocument", () => {
  it("maps all published fields and enables reader capabilities", () => {
    const doc = buildPublishedReaderDocument(published);
    expect(doc.source).toBe("published");
    expect(doc.title).toBe("Buku Saya");
    expect(doc.published_slug).toBe("my-book");
    expect(doc.source_project_id).toBe("proj-1");
    expect(doc.capabilities.can_track_progress).toBe(true);
    expect(doc.capabilities.can_open_library).toBe(true);
    expect(doc.capabilities.can_edit_sections).toBe(false);
  });

  it("keeps section order and marks everything complete", () => {
    const doc = buildPublishedReaderDocument(published);
    expect(doc.sections.map((s) => s.position)).toEqual([2, 1]);
    expect(doc.sections.every((s) => s.is_complete)).toBe(true);
    expect(doc.sections[0].source_section_id).toBeNull();
  });

  it("maps the CTA with label and URL", () => {
    const doc = buildPublishedReaderDocument(published);
    expect(doc.cta).toEqual({
      body: "Beli ebook",
      button_label: "Beli ebook",
      url: "https://example.com/checkout",
    });
    const noCta = buildPublishedReaderDocument({ ...published, final_cta: null, cta_url: null });
    expect(noCta.cta).toBeNull();
  });
});

describe("buildProjectPreviewDocument", () => {
  const project = {
    id: "proj-1",
    title: "Proyek Saya",
    subtitle: null,
    author: "Saya",
    cover_color: "#0A0A0A",
    cta_goal: null as never,
    final_cta: "Kunjungi website",
    cta_url: "https://saya.example.com",
    status: "generating" as const,
  };

  const sections = [
    {
      id: "sec-2",
      outline_section_id: "os-2",
      position: 2,
      title: "Bab Dua",
      content_html: "<p>dua</p>",
      status: "pending" as const,
    },
    {
      id: "sec-1",
      outline_section_id: "os-1",
      position: 1,
      title: "Bab Satu",
      content_html: "<p>satu</p>",
      status: "edited" as const,
    },
    {
      id: "sec-3",
      outline_section_id: "os-3",
      position: 3,
      title: "Bab Tiga",
      content_html: "<p>tiga</p>",
      status: "generated" as const,
    },
  ];

  it("sorts by position", () => {
    const doc = buildProjectPreviewDocument({ project, sections });
    expect(doc.sections.map((s) => s.position)).toEqual([1, 2, 3]);
  });

  it("marks incomplete sections and keeps their placeholders", () => {
    const doc = buildProjectPreviewDocument({ project, sections });
    expect(doc.sections.map((s) => s.is_complete)).toEqual([true, false, true]);
    expect(doc.sections[1].content_html).toContain("belum selesai");
    expect(doc.sections[0].content_html).toBe("<p>satu</p>");
  });

  it("keeps CTA and disables reader-only capabilities while enabling edit", () => {
    const doc = buildProjectPreviewDocument({ project, sections });
    expect(doc.cta).toEqual({
      body: "Kunjungi website",
      button_label: "Kunjungi website",
      url: "https://saya.example.com",
    });
    expect(doc.source).toBe("project_preview");
    expect(doc.published_slug).toBeNull();
    expect(doc.capabilities.can_track_progress).toBe(false);
    expect(doc.capabilities.can_open_library).toBe(false);
    expect(doc.capabilities.can_share).toBe(false);
    expect(doc.capabilities.can_edit_sections).toBe(true);
  });

  it("disables edit links when nothing is written yet", () => {
    const empty = sections.filter((s) => s.status === "pending").map((s) => s);
    const doc = buildProjectPreviewDocument({ project, sections: empty });
    expect(doc.capabilities.can_edit_sections).toBe(false);
  });

  it("maps source section ids for deep edit links", () => {
    const doc = buildProjectPreviewDocument({ project, sections });
    expect(doc.sections[0].source_section_id).toBe("os-1");
  });
});