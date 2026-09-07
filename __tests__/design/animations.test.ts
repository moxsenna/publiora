import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("CSS Foundation & Animation Tokens", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("defines all required keyframes in app/globals.css", () => {
    expect(cssContent).toContain("@keyframes modal-enter");
    expect(cssContent).toContain("@keyframes modal-backdrop-enter");
    expect(cssContent).toContain("@keyframes scale-in");
    expect(cssContent).toContain("@keyframes toast-in");
    expect(cssContent).toContain("@keyframes pulse-dot");
  });

  it("exports corresponding utility animation classes", () => {
    expect(cssContent).toContain(".animate-modal-enter");
    expect(cssContent).toContain(".animate-modal-backdrop-enter");
    expect(cssContent).toContain(".animate-scale-in");
    expect(cssContent).toContain(".animate-toast-in");
    expect(cssContent).toContain(".animate-pulse-dot");
  });

  it("disables all new animations in prefers-reduced-motion media query", () => {
    const reducedMotionBlock = cssContent.split("@media (prefers-reduced-motion: reduce)")[1];
    expect(reducedMotionBlock).toBeDefined();
    expect(reducedMotionBlock).toContain(".animate-modal-enter");
    expect(reducedMotionBlock).toContain(".animate-modal-backdrop-enter");
    expect(reducedMotionBlock).toContain(".animate-scale-in");
    expect(reducedMotionBlock).toContain(".animate-toast-in");
    expect(reducedMotionBlock).toContain(".animate-pulse-dot");
  });
});
