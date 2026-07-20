import {
  SYSTEM_TEMPLATES,
  getCompatibleTemplates,
} from "@/lib/templates-catalog";
import { jsonError } from "@/lib/api/errors";
import type { EbookType } from "@/types/project";

const VALID_TYPES = new Set<EbookType>([
  "lead_magnet",
  "bonus_product",
  "sellable_ebook",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ebookType = url.searchParams.get("ebook_type");

  if (!ebookType) {
    return Response.json(SYSTEM_TEMPLATES);
  }

  if (!VALID_TYPES.has(ebookType as EbookType)) {
    return jsonError(
      "Invalid ebook_type. Must be lead_magnet, bonus_product, or sellable_ebook.",
      400,
      "validation_error",
    );
  }

  return Response.json(getCompatibleTemplates(ebookType as EbookType));
}
