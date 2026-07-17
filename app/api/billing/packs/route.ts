import { CREDIT_PACKS } from "@/lib/billing/plans";

export async function GET() {
  return Response.json(CREDIT_PACKS);
}
