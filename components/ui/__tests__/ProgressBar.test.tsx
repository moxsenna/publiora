// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  it("meneruskan nama aksesibel ke progressbar", () => {
    render(<ProgressBar value={42} aria-label="Progres pembuatan Proyek Alpha" />);

    expect(screen.getByRole("progressbar", { name: "Progres pembuatan Proyek Alpha" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
  });
});
