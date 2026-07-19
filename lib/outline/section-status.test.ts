import { describe, expect, it } from "vitest";
import {
  accumulateGeneratedStatuses,
  setOutlineSectionStatus,
} from "./section-status";
import type { OutlineSection } from "@/types/outline";

function sec(
  id: string,
  status: OutlineSection["status"] = "pending",
): OutlineSection {
  return {
    id,
    position: 1,
    title: id,
    summary: "",
    key_points: ["a", "b"],
    estimated_words: 500,
    status,
  };
}

describe("outline section status accumulation", () => {
  it("keeps earlier generated when later sections update", () => {
    const initial = [sec("a"), sec("b"), sec("c")];
    const after = accumulateGeneratedStatuses(initial, ["a", "b"]);
    expect(after.find((s) => s.id === "a")?.status).toBe("generated");
    expect(after.find((s) => s.id === "b")?.status).toBe("generated");
    expect(after.find((s) => s.id === "c")?.status).toBe("pending");
  });

  it("setOutlineSectionStatus does not mutate input", () => {
    const initial = [sec("a"), sec("b")];
    const next = setOutlineSectionStatus(initial, "a", "failed");
    expect(initial[0].status).toBe("pending");
    expect(next[0].status).toBe("failed");
  });

  it("can mark generating then failed without losing others", () => {
    let sections = [sec("a", "generated"), sec("b"), sec("c")];
    sections = setOutlineSectionStatus(sections, "b", "generating");
    sections = setOutlineSectionStatus(sections, "b", "failed");
    expect(sections.find((s) => s.id === "a")?.status).toBe("generated");
    expect(sections.find((s) => s.id === "b")?.status).toBe("failed");
  });
});
