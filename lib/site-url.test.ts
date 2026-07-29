import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("uses localhost during development when URL is unset", () => {
    expect(resolveSiteUrl(undefined, "development").href).toBe("http://localhost:3000/");
  });

  it("uses canonical production URL when URL is unset", () => {
    expect(resolveSiteUrl(undefined, "production").href).toBe("https://publiora.appvibe.biz.id/");
  });

  it.each(["http://localhost:4000", "https://example.com/path"])(
    "accepts configured HTTP(S) URL %s",
    (configuredUrl) => {
      expect(resolveSiteUrl(configuredUrl, "production").href).toBe(new URL(configuredUrl).href);
    },
  );

  it.each(["not a url", "ftp://example.com", "javascript:alert(1)"])(
    "rejects malformed or unsupported configured URL %s",
    (configuredUrl) => {
      expect(() => resolveSiteUrl(configuredUrl, "production")).toThrow("Invalid NEXT_PUBLIC_SITE_URL");
    },
  );
});
