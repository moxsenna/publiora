import { afterEach, describe, expect, it } from "vitest";
import {
  detectHostKind,
  isHostBoundaryEnforcementEnabled,
  isSharedAuthRoute,
  resolveHostBoundary,
  zoneOf,
} from "./hosts";

const ENV_KEYS = {
  app: "NEXT_PUBLIC_APP_URL",
  reader: "NEXT_PUBLIC_READER_URL",
} as const;

const saved: Record<string, string | undefined> = {};

function setEnv(domain: "app" | "reader", value: string) {
  const key = ENV_KEYS[domain];
  saved[key] = process.env[key];
  process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(saved)) delete saved[key];
});

function resolve(
  host: string | undefined,
  pathname: string,
  search = "",
  enabled = true,
): string | null {
  return resolveHostBoundary(host, pathname, search, enabled);
}

describe("detectHostKind", () => {
  it("classifies canonical hosts including ports", () => {
    expect(detectHostKind("publiora.biz.id")).toBe("marketing");
    expect(detectHostKind("www.publiora.biz.id")).toBe("marketing");
    expect(detectHostKind("app.publiora.biz.id")).toBe("app");
    expect(detectHostKind("baca.publiora.biz.id")).toBe("reader");
    expect(detectHostKind("baca.publiora.biz.id:443")).toBe("reader");
    expect(detectHostKind("read.publiora.biz.id")).toBe("reader");
    expect(detectHostKind("read.publiora.biz.id:443")).toBe("reader");
  });

  it("classifies subdomains of the parent domain", () => {
    expect(detectHostKind("preview.app.publiora.biz.id")).toBe("app");
    expect(detectHostKind("preview.read.publiora.biz.id")).toBe("reader");
    expect(detectHostKind("preview.baca.publiora.biz.id")).toBe("reader");
  });

  it("returns unknown for dev, unrelated, and arbitrary subdomains", () => {
    expect(detectHostKind("localhost:3000")).toBe("unknown");
    expect(detectHostKind("example.com")).toBe("unknown");
    expect(detectHostKind("unknown.publiora.biz.id")).toBe("unknown");
    expect(detectHostKind(undefined)).toBe("unknown");
  });
});

describe("zoneOf", () => {
  it("maps reader routes to reader", () => {
    expect(zoneOf("/claim/ABC123")).toBe("reader");
    expect(zoneOf("/read/some-slug")).toBe("reader");
    expect(zoneOf("/library")).toBe("reader");
  });

  it("maps creator routes to app", () => {
    expect(zoneOf("/dashboard")).toBe("app");
    expect(zoneOf("/projects/123/preview")).toBe("app");
    expect(zoneOf("/offers")).toBe("app");
    expect(zoneOf("/published")).toBe("app");
    expect(zoneOf("/settings/billing")).toBe("app");
  });

  it("maps marketing and shared auth routes to null/marketing", () => {
    expect(zoneOf("/")).toBeNull();
    expect(zoneOf("/privacy")).toBe("marketing");
    expect(isSharedAuthRoute("/login")).toBe(true);
    expect(isSharedAuthRoute("/register")).toBe(true);
    expect(isSharedAuthRoute("/auth/start")).toBe(true);
    expect(isSharedAuthRoute("/dashboard")).toBe(false);
  });
});

describe("resolveHostBoundary", () => {
  it("app /claim redirects to reader", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(resolve("app.publiora.biz.id", "/claim/ABC123")).toBe(
      "https://baca.publiora.biz.id/claim/ABC123",
    );
  });

  it("app /read redirects to reader", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    expect(resolve("app.publiora.biz.id", "/read/my-book")).toBe(
      "https://baca.publiora.biz.id/read/my-book",
    );
    expect(resolve("app.publiora.biz.id", "/read/my-book?p=50")).toBe(
      "https://baca.publiora.biz.id/read/my-book?p=50",
    );
  });

  it("reader /projects redirects to app", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(resolve("baca.publiora.biz.id", "/projects/123")).toBe(
      "https://app.publiora.biz.id/projects/123",
    );
  });

  it("landing /dashboard redirects to app", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(resolve("publiora.biz.id", "/dashboard")).toBe(
      "https://app.publiora.biz.id/dashboard",
    );
  });

  it("shared auth routes stay on app or reader hosts", () => {
    expect(resolve("app.publiora.biz.id", "/login")).toBeNull();
    expect(resolve("baca.publiora.biz.id", "/register")).toBeNull();
  });

  it("marketing /auth/start stays on marketing", () => {
    expect(resolve("publiora.biz.id", "/auth/start?source=landing_page")).toBeNull();
  });

  it("plain login/register on marketing go to app", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(resolve("publiora.biz.id", "/login")).toBe("https://app.publiora.biz.id/login");
  });

  it("already-correct requests do not redirect", () => {
    expect(resolve("app.publiora.biz.id", "/dashboard")).toBeNull();
    expect(resolve("baca.publiora.biz.id", "/read/abc")).toBeNull();
    expect(resolve("read.publiora.biz.id", "/read/abc")).toBeNull();
    expect(resolve("read.publiora.biz.id", "/library")).toBeNull();
    expect(resolve("read.publiora.biz.id", "/claim/ABC123")).toBeNull();
    expect(resolve("publiora.biz.id", "/")).toBeNull();
  });

  it("unknown hosts never redirect even when enabled", () => {
    expect(resolve("localhost:3000", "/claim/ABC")).toBeNull();
    expect(resolve("preview.example.vercel.app", "/dashboard")).toBeNull();
  });

  it("disabled enforcement never redirects", () => {
    setEnv("app", "https://app.publiora.biz.id");
    expect(resolve("baca.publiora.biz.id", "/projects/1", "", false)).toBeNull();
    expect(resolveHostBoundary("baca.publiora.biz.id", "/projects/1", "", false)).toBeNull();
  });

  it("canonical host redirects never point back at the same host", () => {
    setEnv("reader", "https://baca.publiora.biz.id");
    const target = resolve("app.publiora.biz.id", "/read/x");
    expect(target).toContain("//baca.publiora.biz.id/");
    expect(target).not.toContain("app.publiora.biz.id");
  });
});

describe("isHostBoundaryEnforcementEnabled", () => {
  it("production defaults to enabled", () => {
    expect(isHostBoundaryEnforcementEnabled("production", undefined)).toBe(true);
    expect(isHostBoundaryEnforcementEnabled("development", undefined)).toBe(false);
  });

  it("explicit flag overrides node env", () => {
    expect(isHostBoundaryEnforcementEnabled("development", "true")).toBe(true);
    expect(isHostBoundaryEnforcementEnabled("production", "false")).toBe(false);
  });
});