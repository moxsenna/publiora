import type { Template } from "@/types/template";

/** System templates (same catalog as mock seed). */
export const SYSTEM_TEMPLATES: Template[] = [
  {
    id: "tpl_playbook",
    name: "Playbook",
    description: "Long-form, 6 bab mendalam, sistematis.",
    niche: "Marketing / Growth",
    default_audience: "Founder & marketer",
    default_tone: "Taktis, padat",
    cover_color: "#0A0A0A",
    is_system: true,
  },
  {
    id: "tpl_checklist",
    name: "Checklist",
    description: "Aksi cepat, format bullet, langsung pakai.",
    niche: "Marketing / Conversion",
    default_audience: "Solo marketer",
    default_tone: "Ringkas, praktis",
    cover_color: "#2563EB",
    is_system: true,
  },
  {
    id: "tpl_framework",
    name: "Framework",
    description: "Decision tree & grid, referensi.",
    niche: "AI / Product",
    default_audience: "PM & desainer",
    default_tone: "Presisi, referensial",
    cover_color: "#059669",
    is_system: true,
  },
  {
    id: "tpl_workshop",
    name: "Workshop",
    description: "Sprint mingguan, naratif-course.",
    niche: "Branding",
    default_audience: "Indie founder",
    default_tone: "Hangat, ringan",
    cover_color: "#C8A24B",
    is_system: true,
  },
];
