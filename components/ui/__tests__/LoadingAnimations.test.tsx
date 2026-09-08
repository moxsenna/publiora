// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { AiLoadingAnimation } from "@/components/ui/AiLoadingAnimation";
import { GlobalLoading } from "@/components/ui/GlobalLoading";

describe("AiLoadingAnimation Component", () => {
  it("renders with role status and title for writing variant", () => {
    render(
      <AiLoadingAnimation
        variant="writing"
        title="AI Sedang Menulis Section"
        subtitle="Bab 1: Pengantar"
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("AI Sedang Menulis Section")).toBeInTheDocument();
    expect(screen.getByText("Bab 1: Pengantar")).toBeInTheDocument();
  });

  it("renders with outline variant and custom steps", () => {
    const customSteps = ["Langkah 1", "Langkah 2"];
    render(
      <AiLoadingAnimation
        variant="outline"
        steps={customSteps}
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("AI Sedang Menyusun Outline")).toBeInTheDocument();
    expect(screen.getByText("Langkah 1")).toBeInTheDocument();
  });
});

describe("GlobalLoading Component", () => {
  it("renders with role status and default label", () => {
    render(<GlobalLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Memuat Publiora…")).toBeInTheDocument();
  });

  it("renders with custom label and description", () => {
    render(
      <GlobalLoading
        label="Menyiapkan data…"
        description="Harap tunggu beberapa saat"
      />
    );
    expect(screen.getByText("Menyiapkan data…")).toBeInTheDocument();
    expect(screen.getByText("Harap tunggu beberapa saat")).toBeInTheDocument();
  });
});
