import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUTH_COOKIE_DOMAIN,
  getBrowserAuthCookieOptions,
  getServerAuthCookieOptions,
  normalizeAuthCookieOptions,
  resolveAuthCookieDomain,
} from "./cookie-options";

const saved: Record<string, string | undefined> = {};

function saveEnv(key: string) {
  saved[key] = process.env[key];
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(saved)) delete saved[key];
  vi.unstubAllEnvs();
});

describe("resolveAuthCookieDomain", () => {
  it("defaults production to the parent domain", () => {
    expect(resolveAuthCookieDomain("production", undefined)).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
  });

  it("omits the domain outside production unless configured", () => {
    expect(resolveAuthCookieDomain("development", undefined)).toBeNull();
    expect(resolveAuthCookieDomain("test", undefined)).toBeNull();
  });

  it("prefers explicit env configuration over production fallback", () => {
    saveEnv("AUTH_COOKIE_DOMAIN");
    process.env.AUTH_COOKIE_DOMAIN = ".example.com";
    expect(resolveAuthCookieDomain("development", undefined)).toBe(".example.com");
    expect(resolveAuthCookieDomain("production", undefined)).toBe(".example.com");
  });

  it("reads NEXT_PUBLIC_AUTH_COOKIE_DOMAIN on the browser/server path", () => {
    saveEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN");
    process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN = ".publiora.test";
    expect(resolveAuthCookieDomain("development", undefined)).toBe(".publiora.test");
  });
});

describe("normalizeAuthCookieOptions", () => {
  it("preserves attributes and adds the parent domain", () => {
    const options = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60,
    };
    expect(normalizeAuthCookieOptions(options, ".publiora.biz.id")).toEqual({
      ...options,
      domain: ".publiora.biz.id",
    });
  });

  it("is a no-op without a domain", () => {
    const options = { path: "/", secure: true };
    expect(normalizeAuthCookieOptions(options, null)).toEqual(options);
    expect(normalizeAuthCookieOptions(undefined, null)).toEqual({});
  });
});

describe("browser/server option helpers", () => {
  it("getBrowserAuthCookieOptions returns domain only when shared", () => {
    expect(getBrowserAuthCookieOptions(".publiora.biz.id")).toEqual({
      domain: ".publiora.biz.id",
    });
    expect(getBrowserAuthCookieOptions(null)).toEqual({});
  });

  it("getServerAuthCookieOptions returns domain only when shared", () => {
    expect(getServerAuthCookieOptions(".publiora.biz.id")).toEqual({
      domain: ".publiora.biz.id",
    });
    expect(getServerAuthCookieOptions(null)).toEqual({});
  });
});