"use client";

import * as React from "react";
import type { Section } from "@/types/section";

export type SaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

export type SectionDraftSaveInput = {
  title: string;
  content_html: string;
  expected_updated_at: string;
};

export type SectionDraftSaveResult = {
  title: string;
  content_html: string;
  updated_at: string;
};

export type SectionDraftSaveError = Error & {
  code?: string;
  status?: number;
};

export interface UseSectionDraftOptions {
  section: Section | null;
  /** Debounce delay in ms (default 1200). */
  debounceMs?: number;
  save: (input: SectionDraftSaveInput) => Promise<SectionDraftSaveResult>;
  onSaveStateChange?: (state: SaveState) => void;
}

export interface UseSectionDraftResult {
  title: string;
  contentHtml: string;
  sourceUpdatedAt: string;
  saveState: SaveState;
  lastSavedAt: string | null;
  isDirty: boolean;
  setTitle: (title: string) => void;
  setContentHtml: (html: string) => void;
  flushSave: () => Promise<boolean>;
  discardDraft: () => void;
  resetFromServer: (section: Section) => void;
  retrySave: () => Promise<boolean>;
}

function isConflictError(err: unknown): boolean {
  const e = err as SectionDraftSaveError;
  return e?.code === "section_conflict" || e?.status === 409;
}

export function useSectionDraft(
  options: UseSectionDraftOptions,
): UseSectionDraftResult {
  const { section, debounceMs = 1200, save, onSaveStateChange } = options;
  const sectionId = section?.id ?? null;

  const [title, setTitleState] = React.useState(section?.title ?? "");
  const [contentHtml, setContentState] = React.useState(
    section?.content_html ?? "",
  );
  const [sourceUpdatedAt, setSourceUpdatedAt] = React.useState(
    section?.updated_at ?? "",
  );
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);

  const saveStateRef = React.useRef(saveState);
  const titleRef = React.useRef(title);
  const contentRef = React.useRef(contentHtml);
  const sourceRef = React.useRef(sourceUpdatedAt);
  const sectionIdRef = React.useRef(sectionId);
  const saveRef = React.useRef(save);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = React.useRef<Promise<boolean> | null>(null);

  React.useEffect(() => {
    saveStateRef.current = saveState;
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

  React.useEffect(() => {
    titleRef.current = title;
  }, [title]);
  React.useEffect(() => {
    contentRef.current = contentHtml;
  }, [contentHtml]);
  React.useEffect(() => {
    sourceRef.current = sourceUpdatedAt;
  }, [sourceUpdatedAt]);
  React.useEffect(() => {
    sectionIdRef.current = sectionId;
  }, [sectionId]);
  React.useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetFromServer = React.useCallback((next: Section) => {
    clearTimer();
    setTitleState(next.title);
    setContentState(next.content_html);
    setSourceUpdatedAt(next.updated_at);
    setSaveState("idle");
    titleRef.current = next.title;
    contentRef.current = next.content_html;
    sourceRef.current = next.updated_at;
  }, [clearTimer]);

  // Load when active section identity changes (id only — avoid parent re-render clobber).
  React.useEffect(() => {
    clearTimer();
    if (!section) {
      setTitleState("");
      setContentState("");
      setSourceUpdatedAt("");
      setSaveState("idle");
      sectionIdRef.current = null;
      sourceRef.current = "";
      return;
    }
    setTitleState(section.title);
    setContentState(section.content_html);
    setSourceUpdatedAt(section.updated_at);
    setSaveState("idle");
    titleRef.current = section.title;
    contentRef.current = section.content_html;
    sourceRef.current = section.updated_at;
    sectionIdRef.current = section.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to section identity
  }, [section?.id]);

  const performSave = React.useCallback(async (): Promise<boolean> => {
    if (!sectionIdRef.current) return true;
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setSaveState("saving");
      try {
        const result = await saveRef.current({
          title: titleRef.current,
          content_html: contentRef.current,
          expected_updated_at: sourceRef.current,
        });
        // If user edited during save, stay dirty.
        const stillDirty =
          titleRef.current !== result.title ||
          contentRef.current !== result.content_html;
        setSourceUpdatedAt(result.updated_at);
        sourceRef.current = result.updated_at;
        setLastSavedAt(new Date().toISOString());
        if (stillDirty) {
          setSaveState("dirty");
          return false;
        }
        setSaveState("saved");
        return true;
      } catch (err) {
        if (isConflictError(err)) {
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

  const setTitle = React.useCallback(
    (next: string) => {
      setTitleState(next);
      titleRef.current = next;
      setSaveState("dirty");
      scheduleSave();
    },
    [scheduleSave],
  );

  const setContentHtml = React.useCallback(
    (next: string) => {
      setContentState(next);
      contentRef.current = next;
      setSaveState("dirty");
      scheduleSave();
    },
    [scheduleSave],
  );

  const flushSave = React.useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (
      saveStateRef.current === "idle" ||
      saveStateRef.current === "saved"
    ) {
      return true;
    }
    if (saveStateRef.current === "conflict") return false;
    return performSave();
  }, [clearTimer, performSave]);

  const discardDraft = React.useCallback(() => {
    if (!section) return;
    resetFromServer(section);
  }, [section, resetFromServer]);

  const retrySave = React.useCallback(async () => {
    clearTimer();
    return performSave();
  }, [clearTimer, performSave]);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  const isDirty =
    saveState === "dirty" ||
    saveState === "saving" ||
    saveState === "error" ||
    saveState === "conflict";

  return {
    title,
    contentHtml,
    sourceUpdatedAt,
    saveState,
    lastSavedAt,
    isDirty,
    setTitle,
    setContentHtml,
    flushSave,
    discardDraft,
    resetFromServer,
    retrySave,
  };
}

export function saveStateLabel(
  state: SaveState,
  lastSavedAt: string | null,
): string {
  switch (state) {
    case "dirty":
      return "Belum tersimpan";
    case "saving":
      return "Menyimpan…";
    case "saved": {
      if (!lastSavedAt) return "Tersimpan";
      try {
        const d = new Date(lastSavedAt);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `Tersimpan ${hh}:${mm}`;
      } catch {
        return "Tersimpan";
      }
    }
    case "error":
      return "Gagal menyimpan";
    case "conflict":
      return "Konflik perubahan";
    default:
      return "";
  }
}
