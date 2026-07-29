// @vitest-environment jsdom
import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hero } from "./Hero";
import { Pricing } from "./Pricing";
import { FinalCTA } from "./FinalCTA";
import { marketingId } from "@/lib/i18n/id/marketing";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(cleanup);

function expectLinkWithoutButton(name: string | RegExp) {
  const link = screen.getByRole("link", { name });
  expect(link).toHaveClass("min-h-11");
  expect(link.querySelector("button")).toBeNull();
}

describe("marketing CTA semantics", () => {
  it("renders Hero CTA links as single interactive elements", () => {
    render(<Hero />);
    expectLinkWithoutButton(marketingId.hero.primaryCta);
    expectLinkWithoutButton(marketingId.hero.secondaryCta);
  });

  it("renders every Pricing CTA as a link without nested buttons", () => {
    render(<Pricing />);
    for (const name of ["Mulai gratis", "Pilih Creator", "Pilih Pro"]) {
      expectLinkWithoutButton(name);
    }
  });

  it("renders FinalCTA action as one link", () => {
    render(<FinalCTA />);
    expectLinkWithoutButton(marketingId.finalCta.action);
  });
});

describe("marketing pricing facts", () => {
  it("keeps credit costs and top-up route in typed consumer copy", () => {
    expect(marketingId.pricing.creditCosts).toEqual([
      "Outline menggunakan 5 kredit.",
      "Setiap bagian menggunakan 10 kredit.",
      "Judul atau CTA menggunakan 2 kredit.",
    ]);
    expect(marketingId.pricing.topUp).toMatch(/tambah kredit.*Tagihan/i);
  });
});
