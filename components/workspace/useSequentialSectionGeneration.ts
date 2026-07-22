"use client";

import * as React from "react";
import type { OutlineSection } from "@/types/outline";
import type { Section } from "@/types/section";
import { sectionHasReplaceableContent } from "@/lib/section-revisions";

export type GenerationItemStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "skipped";

export type GenerationQueueItem = {
  outline_section_id: string;
  title: string;
  status: GenerationItemStatus;
  error?: string;
};

export type SequentialGenerationPhase =
  | "idle"
  | "confirm"
  | "running"
  | "paused_on_failure"
  | "stopped"
  | "completed";

export function buildPendingGenerationQueue(opts: {
  outlineSections: OutlineSection[];
  sectionsByOutlineId: Map<string, Section>;
  /** When true, include completed sections (rewrite-all). Default false. */
  includeCompleted?: boolean;
}): GenerationQueueItem[] {
  const items: GenerationQueueItem[] = [];
  for (const os of opts.outlineSections) {
    const existing = opts.sectionsByOutlineId.get(os.id);
    const hasContent = sectionHasReplaceableContent(existing);
    const failed =
      existing?.status === "failed" || os.status === "failed";

    if (!opts.includeCompleted && hasContent && !failed) {
      continue;
    }

    items.push({
      outline_section_id: os.id,
      title: os.title,
      status: "queued",
    });
  }
  return items;
}

export function estimateGenerationCost(
  queueCount: number,
  sectionCost: number,
): number {
  return Math.max(0, queueCount) * Math.max(0, sectionCost);
}

export function useSequentialSectionGeneration(opts: {
  generateOne: (args: {
    outlineSectionId: string;
    confirmReplaceExisting?: boolean;
  }) => Promise<Section>;
  onItemComplete?: (section: Section) => void;
}) {
  const [phase, setPhase] =
    React.useState<SequentialGenerationPhase>("idle");
  const [queue, setQueue] = React.useState<GenerationQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [stopAfterCurrent, setStopAfterCurrent] = React.useState(false);
  const [includeCompleted, setIncludeCompleted] = React.useState(false);

  const stopAfterCurrentRef = React.useRef(false);
  const runningRef = React.useRef(false);
  const generateRef = React.useRef(opts.generateOne);
  const onCompleteRef = React.useRef(opts.onItemComplete);

  React.useEffect(() => {
    generateRef.current = opts.generateOne;
  }, [opts.generateOne]);
  React.useEffect(() => {
    onCompleteRef.current = opts.onItemComplete;
  }, [opts.onItemComplete]);
  React.useEffect(() => {
    stopAfterCurrentRef.current = stopAfterCurrent;
  }, [stopAfterCurrent]);

  const prepare = React.useCallback(
    (args: {
      outlineSections: OutlineSection[];
      sectionsByOutlineId: Map<string, Section>;
      includeCompleted?: boolean;
    }) => {
      const next = buildPendingGenerationQueue({
        outlineSections: args.outlineSections,
        sectionsByOutlineId: args.sectionsByOutlineId,
        includeCompleted: args.includeCompleted === true,
      });
      setIncludeCompleted(args.includeCompleted === true);
      setQueue(next);
      setCurrentIndex(0);
      setStopAfterCurrent(false);
      setPhase(next.length === 0 ? "completed" : "confirm");
      return next;
    },
    [],
  );

  const updateItem = React.useCallback(
    (
      index: number,
      patch: Partial<GenerationQueueItem>,
    ) => {
      setQueue((prev) =>
        prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const runFrom = React.useCallback(
    async (startIndex: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setPhase("running");

      try {
        let i = startIndex;
        while (i < queue.length) {
          setCurrentIndex(i);
          const item = queue[i];
          if (!item || item.status === "done" || item.status === "skipped") {
            i += 1;
            continue;
          }

          updateItem(i, { status: "running", error: undefined });
          try {
            const section = await generateRef.current({
              outlineSectionId: item.outline_section_id,
              confirmReplaceExisting: includeCompleted || undefined,
            });
            updateItem(i, { status: "done" });
            onCompleteRef.current?.(section);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Generate gagal";
            updateItem(i, { status: "failed", error: message });
            setPhase("paused_on_failure");
            runningRef.current = false;
            return;
          }

          if (stopAfterCurrentRef.current) {
            setPhase("stopped");
            runningRef.current = false;
            return;
          }
          i += 1;
        }
        setPhase("completed");
      } finally {
        runningRef.current = false;
      }
    },
    [queue, includeCompleted, updateItem],
  );

  // Keep a live queue snapshot for runFrom via ref to avoid stale loops.
  const queueRef = React.useRef(queue);
  React.useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const start = React.useCallback(async () => {
    if (queueRef.current.length === 0) {
      setPhase("completed");
      return;
    }
    // Use functional runner against latest queue
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setStopAfterCurrent(false);
    stopAfterCurrentRef.current = false;

    let i = 0;
    const total = queueRef.current.length;
    while (i < total) {
      setCurrentIndex(i);
      const snapshot = queueRef.current[i];
      if (!snapshot) break;
      if (snapshot.status === "done" || snapshot.status === "skipped") {
        i += 1;
        continue;
      }
      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? { ...item, status: "running", error: undefined }
            : item,
        ),
      );
      try {
        const section = await generateRef.current({
          outlineSectionId: snapshot.outline_section_id,
          confirmReplaceExisting: includeCompleted || undefined,
        });
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "done" } : item,
          ),
        );
        onCompleteRef.current?.(section);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generate gagal";
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: "failed", error: message }
              : item,
          ),
        );
        setPhase("paused_on_failure");
        runningRef.current = false;
        return;
      }
      if (stopAfterCurrentRef.current) {
        setPhase("stopped");
        runningRef.current = false;
        return;
      }
      i += 1;
    }
    setPhase("completed");
    runningRef.current = false;
  }, [includeCompleted]);

  const retryCurrent = React.useCallback(async () => {
    const idx = currentIndex;
    const item = queueRef.current[idx];
    if (!item) return;
    setQueue((prev) =>
      prev.map((q, i) =>
        i === idx ? { ...q, status: "queued", error: undefined } : q,
      ),
    );
    // Restart from current index
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    let i = idx;
    const total = queueRef.current.length;
    while (i < total) {
      setCurrentIndex(i);
      const snapshot = queueRef.current[i];
      if (!snapshot) break;
      if (snapshot.status === "done" || snapshot.status === "skipped") {
        i += 1;
        continue;
      }
      // Force retry even if previously failed
      setQueue((prev) =>
        prev.map((q, j) =>
          j === i ? { ...q, status: "running", error: undefined } : q,
        ),
      );
      try {
        const section = await generateRef.current({
          outlineSectionId: snapshot.outline_section_id,
          confirmReplaceExisting: includeCompleted || true,
        });
        setQueue((prev) =>
          prev.map((q, j) => (j === i ? { ...q, status: "done" } : q)),
        );
        onCompleteRef.current?.(section);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generate gagal";
        setQueue((prev) =>
          prev.map((q, j) =>
            j === i ? { ...q, status: "failed", error: message } : q,
          ),
        );
        setPhase("paused_on_failure");
        runningRef.current = false;
        return;
      }
      if (stopAfterCurrentRef.current) {
        setPhase("stopped");
        runningRef.current = false;
        return;
      }
      i += 1;
    }
    setPhase("completed");
    runningRef.current = false;
  }, [currentIndex, includeCompleted]);

  const skipAndContinue = React.useCallback(async () => {
    const idx = currentIndex;
    setQueue((prev) =>
      prev.map((q, i) =>
        i === idx ? { ...q, status: "skipped", error: undefined } : q,
      ),
    );
    // Continue after skipped
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    let i = idx + 1;
    const total = queueRef.current.length;
    while (i < total) {
      setCurrentIndex(i);
      const snapshot = queueRef.current[i];
      if (!snapshot) break;
      if (
        snapshot.status === "done" ||
        snapshot.status === "skipped" ||
        // after skip map above, re-read may still be old; treat failed at this idx as skipped already
        false
      ) {
        if (snapshot.status === "done" || snapshot.status === "skipped") {
          i += 1;
          continue;
        }
      }
      setQueue((prev) =>
        prev.map((q, j) =>
          j === i ? { ...q, status: "running", error: undefined } : q,
        ),
      );
      try {
        const live = queueRef.current[i];
        const section = await generateRef.current({
          outlineSectionId: (live ?? snapshot).outline_section_id,
          confirmReplaceExisting: includeCompleted || undefined,
        });
        setQueue((prev) =>
          prev.map((q, j) => (j === i ? { ...q, status: "done" } : q)),
        );
        onCompleteRef.current?.(section);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generate gagal";
        setQueue((prev) =>
          prev.map((q, j) =>
            j === i ? { ...q, status: "failed", error: message } : q,
          ),
        );
        setPhase("paused_on_failure");
        runningRef.current = false;
        return;
      }
      if (stopAfterCurrentRef.current) {
        setPhase("stopped");
        runningRef.current = false;
        return;
      }
      i += 1;
    }
    setPhase("completed");
    runningRef.current = false;
  }, [currentIndex, includeCompleted]);

  const requestStopAfterCurrent = React.useCallback(() => {
    setStopAfterCurrent(true);
    stopAfterCurrentRef.current = true;
  }, []);

  const reset = React.useCallback(() => {
    setPhase("idle");
    setQueue([]);
    setCurrentIndex(0);
    setStopAfterCurrent(false);
    stopAfterCurrentRef.current = false;
    runningRef.current = false;
  }, []);

  const doneCount = queue.filter((q) => q.status === "done").length;
  const failedCount = queue.filter((q) => q.status === "failed").length;

  return {
    phase,
    queue,
    currentIndex,
    stopAfterCurrent,
    includeCompleted,
    doneCount,
    failedCount,
    prepare,
    start,
    retryCurrent,
    skipAndContinue,
    requestStopAfterCurrent,
    reset,
    // exposed for tests
    runFrom,
  };
}
