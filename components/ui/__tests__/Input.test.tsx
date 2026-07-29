// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/Input";

describe("Input", () => {
  it("preserves existing exports and direct ARIA attributes", () => {
    render(<><Label htmlFor="email">Email</Label><Input id="email" aria-invalid aria-describedby="email-error" /><Textarea aria-label="Bio" /></>);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByRole("textbox", { name: "Bio" })).toBeTruthy();
  });

  it("links field error and hint to control", () => {
    render(
      <Field error="Email wajib diisi" hint="Gunakan email aktif">
        {({ controlProps, errorProps, hintProps }) => <>
          <Label htmlFor="email">Email</Label>
          <Input id="email" {...controlProps} />
          <FieldHint {...hintProps} />
          <FieldError {...errorProps} />
        </>}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("hint");
    expect(input.getAttribute("aria-describedby")).toContain("error");
    expect(screen.getByText("Email wajib diisi").getAttribute("id")).toContain("error");
  });
});
