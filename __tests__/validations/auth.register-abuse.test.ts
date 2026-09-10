import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

describe("registerSchema anti-abuse rules", () => {
  it("rejects plus subaddressing (+tag) in email", () => {
    const result = registerSchema.safeParse({
      name: "Bima Pratama",
      email: "bima+free@gmail.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("alias email (+)");
    }
  });

  it("rejects disposable email services", () => {
    const disposableEmails = [
      "user@10minutemail.com",
      "test@temp-mail.org",
      "target@mailinator.com",
      "anon@yopmail.com",
      "bot@guerrillamail.biz",
    ];

    for (const email of disposableEmails) {
      const result = registerSchema.safeParse({
        name: "Test User",
        email,
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Email sementara");
      }
    }
  });

  it("accepts valid personal and business email addresses", () => {
    const validEmails = [
      "bima@gmail.com",
      "user@outlook.com",
      "nara@contoh.id",
      "founder@startup.co.id",
    ];

    for (const email of validEmails) {
      const result = registerSchema.safeParse({
        name: "Test User",
        email,
        password: "password123",
      });
      expect(result.success).toBe(true);
    }
  });
});
