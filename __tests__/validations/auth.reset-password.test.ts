import { describe, it, expect } from "vitest";
import { resetPasswordSchema } from "@/lib/validations/auth";

describe("resetPasswordSchema", () => {
  it("rejects password shorter than 8 characters", () => {
    const res = resetPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    });
    expect(res.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const res = resetPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different123",
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid matching passwords", () => {
    const res = resetPasswordSchema.safeParse({
      password: "validPassword123",
      confirmPassword: "validPassword123",
    });
    expect(res.success).toBe(true);
  });
});
