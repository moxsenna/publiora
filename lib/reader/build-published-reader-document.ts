// Adapt a published_ebooks row (PublishedEbook) into the ReaderDocument contract.

import type { PublishedEbook } from "@/types";
import type { ReaderDocument } from "@/types/reader";

export function buildPublishedReaderDocument(ebook: PublishedEbook): ReaderDocument {
  return {
    id: ebook.id,
    source: "published",
    title: ebook.title,
    subtitle: ebook.subtitle ?? null,
    author: ebook.author,
    cover_color: ebook.cover_color,
    sections: (ebook.sections ?? []).map((section, index) => ({
      id: section.id,
      source_section_id: null,
      position: section.position ?? index + 1,
      title: section.title,
      content_html: section.content_html,
      is_complete: true,
    })),
    cta: ebook.final_cta
      ? {
          body: ebook.final_cta,
          button_label: ebook.final_cta,
          url: ebook.cta_url ?? null,
        }
      : null,
    capabilities: {
      can_track_progress: true,
      can_open_library: true,
      can_share: false,
      can_edit_sections: false,
    },
    source_project_id: ebook.project_id,
    published_slug: ebook.slug,
  };
}