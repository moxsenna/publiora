// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

// ---------------------------------------------------------------------------
// Mocks -- hoisted by vitest before imports
// ---------------------------------------------------------------------------

const pushToastMock = vi.fn();
const patchMutateAsyncMock = vi.fn();

vi.mock("@/store/projectStore", () => ({
  useUiStore: vi.fn((selector?: (s: any) => any) => {
    const state = { pushToast: pushToastMock };
    return selector ? selector(state) : state;
  }),
  useProjectStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      activeProjectId: "proj-1",
      setActiveProject: vi.fn(),
      selectedSectionId: null,
      setSelectedSectionId: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/api/hooks", () => ({
  usePatchStrategy: () => ({
    mutateAsync: patchMutateAsyncMock,
    isPending: false,
  }),
}));

// Use actual strategy-copy so labels are real
vi.mock("@/lib/workflow/strategy-copy", () => {
  const actual = vi.importActual("@/lib/workflow/strategy-copy");
  return actual;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { EbookStrategy } from "@/types/strategy";

function makeStrategy(overrides: Partial<EbookStrategy> = {}): EbookStrategy {
  return {
    topic: "Test Topic",
    audience: "Test Audience",
    audience_sophistication: null,
    primary_problem: null,
    pain_points: [],
    desired_outcome: null,
    core_promise: null,
    unique_angle: null,
    content_pillars: [],
    product_or_offer: null,
    funnel_goal: null,
    cta_goal: null,
    tone: null,
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { StrategyFieldEditor } from "@/components/workspace/StrategyFieldEditor";

function renderEditor(props: {
  open?: boolean;
  projectId?: string;
  strategy?: EbookStrategy;
  initialField?: keyof EbookStrategy | null;
}) {
  const onClose = vi.fn();
  const utils = render(
    <StrategyFieldEditor
      open={props.open ?? true}
      onClose={onClose}
      projectId={props.projectId ?? "proj-1"}
      strategy={props.strategy ?? makeStrategy()}
      initialField={props.initialField ?? null}
    />,
  );
  return { ...utils, onClose };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: patch resolve successfully
  patchMutateAsyncMock.mockResolvedValue({ state: {}, readiness_score: 50 });
});

// ---------------------------------------------------------------------------
// 1. Group headings
// ---------------------------------------------------------------------------

describe("group headings", () => {
  it("renders all 5 Indonesian section headings", () => {
    renderEditor({});

    expect(screen.getByText("Fondasi ebook")).toBeInTheDocument();
    expect(screen.getByText("Audiens dan masalah")).toBeInTheDocument();
    expect(screen.getByText("Positioning")).toBeInTheDocument();
    expect(screen.getByText("Funnel dan penawaran")).toBeInTheDocument();
    expect(screen.getByText("Gaya penulisan")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Array field placeholder
// ---------------------------------------------------------------------------

describe("array field placeholder", () => {
  it("displays one-item-per-line placeholder for array fields", () => {
    renderEditor({
      strategy: makeStrategy({ pain_points: [], content_pillars: [] }),
    });

    // pain_points textarea
    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    expect(painTextarea).toHaveAttribute("placeholder", "Satu item per baris");

    // content_pillars textarea
    const pillarsTextarea = screen.getByLabelText("Pilar konten");
    expect(pillarsTextarea).toHaveAttribute("placeholder", "Satu item per baris");
  });

  it("no longer uses comma-separated placeholder", () => {
    renderEditor({
      strategy: makeStrategy({ pain_points: [], content_pillars: [] }),
    });

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    expect(painTextarea).not.toHaveAttribute(
      "placeholder",
      expect.stringContaining("koma"),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Form loads array with one-item-per-line
// ---------------------------------------------------------------------------

describe("form loading from strategy", () => {
  it("loads pain_points array as newline-separated text in textarea", () => {
    renderEditor({
      strategy: makeStrategy({ pain_points: ["a", "b"] }),
    });

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    expect(painTextarea).toHaveValue("a\nb");
  });

  it("loads empty array as empty string", () => {
    renderEditor({
      strategy: makeStrategy({ pain_points: [] }),
    });

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    expect(painTextarea).toHaveValue("");
  });

  it("loads scalar fields with their string values", () => {
    renderEditor({
      strategy: makeStrategy({ topic: "My Topic", audience: "My Audience" }),
    });

    expect(screen.getByLabelText("Topik ebook")).toHaveValue("My Topic");
    expect(screen.getByLabelText("Target pembaca")).toHaveValue("My Audience");
  });
});

// ---------------------------------------------------------------------------
// 4. Save splits array by newline
// ---------------------------------------------------------------------------

describe("save splits array by newline", () => {
  it("sends pain_points as array split by newline", async () => {
    const user = userEvent.setup();
    renderEditor({});

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    await user.clear(painTextarea);
    await user.type(painTextarea, "a\nb\nc");

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      strategy_patch: expect.objectContaining({
        pain_points: ["a", "b", "c"],
      }),
    });
  });

  it("sends content_pillars as array split by newline", async () => {
    const user = userEvent.setup();
    renderEditor({});

    const pillarsTextarea = screen.getByLabelText("Pilar konten");
    await user.clear(pillarsTextarea);
    await user.type(pillarsTextarea, "pillar1\npillar2");

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      strategy_patch: expect.objectContaining({
        content_pillars: ["pillar1", "pillar2"],
      }),
    });
  });

  it("trims whitespace and filters empty lines", async () => {
    const user = userEvent.setup();
    renderEditor({});

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    await user.clear(painTextarea);
    // Trailing spaces, blank line, leading spaces
    await user.type(painTextarea, "  a  \n\n  b  \n");

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      strategy_patch: expect.objectContaining({
        pain_points: ["a", "b"],
      }),
    });
  });

  it("sends empty array for empty textarea", async () => {
    const user = userEvent.setup();
    renderEditor({
      strategy: makeStrategy({ pain_points: ["old", "items"] }),
    });

    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    await user.clear(painTextarea);

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      strategy_patch: expect.objectContaining({
        pain_points: [],
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Save button text
// ---------------------------------------------------------------------------

describe("save button", () => {
  it("shows 'Simpan perubahan' as save button text", () => {
    renderEditor({});
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeInTheDocument();
  });

  it("shows 'Batal' as cancel button text", () => {
    renderEditor({});
    expect(screen.getByRole("button", { name: "Batal" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Save success / error toasts
// ---------------------------------------------------------------------------

describe("save toasts", () => {
  it("shows success toast and calls onClose on successful save", async () => {
    patchMutateAsyncMock.mockResolvedValue({ state: {}, readiness_score: 90 });
    const user = userEvent.setup();
    const { onClose } = renderEditor({});

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(pushToastMock).toHaveBeenCalledWith({
        title: "Informasi strategi berhasil disimpan.",
        variant: "success",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error toast on save failure", async () => {
    patchMutateAsyncMock.mockRejectedValue(new Error("Server error"));
    const user = userEvent.setup();
    const { onClose } = renderEditor({});

    const saveBtn = screen.getByRole("button", { name: "Simpan perubahan" });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(pushToastMock).toHaveBeenCalledWith({
        title: "Gagal menyimpan informasi strategi.",
        variant: "danger",
      });
    });
    // onClose should NOT be called on error
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. initialField focus
// ---------------------------------------------------------------------------

describe("initialField focus", () => {
  it("focuses the input matching initialField after open", async () => {
    renderEditor({ initialField: "primary_problem" });

    await waitFor(() => {
      const el = document.getElementById("strat-field-primary_problem");
      expect(el).toBe(document.activeElement);
    });
  });

  it("focuses an array field when initialField is an array key", async () => {
    renderEditor({
      strategy: makeStrategy({ pain_points: ["a", "b"] }),
      initialField: "pain_points",
    });

    await waitFor(() => {
      const el = document.getElementById("strat-field-pain_points");
      expect(el).toBe(document.activeElement);
    });
  });

  it("does not focus any field when initialField is null", async () => {
    const { container } = renderEditor({ initialField: null });

    // No element should be focused within the dialog
    const activeEl = container.ownerDocument.activeElement;
    // The focused element should not be a strategy field
    expect(activeEl?.id).not.toContain("strat-field-");
  });

  it("does not focus when editor is not open", () => {
    render(
      <StrategyFieldEditor
        open={false}
        onClose={vi.fn()}
        projectId="proj-1"
        strategy={makeStrategy()}
        initialField="topic"
      />,
    );

    // No strat-field should be in the DOM when modal is closed
    expect(document.getElementById("strat-field-topic")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. All fields are rendered
// ---------------------------------------------------------------------------

describe("field rendering", () => {
  it("renders all 13 fields with their Indonesian labels", () => {
    renderEditor({});

    const expectedLabels = [
      "Topik ebook",
      "Target pembaca",
      "Tingkat pemahaman audiens",
      "Masalah utama",
      "Titik masalah pembaca",
      "Hasil yang diinginkan",
      "Janji utama ebook",
      "Sudut unik",
      "Pilar konten",
      "Produk atau penawaran",
      "Tujuan funnel",
      "Tujuan CTA",
      "Gaya bahasa",
    ];

    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses Textarea for array fields and Input for scalar fields", () => {
    renderEditor({});

    // Array fields should be textareas
    const painTextarea = screen.getByLabelText("Titik masalah pembaca");
    expect(painTextarea.tagName).toBe("TEXTAREA");

    const pillarsTextarea = screen.getByLabelText("Pilar konten");
    expect(pillarsTextarea.tagName).toBe("TEXTAREA");

    // Scalar field should be inputs
    const topicInput = screen.getByLabelText("Topik ebook");
    expect(topicInput.tagName).toBe("INPUT");
  });
});

// ---------------------------------------------------------------------------
// 9. Modal title and description
// ---------------------------------------------------------------------------

describe("modal meta", () => {
  it("shows Indonesian title and description", () => {
    renderEditor({});

    expect(screen.getByText("Edit Informasi Strategi")).toBeInTheDocument();
    expect(
      screen.getByText("Lengkapi detail yang menentukan strategi ebook Anda."),
    ).toBeInTheDocument();
  });
});
