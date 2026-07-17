import { BILLING_PLANS } from "@/lib/billing/plans";

export async function GET() {
  return Response.json(BILLING_PLANS);
}
