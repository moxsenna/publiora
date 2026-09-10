import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isDisposableEmail,
  hasSubaddressing,
} from "./email-normalize";

describe("email-normalize", () => {
  describe("hasSubaddressing", () => {
    it("detects plus tags", () => {
      expect(hasSubaddressing("bima+free@gmail.com")).toBe(true);
      expect(hasSubaddressing("user+123@outlook.com")).toBe(true);
      expect(hasSubaddressing("user@example.com")).toBe(false);
      expect(hasSubaddressing("bima.pratama@gmail.com")).toBe(false);
    });
  });

  describe("isDisposableEmail", () => {
    it("flags known disposable email domains", () => {
      expect(isDisposableEmail("temp@10minutemail.com")).toBe(true);
      expect(isDisposableEmail("test@mailinator.com")).toBe(true);
      expect(isDisposableEmail("anon@sub.yopmail.com")).toBe(true);
      expect(isDisposableEmail("throw@guerrillamail.com")).toBe(true);
      expect(isDisposableEmail("user@trashmail.com")).toBe(true);
    });

    it("allows standard legitimate email providers", () => {
      expect(isDisposableEmail("bima@gmail.com")).toBe(false);
      expect(isDisposableEmail("user@outlook.com")).toBe(false);
      expect(isDisposableEmail("nara@contoh.id")).toBe(false);
      expect(isDisposableEmail("test@publiora.biz.id")).toBe(false);
      expect(isDisposableEmail("user@company.co.id")).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("strips dots and tags for Gmail", () => {
      expect(normalizeEmail("B.I.M.A@gmail.com")).toBe("bima@gmail.com");
      expect(normalizeEmail("bima.pratama+promo@googlemail.com")).toBe("bimapratama@gmail.com");
      expect(normalizeEmail(" user.name+free@GMAIL.COM ")).toBe("username@gmail.com");
    });

    it("strips tags for Outlook / Hotmail", () => {
      expect(normalizeEmail("user+free@outlook.com")).toBe("user@outlook.com");
      expect(normalizeEmail("test+1@hotmail.com")).toBe("test@hotmail.com");
    });

    it("preserves standard legitimate custom domain emails", () => {
      expect(normalizeEmail("Nara@contoh.id")).toBe("nara@contoh.id");
      expect(normalizeEmail("admin@publiora.biz.id")).toBe("admin@publiora.biz.id");
    });
  });
});
