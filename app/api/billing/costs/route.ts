import { CREDIT_COSTS } from "@/lib/billing/plans";

export async function GET() {
  return Response.json(CREDIT_COSTS);
}
