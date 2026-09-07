// Adapt an unpublished project (current outline + sections + CTA) into the
// ReaderDocument contract for the creator preview route.
//
// Rules:
// - sections are sorted by position;
// - generated/edited sections render their real content;
// - pending/failed sections render a preview-only incomplete placeholder;
// - progress/library/share are disabled; creator edit links are enabled.

import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import {
  PREVIEW_INCOMPLETE_PLACEHOLDER,
  type ReaderDocument,
} from "@/types/reader";

export interface ProjectPreviewInput {
  project: Pick<
    Project,
    "id" | "title" | "subtitle" | "author" | "cover_color" | "cta_goal" | "final_cta" | "cta_url" | "status"
  >;
  sections: Pick<Section, "id" | "outline_section_id" | "position" | "title" | "content_html" | "status">[];
}

export function buildProjectPreviewDocument(input: ProjectPreviewInput): ReaderDocument {
  const sorted = [...input.sections].sort((a, b) => a.position - b.position);
  const hasCompletableContent = sorted.some(
    (section) => section.status === "generated" || section.status === "edited"
  );

  return {
    id: input.project.id,
    source: "project_preview",
    title: input.project.title,
    subtitle: input.project.subtitle ?? null,
    author: input.project.author ?? "Penulis",
    cover_color: input.project.cover_color,
    sections: sorted.map((section) => {
      const complete = section.status === "generated" || section.status === "edited";
      return {
        id: section.id,
        source_section_id: section.outline_section_id ?? null,
        position: section.position,
        title: section.title,
        content_html: complete
          ? section.content_html
          : PREVIEW_INCOMPLETE_PLACEHOLDER,
        is_complete: complete,
      };
    }),
    cta: input.project.final_cta
      ? {
          body: input.project.final_cta,
          button_label: input.project.final_cta,
          url: input.project.cta_url ?? null,
        }
      : null,
    capabilities: {
      can_track_progress: false,
      can_open_library: false,
      can_share: false,
      can_edit_sections: hasCompletableContent,
    },
    source_project_id: input.project.id,
    published_slug: null,
  };
}