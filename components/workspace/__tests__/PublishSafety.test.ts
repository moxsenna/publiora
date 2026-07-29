import { describe, expect, it } from "vitest";
import {
  getPublishBlockerCopy,
  getPublishCheckCopy,
} from "@/lib/i18n/id/publish";

describe("safe Indonesian publish copy", () => {
  it("maps stable blocker and check codes without exposing raw server copy", () => {
    expect(getPublishBlockerCopy("title_empty")).toContain("Judul");
    expect(getPublishCheckCopy("cta_url_invalid")).toContain("URL CTA");
  });

  it("uses safe fallbacks for unknown codes", () => {
    const raw = "provider secret raw blocker";
    expect(getPublishBlockerCopy("unknown_code")).not.toContain(raw);
    expect(getPublishCheckCopy("unknown_code")).not.toContain(raw);
    expect(getPublishBlockerCopy("unknown_code")).toBe("Persyaratan penerbitan belum lengkap.");
    expect(getPublishCheckCopy("unknown_code")).toBe("Periksa kembali kesiapan ebook sebelum menerbitkan.");
  });
});
