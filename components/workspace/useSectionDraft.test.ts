/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  saveStateLabel,
  useSectionDraft,
} from "@/components/workspace/useSectionDraft";
import type { Section } from "@/types/section";

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "sec-1",
    project_id: "proj-1",
    outline_section_id: "os-1",
    position: 1,
    title: "Intro",
    content_html: "<p>Hello</p>",
    word_count: 1,
    status: "generated",
    updated_at: "2026-07-23T10:00:00.000Z",
    ...overrides,
  };
}

describe("useSectionDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks dirty and debounces save", async () => {
    const save = vi.fn(async (input) => ({
      title: input.title,
      content_html: input.content_html,
      updated_at: "2026-07-23T10:01:00.000Z",
    }));

    const { result } = renderHook(() =>
      useSectionDraft({
        section: makeSection(),
        debounceMs: 1200,
        save,
      }),
    );

    act(() => {
      result.current.setTitle("Intro edited");
    });
    expect(result.current.saveState).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      title: "Intro edited",
      expected_updated_at: "2026-07-23T10:00:00.000Z",
    });
  });

  it("flushSave saves immediately and reports success", async () => {
    const save = vi.fn(async (input) => ({
      title: input.title,
      content_html: input.content_html,
      updated_at: "2026-07-23T10:02:00.000Z",
    }));
    const { result } = renderHook(() =>
      useSectionDraft({
        section: makeSection(),
        debounceMs: 5000,
        save,
      }),
    );

    act(() => {
      result.current.setContentHtml("<p>Changed</p>");
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.flushSave();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe("saved");
  });

  it("failed save keeps draft and allows retry", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("fail"), { code: "db_error" }))
      .mockResolvedValueOnce({
        title: "Intro",
        content_html: "<p>Retry</p>",
        updated_at: "2026-07-23T10:03:00.000Z",
      });

    const { result } = renderHook(() =>
      useSectionDraft({
        section: makeSection(),
        debounceMs: 100,
        save,
      }),
    );

    act(() => {
      result.current.setContentHtml("<p>Retry</p>");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(result.current.saveState).toBe("error");
    expect(result.current.contentHtml).toBe("<p>Retry</p>");

    await act(async () => {
      await result.current.retrySave();
    });
    expect(result.current.saveState).toBe("saved");
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("maps 409 to conflict state", async () => {
    const save = vi.fn().mockRejectedValue(
      Object.assign(new Error("conflict"), { code: "section_conflict", status: 409 }),
    );
    const { result } = renderHook(() =>
      useSectionDraft({
        section: makeSection(),
        debounceMs: 50,
        save,
      }),
    );
    act(() => {
      result.current.setTitle("X");
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(result.current.saveState).toBe("conflict");
  });

  it("labels save states in Indonesian", () => {
    expect(saveStateLabel("dirty", null)).toBe("Belum tersimpan");
    expect(saveStateLabel("saving", null)).toBe("Menyimpan…");
    expect(saveStateLabel("error", null)).toBe("Gagal menyimpan");
    expect(saveStateLabel("conflict", null)).toBe("Konflik perubahan");
    expect(saveStateLabel("saved", "2026-07-23T14:32:00.000Z")).toMatch(
      /Tersimpan/,
    );
  });
});
