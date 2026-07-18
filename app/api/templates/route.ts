import { SYSTEM_TEMPLATES } from "@/lib/templates-catalog";

export async function GET() {
  return Response.json(SYSTEM_TEMPLATES);
}
