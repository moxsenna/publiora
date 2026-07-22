/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  normalizePositions,
  outlineSaveStateLabel,
  useOutlineDraft,
} from "@/components/workspace/useOutlineDraft";
import type { Outline, OutlineSection } from "@/types/outline";

function section(id: string, title: string, position: number): OutlineSection {
  return {
    id,
    position,
    title,
    summary: "summary text for section",
    key_points: ["point a", "point b"],
    estimated_words: 500,
    status: "pending",
  };
}

function outline(sections: OutlineSection[]): Outline {
  return {
    id: "ol1",
    project_id: "p1",
    title: "T",
    description: "D",
    sections,
    approved: false,
    approved_at: null,
    created_at: "2026-07-23T00:00:00.000Z",
    updated_at: "2026-07-23T10:00:00.000Z",
  };
}

describe("useOutlineDraft", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("normalizes positions", () => {
    const next = normalizePositions([
      section("a", "A", 9),
      section("b", "B", 3),
    ]);
    expect(next.map((s) => s.position)).toEqual([1, 2]);
  });

  it("debounces save on edit", async () => {
    const save = vi.fn(async (input) =>
      outline(
        input.sections.map((s: OutlineSection, i: number) => ({
          ...s,
          position: i + 1,
        })),
      ),
    );
    // bump updated_at on save
    save.mockImplementation(async (input) => ({
      ...outline(input.sections),
      updated_at: "2026-07-23T10:01:00.000Z",
    }));

    const { result } = renderHook(() =>
      useOutlineDraft({
        outline: outline([section("a", "A", 1), section("b", "B", 2)]),
        debounceMs: 900,
        save,
      }),
    );

    act(() => {
      result.current.updateSection("a", { title: "A edited" });
    });
    expect(result.current.saveState).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(900);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flushSave consolidates writes", async () => {
    const save = vi.fn(async (input) => ({
      ...outline(input.sections),
      updated_at: "2026-07-23T10:02:00.000Z",
    }));
    const { result } = renderHook(() =>
      useOutlineDraft({
        outline: outline([section("a", "A", 1)]),
        debounceMs: 5000,
        save,
      }),
    );
    act(() => {
      result.current.updateSection("a", { title: "New" });
      result.current.add();
    });
    let ok = false;
    await act(async () => {
      ok = await result.current.flushSave();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.sections.length).toBe(2);
  });

  it("labels save states", () => {
    expect(outlineSaveStateLabel("dirty")).toBe("Belum tersimpan");
    expect(outlineSaveStateLabel("saving")).toBe("Menyimpan…");
  });
});
