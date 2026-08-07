import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAppUrl,
  buildClaimUrl,
  buildDomainUrl,
  buildMarketingUrl,
  buildProjectPreviewUrl,
  buildPublishedReaderUrl,
  buildReaderUrl,
  resolveDomainUrl,
} from "./urls";

const ENV_KEYS = {
  marketing: "NEXT_PUBLIC_MARKETING_URL",
  app: "NEXT_PUBLIC_APP_URL",
  reader: "NEXT_PUBLIC_READER_URL",
} as const;

const saved: Record<string, string | undefined> = {};

function setEnv(domain: keyof typeof ENV_KEYS, value: string) {
  const key = ENV_KEYS[domain];
  saved[key] = process.env[key];
  process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  for (const key of Object.keys(saved)) delete saved[key];
});

describe("resolveDomainUrl", () => {
  it("uses canonical domains when envs are unset in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(resolveDomainUrl("marketing")).toBe("https://publiora.biz.id");
      expect(resolveDomainUrl("app")).toBe("https://app.publiora.biz.id");
      expect(resolveDomainUrl("reader")).toBe("https://baca.publiora.biz.id");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("falls back to localhost outside production", () => {
    expect(resolveDomainUrl("marketing")).toBe("http://localhost:3000");
    expect(resolveDomainUrl("reader")).toBe("http://localhost:3000");
  });

  it("strips trailing slashes from configured URLs", () => {
    setEnv("reader", "https://baca.publiora.biz.id//");
    expect(resolveDomainUrl("reader")).toBe("https://baca.publiora.biz.id");
  });

  it("rejects invalid configured URLs", () => {
    setEnv("app", "not a url");
    expect(() => resolveDomainUrl("app")).toThrow(/Invalid/);
    setEnv("app", "ftp://app.publiora.biz.id");
    expect(() => resolveDomainUrl("app")).toThrow(/Invalid/);
  });
});

describe("buildDomainUrl", () => {
  it("returns root without trailing slash", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(buildAppUrl()).toBe("https://app.publiora.biz.id");
    expect(buildAppUrl("/")).toBe("https://app.publiora.biz.id");
    expect(buildAppUrl("")).toBe("https://app.publiora.biz.id");
  });

  it("normalizes leading slashes", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(buildAppUrl("/dashboard")).toBe("https://app.publiora.biz.id/dashboard");
    expect(buildAppUrl("dashboard")).toBe("https://app.publiora.biz.id/dashboard");
  });

  it("preserves query and hash", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(buildAppUrl("/projects?tab=claims&create=1")).toBe(
      "https://app.publiora.biz.id/projects?tab=claims&create=1",
    );
  });

  it("encodes token and slug segments", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(buildClaimUrl("ABC 123/x?y=z")).toBe(
      "https://baca.publiora.biz.id/claim/ABC%20123%2Fx%3Fy%3Dz",
    );
    expect(buildPublishedReaderUrl("my title/ä")).toBe(
      "https://baca.publiora.biz.id/read/my%20title%2F%C3%A4",
    );
  });

  it("builds preview URLs on the app domain", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(buildProjectPreviewUrl("proj-1")).toBe(
      "https://app.publiora.biz.id/projects/proj-1/preview",
    );
  });

  it("rejects absolute cross-origin paths", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(() => buildReaderUrl("https://evil.example.com/phish")).toThrow(
      /Cross-origin path rejected/,
    );
    expect(() => buildMarketingUrl("//evil.example.com")).toThrow(/Cross-origin path rejected/);
  });

  it("rejects backslash smuggling", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(() => buildReaderUrl("/\\evil.example.com\\phish")).toThrow(/Unsafe path rejected/);
  });

  it("rejects whitespace in paths", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(() => buildReaderUrl("/claim/ABC 123")).toThrow(/whitespace/);
  });

  it("keeps encoded double-slash inside a relative path on its own origin", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    const url = buildReaderUrl("/%2F%2Fevil.example.com");
    expect(url.startsWith("https://baca.publiora.biz.id/")).toBe(true);
  });
});

it("exposes all canonical helpers", () => {
  expect(typeof buildDomainUrl).toBe("function");
  expect(typeof buildAppUrl).toBe("function");
  expect(typeof buildReaderUrl).toBe("function");
  expect(typeof buildMarketingUrl).toBe("function");
  expect(typeof buildClaimUrl).toBe("function");
  expect(typeof buildPublishedReaderUrl).toBe("function");
  expect(typeof buildProjectPreviewUrl).toBe("function");
});