// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClaimStatusPill, ExportStatusPill, ProjectStatusPill } from "@/components/ui/StatusPill";

describe("StatusPill", () => {
  it("renders Indonesian project, claim, and export labels", () => {
    render(
      <>
        <ProjectStatusPill status="outline_draft" />
        <ClaimStatusPill status="revoked" />
        <ExportStatusPill status="processing" />
      </>,
    );

    expect(screen.getByText("Draf outline")).toBeTruthy();
    expect(screen.getByText("Dicabut")).toBeTruthy();
    expect(screen.getByText("Diproses")).toBeTruthy();
  });

  it("does not expose raw unknown boundary status", () => {
    render(<ProjectStatusPill status={"provider_state" as never} />);
    expect(screen.getByText("Status tidak diketahui")).toBeTruthy();
    expect(screen.queryByText("provider_state")).toBeNull();
  });
});
