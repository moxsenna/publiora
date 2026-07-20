// Deterministic template recommendation — no AI credits.

import type {
  BonusRole,
  EbookType,
  LeadGoal,
  SalesPositioning,
} from "@/types/project";
import type { Template } from "@/types/template";
import {
  getCompatibleTemplates,
  SYSTEM_TEMPLATES,
} from "@/lib/templates-catalog";

export interface TemplateRecommendationInput {
  ebookType: EbookType;
  leadGoal?: LeadGoal | null;
  bonusRole?: BonusRole | null;
  salesPositioning?: SalesPositioning | null;
  desiredOutcome: string;
  primaryProblem: string;
}

export interface RankedTemplate {
  template: Template;
  score: number;
  reason: string;
  recommended: boolean;
}

const QUICK_HINTS =
  /cepat|quick|15|30 menit|checklist|ringkas|instant|segera|hari ini/i;
const COMPLEX_HINTS =
  /sistem|framework|strategi|mendalam|kompleks|end-to-end|playbook|arsitektur/i;

function baseScore(format: Template["format"], ebookType: EbookType): number {
  // Compatibility matrix strengths
  const matrix: Record<string, Partial<Record<EbookType, number>>> = {
    quick_win_guide: {
      lead_magnet: 40,
      bonus_product: 25,
      sellable_ebook: 10,
    },
    checklist: { lead_magnet: 40, bonus_product: 40, sellable_ebook: 25 },
    playbook: { lead_magnet: 25, bonus_product: 25, sellable_ebook: 40 },
    framework: { lead_magnet: 25, bonus_product: 25, sellable_ebook: 40 },
    workbook: { lead_magnet: 10, bonus_product: 40, sellable_ebook: 40 },
    implementation_guide: {
      lead_magnet: 10,
      bonus_product: 40,
      sellable_ebook: 25,
    },
    resource_guide: {
      lead_magnet: 25,
      bonus_product: 40,
      sellable_ebook: 25,
    },
    workshop: { lead_magnet: 10, bonus_product: 25, sellable_ebook: 40 },
    blank: { lead_magnet: 5, bonus_product: 5, sellable_ebook: 5 },
  };
  return matrix[format]?.[ebookType] ?? 10;
}

function contextBonus(
  tpl: Template,
  input: TemplateRecommendationInput,
): { points: number; reason: string } {
  const text = `${input.desiredOutcome} ${input.primaryProblem}`;
  const isQuick = QUICK_HINTS.test(text);
  const isComplex = COMPLEX_HINTS.test(text);

  if (input.ebookType === "lead_magnet") {
    if (
      isQuick &&
      (tpl.format === "checklist" || tpl.format === "quick_win_guide")
    ) {
      return {
        points: 30,
        reason:
          "Membantu lead mendapat quick win dan mudah dikonsumsi.",
      };
    }
    if (
      isComplex &&
      (tpl.format === "playbook" || tpl.format === "framework")
    ) {
      return {
        points: 25,
        reason:
          "Cocok jika topik membutuhkan proses yang lebih mendalam.",
      };
    }
    if (tpl.format === "checklist" || tpl.format === "quick_win_guide") {
      return {
        points: 15,
        reason: "Format ringkas cocok untuk lead magnet konversi.",
      };
    }
  }

  if (input.ebookType === "bonus_product") {
    if (
      input.bonusRole === "ready_to_use_assets" &&
      (tpl.format === "workbook" ||
        tpl.format === "checklist" ||
        tpl.format === "resource_guide")
    ) {
      return {
        points: 30,
        reason: "Cocok untuk aset siap pakai dan aksi langsung.",
      };
    }
    if (
      input.bonusRole === "implementation_aid" &&
      tpl.format === "implementation_guide"
    ) {
      return {
        points: 35,
        reason:
          "Dirancang sebagai pendamping implementasi produk utama.",
      };
    }
    if (
      input.bonusRole === "speed_to_result" &&
      (tpl.format === "checklist" || tpl.format === "quick_win_guide")
    ) {
      return {
        points: 25,
        reason: "Mempercepat hasil pembeli dengan langkah ringkas.",
      };
    }
    if (tpl.format === "implementation_guide" || tpl.format === "workbook") {
      return {
        points: 15,
        reason: "Mendukung penggunaan produk utama secara terstruktur.",
      };
    }
  }

  if (input.ebookType === "sellable_ebook") {
    if (
      (input.salesPositioning === "premium_authority" ||
        input.salesPositioning === "core_product") &&
      (tpl.format === "playbook" || tpl.format === "framework")
    ) {
      return {
        points: 30,
        reason: "Memberi kedalaman yang layak untuk produk berbayar.",
      };
    }
    if (tpl.format === "playbook" || tpl.format === "framework") {
      return {
        points: 15,
        reason: "Cocok untuk panduan premium yang mandiri.",
      };
    }
  }

  if (tpl.format === "blank") {
    return { points: 0, reason: "Mulai dari kosong tanpa struktur default." };
  }

  return {
    points: 0,
    reason: "Format kompatibel dengan tujuan ebook Anda.",
  };
}

export function rankTemplates(
  input: TemplateRecommendationInput,
  catalog: Template[] = SYSTEM_TEMPLATES,
): RankedTemplate[] {
  const compatible = catalog.filter((t) =>
    t.supported_ebook_types.includes(input.ebookType),
  );

  const ranked = compatible.map((template) => {
    const base = baseScore(template.format, input.ebookType);
    const { points, reason } = contextBonus(template, input);
    // Stable secondary sort by id
    const score = base + points;
    return { template, score, reason, recommended: false };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.template.id.localeCompare(b.template.id);
  });

  // Top 3 non-blank as recommended (blank can still appear)
  let marked = 0;
  for (const item of ranked) {
    if (item.template.format === "blank") continue;
    if (marked < 3) {
      item.recommended = true;
      marked += 1;
    }
  }

  return ranked;
}

export function recommendTemplates(
  input: TemplateRecommendationInput,
): RankedTemplate[] {
  return rankTemplates(input, getCompatibleTemplates(input.ebookType));
}
