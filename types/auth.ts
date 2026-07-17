import type { PlanId } from "./billing";

export type Plan = PlanId;

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  plan: PlanId;
  created_at: string;
  updated_at: string;
}
