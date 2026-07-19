import { describe, expect, it } from "vitest";
import { canRegenerateOutline } from "./outline-regeneration";

describe("canRegenerateOutline", () => {
  it("allows create when no outline exists", () => {
    const result = canRegenerateOutline({
      hasOutline: false,
      hasWrittenContent: false,
      confirmReset: false,
    });
    expect(result).toEqual({ allowed: true, mode: "create" });
  });

  it("allows free regenerate when outline exists but no written content", () => {
    const result = canRegenerateOutline({
      hasOutline: true,
      hasWrittenContent: false,
      confirmReset: false,
    });
    expect(result).toEqual({ allowed: true, mode: "free_regenerate" });
  });

  it("blocks regenerate when written content exists without confirm", () => {
    const result = canRegenerateOutline({
      hasOutline: true,
      hasWrittenContent: true,
      confirmReset: false,
    });
    expect(result).toEqual({
      allowed: false,
      code: "outline_regenerate_blocked",
      mode: "blocked",
    });
  });

  it("allows confirmed reset when written content exists and confirmReset true", () => {
    const result = canRegenerateOutline({
      hasOutline: true,
      hasWrittenContent: true,
      confirmReset: true,
    });
    expect(result).toEqual({ allowed: true, mode: "confirmed_reset" });
  });

  it("ignores confirmReset when no written content (still free regenerate)", () => {
    const result = canRegenerateOutline({
      hasOutline: true,
      hasWrittenContent: false,
      confirmReset: true,
    });
    expect(result).toEqual({ allowed: true, mode: "free_regenerate" });
  });
});
