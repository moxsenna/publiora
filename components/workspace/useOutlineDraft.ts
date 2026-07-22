"use client";

import * as React from "react";
import type { Outline, OutlineSection } from "@/types/outline";

export type OutlineSaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

export type OutlineDraftSaveInput = {
  sections: OutlineSection[];
  expected_updated_at: string;
};

export function normalizePositions(sections: OutlineSection[]): OutlineSection[] {
  return sections.map((s, i) => ({ ...s, position: i + 1 }));
}

export function useOutlineDraft(opts: {
  outline: Outline | null | undefined;
  debounceMs?: number;
  save: (input: OutlineDraftSaveInput) => Promise<Outline>;
}) {
  const { outline, debounceMs = 900, save } = opts;
  const [sections, setSections] = React.useState<OutlineSection[]>(
    outline?.sections ?? [],
  );
  const [sourceUpdatedAt, setSourceUpdatedAt] = React.useState(
    outline?.updated_at ?? "",
  );
  const [saveState, setSaveState] = React.useState<OutlineSaveState>("idle");

  const sectionsRef = React.useRef(sections);
  const sourceRef = React.useRef(sourceUpdatedAt);
  const outlineIdRef = React.useRef(outline?.id ?? null);
  const saveRef = React.useRef(save);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = React.useRef<Promise<boolean> | null>(null);

  React.useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  React.useEffect(() => {
    sourceRef.current = sourceUpdatedAt;
  }, [sourceUpdatedAt]);
  React.useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reload only when outline identity / server version changes and local is clean.
  React.useEffect(() => {
    if (!outline) {
      clearTimer();
      setSections([]);
      setSourceUpdatedAt("");
      setSaveState("idle");
      outlineIdRef.current = null;
      return;
    }
    const identityChanged = outlineIdRef.current !== outline.id;
    const serverNewer =
      sourceRef.current && outline.updated_at !== sourceRef.current;
    if (
      !identityChanged &&
      (saveState === "dirty" ||
        saveState === "saving" ||
        saveState === "error" ||
        saveState === "conflict")
    ) {
      return;
    }
    if (!identityChanged && !serverNewer && sectionsRef.current.length > 0) {
      // Keep local after save success when ids match.
      if (saveState === "saved" || saveState === "idle") {
        // Accept server snapshot after successful save when updated_at advanced.
        if (outline.updated_at === sourceRef.current) return;
      }
    }
    clearTimer();
    setSections(outline.sections.map((s) => ({ ...s })));
    setSourceUpdatedAt(outline.updated_at);
    setSaveState("idle");
    outlineIdRef.current = outline.id;
    sectionsRef.current = outline.sections.map((s) => ({ ...s }));
    sourceRef.current = outline.updated_at;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline?.id, outline?.updated_at]);

  const performSave = React.useCallback(async (): Promise<boolean> => {
    if (!outlineIdRef.current) return true;
    if (inFlightRef.current) return inFlightRef.current;
    const run = (async () => {
      setSaveState("saving");
      try {
        const saved = await saveRef.current({
          sections: normalizePositions(sectionsRef.current),
          expected_updated_at: sourceRef.current,
        });
        setSourceUpdatedAt(saved.updated_at);
        sourceRef.current = saved.updated_at;
        // If local diverged during save, stay dirty.
        const localJson = JSON.stringify(normalizePositions(sectionsRef.current));
        const savedJson = JSON.stringify(normalizePositions(saved.sections));
        if (localJson !== savedJson) {
          setSaveState("dirty");
          return false;
        }
        setSections(saved.sections.map((s) => ({ ...s })));
        sectionsRef.current = saved.sections.map((s) => ({ ...s }));
        setSaveState("saved");
        return true;
      } catch (err) {
        const e = err as { code?: string; status?: number };
        if (e?.code === "outline_conflict" || e?.status === 409) {
          setSaveState("conflict");
        } else {
          setSaveState("error");
        }
        return false;
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = run;
    return run;
  }, []);

  const scheduleSave = React.useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      void performSave();
    }, debounceMs);
  }, [clearTimer, debounceMs, performSave]);

  const replaceSections = React.useCallback(
    (next: OutlineSection[]) => {
      const normalized = normalizePositions(next);
      setSections(normalized);
      sectionsRef.current = normalized;
      setSaveState("dirty");
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateSection = React.useCallback(
    (id: string, patch: Partial<OutlineSection>) => {
      replaceSections(
        sectionsRef.current.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [replaceSections],
  );

  const move = React.useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...sectionsRef.current];
      const j = index + dir;
      if (j < 0 || j >= next.length) return;
      [next[index], next[j]] = [next[j], next[index]];
      replaceSections(next);
    },
    [replaceSections],
  );

  const remove = React.useCallback(
    (id: string) => {
      replaceSections(sectionsRef.current.filter((s) => s.id !== id));
    },
    [replaceSections],
  );

  const add = React.useCallback(() => {
    const ns: OutlineSection = {
      id: "new_" + Math.random().toString(36).slice(2, 8),
      position: sectionsRef.current.length + 1,
      title: "Section baru",
      summary: "",
      key_points: [],
      estimated_words: 600,
      status: "pending",
    };
    replaceSections([...sectionsRef.current, ns]);
  }, [replaceSections]);

  const flushSave = React.useCallback(async () => {
    clearTimer();
    if (saveState === "idle" || saveState === "saved") return true;
    if (saveState === "conflict") return false;
    return performSave();
  }, [clearTimer, performSave, saveState]);

  const retrySave = React.useCallback(async () => {
    clearTimer();
    return performSave();
  }, [clearTimer, performSave]);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    sections,
    sourceUpdatedAt,
    saveState,
    updateSection,
    move,
    remove,
    add,
    replaceSections,
    flushSave,
    retrySave,
  };
}

export function outlineSaveStateLabel(state: OutlineSaveState): string {
  switch (state) {
    case "dirty":
      return "Belum tersimpan";
    case "saving":
      return "Menyimpan…";
    case "saved":
      return "Tersimpan";
    case "error":
      return "Gagal menyimpan";
    case "conflict":
      return "Konflik perubahan";
    default:
      return "";
  }
}
