import type { Template } from "@/types/template";
import type { EbookType } from "@/types/project";

const ALL: EbookType[] = ["lead_magnet", "bonus_product", "sellable_ebook"];

/** System templates with format + compatibility metadata. */
export const SYSTEM_TEMPLATES: Template[] = [
  {
    id: "tpl_quick_win",
    name: "Quick Win Guide",
    description:
      "Panduan singkat untuk menghasilkan satu hasil nyata dengan cepat.",
    niche: "Marketing / Growth",
    default_audience: "Pembaca yang butuh hasil cepat",
    default_tone: "Praktis, ringkas",
    cover_color: "#0EA5E9",
    is_system: true,
    format: "quick_win_guide",
    supported_ebook_types: ALL,
    recommended_for: ["lead_magnet", "quick_result"],
    default_section_count: 5,
    depth: "quick",
  },
  {
    id: "tpl_checklist",
    name: "Checklist",
    description: "Langkah ringkas yang langsung dapat dipraktikkan.",
    niche: "Marketing / Conversion",
    default_audience: "Solo marketer",
    default_tone: "Ringkas, praktis",
    cover_color: "#2563EB",
    is_system: true,
    format: "checklist",
    supported_ebook_types: ALL,
    recommended_for: ["lead_magnet", "bonus_product", "ready_to_use_assets"],
    default_section_count: 5,
    depth: "quick",
  },
  {
    id: "tpl_playbook",
    name: "Playbook",
    description: "Panduan sistematis dan mendalam untuk proses yang kompleks.",
    niche: "Marketing / Growth",
    default_audience: "Founder & marketer",
    default_tone: "Taktis, padat",
    cover_color: "#0A0A0A",
    is_system: true,
    format: "playbook",
    supported_ebook_types: ALL,
    recommended_for: ["sellable_ebook", "complex_system"],
    default_section_count: 8,
    depth: "deep",
  },
  {
    id: "tpl_framework",
    name: "Framework",
    description:
      "Kerangka keputusan dan model referensi untuk topik strategis.",
    niche: "AI / Product",
    default_audience: "PM & desainer",
    default_tone: "Presisi, referensial",
    cover_color: "#059669",
    is_system: true,
    format: "framework",
    supported_ebook_types: ALL,
    recommended_for: ["sellable_ebook", "complex_system"],
    default_section_count: 7,
    depth: "deep",
  },
  {
    id: "tpl_workbook",
    name: "Workbook",
    description:
      "Lembar kerja untuk membantu pembaca mengambil keputusan dan bertindak.",
    niche: "Coaching / Education",
    default_audience: "Peserta program",
    default_tone: "Membimbing, praktis",
    cover_color: "#7C3AED",
    is_system: true,
    format: "workbook",
    supported_ebook_types: ["bonus_product", "sellable_ebook", "lead_magnet"],
    recommended_for: ["bonus_product", "ready_to_use_assets"],
    default_section_count: 6,
    depth: "standard",
  },
  {
    id: "tpl_implementation_guide",
    name: "Panduan Implementasi",
    description:
      "Pendamping langkah demi langkah untuk menerapkan produk utama.",
    niche: "Course / Product Support",
    default_audience: "Pembeli produk utama",
    default_tone: "Jelas, langkah demi langkah",
    cover_color: "#DC2626",
    is_system: true,
    format: "implementation_guide",
    supported_ebook_types: ["bonus_product", "sellable_ebook", "lead_magnet"],
    recommended_for: ["bonus_product", "implementation_aid"],
    default_section_count: 6,
    depth: "standard",
  },
  {
    id: "tpl_resource_guide",
    name: "Resource Guide",
    description: "Kumpulan aset, template, dan referensi siap pakai.",
    niche: "Marketing / Tools",
    default_audience: "Praktisi yang butuh aset",
    default_tone: "Ringkas, utilitas tinggi",
    cover_color: "#EA580C",
    is_system: true,
    format: "resource_guide",
    supported_ebook_types: ALL,
    recommended_for: ["bonus_product", "ready_to_use_assets"],
    default_section_count: 5,
    depth: "quick",
  },
  {
    id: "tpl_workshop",
    name: "Workshop",
    description: "Format sprint mingguan dengan alur seperti course.",
    niche: "Branding",
    default_audience: "Indie founder",
    default_tone: "Hangat, ringan",
    cover_color: "#C8A24B",
    is_system: true,
    format: "workshop",
    supported_ebook_types: ALL,
    recommended_for: ["sellable_ebook"],
    default_section_count: 8,
    depth: "deep",
  },
  {
    id: "tpl_blank",
    name: "Blank",
    description: "Mulai dari kosong tanpa struktur default.",
    niche: "Umum",
    default_audience: "",
    default_tone: "Praktis, jelas",
    cover_color: "#6366f1",
    is_system: true,
    format: "blank",
    supported_ebook_types: ALL,
    recommended_for: [],
    default_section_count: 5,
    depth: "standard",
  },
];

export function getTemplateById(id: string | null | undefined): Template | null {
  if (!id) return null;
  return SYSTEM_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getCompatibleTemplates(ebookType: EbookType): Template[] {
  return SYSTEM_TEMPLATES.filter((t) =>
    t.supported_ebook_types.includes(ebookType),
  );
}

export function isTemplateCompatible(
  templateId: string | null | undefined,
  ebookType: EbookType,
): boolean {
  if (!templateId) return true;
  const tpl = getTemplateById(templateId);
  if (!tpl) return false;
  return tpl.supported_ebook_types.includes(ebookType);
}
