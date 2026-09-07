// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCTA } from "@/components/marketing/FinalCTA";

describe("Marketing Landing Page Micro-Interactions", () => {
  it("renders Hero CTA with group and arrow transition", () => {
    render(<Hero />);
    const ctaButton = screen.getByRole("button", { name: /Mulai gratis/i });
    expect(ctaButton.className).toContain("group");
  });

  it("renders Features cards with hover lift and transition", () => {
    render(<Features />);
    const featureCard = screen.getByText("Chat-to-brief").closest("div[class*='hover:-translate-y-1']");
    expect(featureCard).not.toBeNull();
  });

  it("renders HowItWorks cards with hover lift", () => {
    render(<HowItWorks />);
    const stepCard = screen.getByText("01").closest("div[class*='hover:-translate-y-1']");
    expect(stepCard).not.toBeNull();
  });

  it("renders Pricing cards with hover transitions", () => {
    render(<Pricing />);
    const proCard = screen.getByText("Rp299rb").closest("div[class*='transition-all']");
    expect(proCard).not.toBeNull();
  });

  it("renders FinalCTA with ambient breathing pulse background", () => {
    render(<FinalCTA />);
    const ambientOrb = document.querySelector(".animate-pulse-soft");
    expect(ambientOrb).not.toBeNull();
  });
});
