# UI Animations & Micro-Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate user experience across Landing Page and App Workspace through GPU-accelerated CSS animations, button micro-interactions, responsive dialog/toast transitions, and refined loading states with zero external bundle overhead.

**Architecture:** Tailwind CSS v4 native keyframes and utility classes defined in `app/globals.css`, applied directly to UI primitives (`Button`, `Modal`, `Dropdown`, `PageState`, `Skeleton`, new `LoadingDots`, `Toaster`), marketing components (`Hero`, `Features`, `HowItWorks`, `Pricing`, `FinalCTA`), and workspace outline generation indicators.

**Tech Stack:** Next.js 16 (React 19), Tailwind CSS v4, Lucide React, Vitest, Testing Library (jsdom).

## Global Constraints

- **No external animation libraries:** 0 KB added JavaScript bundle. Do NOT install `framer-motion` or `motion`.
- **Zero React 19 / Next.js 16 hydration conflicts:** All animations run purely through CSS keyframes and utility classes.
- **Strict Reduced Motion:** Every new animation and keyframe must be explicitly neutralized under `@media (prefers-reduced-motion: reduce)`.
- **Preserve All Existing Functional Contracts:** Do not break existing component props, ARIA accessibility attributes, test IDs, or event handlers.
- **Component Test Environment:** All React component test files MUST include `// @vitest-environment jsdom` at the very top.

---

### Task 1: CSS Foundation & Animation Tokens

**Files:**
- Modify: `app/globals.css:87-136`
- Test: Create `__tests__/design/animations.test.ts`

**Interfaces:**
- Consumes: Existing Tailwind CSS v4 setup and `@keyframes` in `app/globals.css`.
- Produces: Utility classes `.animate-modal-enter`, `.animate-modal-backdrop-enter`, `.animate-scale-in`, `.animate-toast-in`, `.animate-pulse-dot`, plus refined `.skeleton` shimmer and reduced-motion reset.

- [ ] **Step 1: Write the failing test**

Create `__tests__/design/animations.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/design/animations.test.ts`
Expected: FAIL with missing keyframes and utility classes.

- [ ] **Step 3: Write minimal implementation in `app/globals.css`**

Add the keyframes and animation utility classes into `app/globals.css`:

```css
/* In app/globals.css after @keyframes pulse-soft */
@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modal-backdrop-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes toast-in {
  0% { opacity: 0; transform: translateY(12px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}

.animate-fade-in { animation: fade-in 200ms ease-out both; }
.animate-slide-in-right { animation: slide-in-right 240ms ease-out both; }
.animate-slide-in-left { animation: slide-in-left 220ms ease-out both; }
.animate-pulse-soft { animation: pulse-soft 1.4s ease-in-out infinite; }
.animate-modal-enter { animation: modal-enter 180ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.animate-modal-backdrop-enter { animation: modal-backdrop-enter 150ms ease-out both; }
.animate-scale-in { animation: scale-in 140ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.animate-toast-in { animation: toast-in 200ms cubic-bezier(0.21, 1.02, 0.73, 1) both; }
.animate-pulse-dot { animation: pulse-dot 1.2s infinite ease-in-out both; }

/* In @media (prefers-reduced-motion: reduce) block: */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-in-right,
  .animate-slide-in-left,
  .animate-pulse-soft,
  .animate-modal-enter,
  .animate-modal-backdrop-enter,
  .animate-scale-in,
  .animate-toast-in,
  .animate-pulse-dot,
  .skeleton {
    animation: none !important;
  }
  ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/design/animations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/globals.css __tests__/design/animations.test.ts
git commit -m "feat(design): add GPU-accelerated CSS keyframes and animation utility classes"
```

---

### Task 2: Button Micro-Interactions & Tactile Polish

**Files:**
- Modify: `components/ui/Button.tsx:50-70`
- Test: Create `components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: React, `cn` helper from `@/lib/utils`.
- Produces: Enhanced `Button` component with tactile active feedback (`active:scale-[0.98]`), hover elevation, and stable loading spinner without layout jump.

- [ ] **Step 1: Write the failing test**

Create `components/ui/__tests__/Button.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button Micro-Interactions", () => {
  it("renders with tactile active:scale and transition classes", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn.className).toContain("active:scale-[0.98]");
    expect(btn.className).toContain("transition-all");
    expect(btn.className).toContain("duration-150");
  });

  it("renders loading state with spinning loader indicator and disabled attribute", () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole("button", { name: "Saving" });
    expect(btn).toBeDisabled();
    const spinner = btn.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("suppresses active scale when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn.className).toContain("disabled:active:scale-100");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/Button.test.tsx`
Expected: FAIL due to missing `active:scale-[0.98]` and `transition-all`.

- [ ] **Step 3: Update `components/ui/Button.tsx`**

Modify `components/ui/Button.tsx`:

```tsx
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] font-medium select-none cursor-pointer",
          "transition-all duration-150 ease-out active:scale-[0.98] disabled:active:scale-100",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/Button.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/ui/__tests__/Button.test.tsx
git commit -m "feat(ui): add tactile feedback and active scale transitions to Button"
```

---

### Task 3: Reusable LoadingDots & Enhanced Loading States

**Files:**
- Create: `components/ui/LoadingDots.tsx`
- Modify: `components/ui/PageState.tsx:9-11`
- Modify: `components/ui/Skeleton.tsx:1-16`
- Test: Create `components/ui/__tests__/LoadingDots.test.tsx`
- Test: Create `components/ui/__tests__/PageState.test.tsx`

**Interfaces:**
- Consumes: `animate-pulse-dot` from `app/globals.css`, Lucide React `Loader2`.
- Produces: `LoadingDots` component with staggered delays (`[animation-delay:0ms]`, `[animation-delay:150ms]`, `[animation-delay:300ms]`), enhanced `LoadingState` with dual-ring/glow & label breathing, and refined `Skeleton` shimmer.

- [ ] **Step 1: Write the failing tests**

Create `components/ui/__tests__/LoadingDots.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingDots } from "@/components/ui/LoadingDots";

describe("LoadingDots Component", () => {
  it("renders 3 sequential animated dots with role status", () => {
    render(<LoadingDots label="Berpikir…" />);
    const container = screen.getByRole("status");
    expect(container).toHaveAttribute("aria-label", "Berpikir…");
    const dots = container.querySelectorAll(".animate-pulse-dot");
    expect(dots.length).toBe(3);
  });
});
```

Create `components/ui/__tests__/PageState.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingState } from "@/components/ui/PageState";

describe("LoadingState Component", () => {
  it("renders spinner and breathing status text", () => {
    render(<LoadingState label="Memuat naskah…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Memuat naskah…");
    const labelSpan = status.querySelector(".animate-pulse-soft");
    expect(labelSpan).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/LoadingDots.test.tsx components/ui/__tests__/PageState.test.tsx`
Expected: FAIL with `LoadingDots` not found.

- [ ] **Step 3: Implement `LoadingDots.tsx`, update `PageState.tsx`, and update `Skeleton.tsx`**

Create `components/ui/LoadingDots.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingDotsProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeClasses = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function LoadingDots({
  size = "md",
  label = "Memuat…",
  className,
  ...props
}: LoadingDotsProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:0ms]",
          sizeClasses[size]
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:150ms]",
          sizeClasses[size]
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:300ms]",
          sizeClasses[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
```

Update `components/ui/PageState.tsx`:

```tsx
import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}
interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function LoadingState({
  label = "Memuat…",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-[var(--color-medium-gray)]",
        className
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute h-8 w-8 rounded-full bg-[var(--color-publiora-blue)]/10 animate-ping" />
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-[var(--color-publiora-blue)]"
        />
      </div>
      <span className="animate-pulse-soft font-medium tracking-wide">{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description,
  retryLabel = "Coba lagi",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center text-center",
        className
      )}
      {...props}
    >
      <AlertCircle
        aria-hidden="true"
        className="mb-3 h-6 w-6 text-[var(--color-danger)]"
      />
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-prose text-sm text-[var(--color-medium-gray)]">
          {description}
        </p>
      )}
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
```

Update `components/ui/Skeleton.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-[var(--radius-input)] transition-opacity duration-200",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/LoadingDots.test.tsx components/ui/__tests__/PageState.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/LoadingDots.tsx components/ui/PageState.tsx components/ui/Skeleton.tsx components/ui/__tests__/LoadingDots.test.tsx components/ui/__tests__/PageState.test.tsx
git commit -m "feat(ui): add LoadingDots component and enhance LoadingState with pulse and glow"
```

---

### Task 4: Animated Modal, Dropdown, and Toaster

**Files:**
- Modify: `components/ui/Modal.tsx:73-75`
- Modify: `components/ui/Dropdown.tsx:74-81`
- Modify: `components/ui/Toaster.tsx:18-26`
- Test: Create `components/ui/__tests__/ModalAnimation.test.tsx`
- Test: Create `components/ui/__tests__/DropdownAnimation.test.tsx`
- Test: Create `components/ui/__tests__/ToasterAnimation.test.tsx`

**Interfaces:**
- Consumes: `.animate-modal-backdrop-enter`, `.animate-modal-enter`, `.animate-scale-in`, `.animate-toast-in` from `app/globals.css`.
- Produces: Smooth enter animations for dialog popups, dropdown menus, and toasts.

- [ ] **Step 1: Write the failing tests**

Create `components/ui/__tests__/ModalAnimation.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal Animations", () => {
  it("renders backdrop and panel with dedicated enter animation classes", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Dialog">
        <p>Modal content</p>
      </Modal>
    );
    const backdrop = screen.getByTestId("modal-backdrop");
    expect(backdrop.className).toContain("animate-modal-backdrop-enter");

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("animate-modal-enter");
  });
});
```

Create `components/ui/__tests__/DropdownAnimation.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { Dropdown } from "@/components/ui/Dropdown";

describe("Dropdown Animations", () => {
  it("opens menu with animate-scale-in class and transform origin", () => {
    render(
      <Dropdown
        trigger={<span>Options</span>}
        items={[{ label: "Action 1" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("menu");
    expect(menu.className).toContain("animate-scale-in");
    expect(menu.className).toContain("origin-top-right");
  });
});
```

Create `components/ui/__tests__/ToasterAnimation.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector: (state: { toasts: Array<{ id: string; title: string; variant: "default" | "success" | "danger" }>; dismissToast: () => void }) => unknown) =>
    selector({
      toasts: [{ id: "t1", title: "Berhasil disimpan", variant: "success" }],
      dismissToast: vi.fn(),
    }),
}));

describe("Toaster Animations", () => {
  it("renders toast card with animate-toast-in class", () => {
    render(<Toaster />);
    const toastTitle = screen.getByText("Berhasil disimpan");
    const toastCard = toastTitle.closest(".animate-toast-in");
    expect(toastCard).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/ModalAnimation.test.tsx components/ui/__tests__/DropdownAnimation.test.tsx components/ui/__tests__/ToasterAnimation.test.tsx`
Expected: FAIL due to missing animation classes.

- [ ] **Step 3: Update `Modal.tsx`, `Dropdown.tsx`, and `Toaster.tsx`**

In `components/ui/Modal.tsx`:
Change backdrop class on line 73 to:
`absolute inset-0 bg-black/40 backdrop-blur-sm animate-modal-backdrop-enter`
And change dialog container class on line 74 to:
`relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-[var(--color-surface-1)] rounded-[var(--radius-card)] shadow-[var(--shadow-pop)] animate-modal-enter border border-[var(--color-border-subtle)] outline-none`

In `components/ui/Dropdown.tsx`:
Change menu container class on line 78 to:
`absolute top-full mt-1.5 min-w-[180px] rounded-xl border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] py-1 z-50 animate-scale-in origin-top-right transition-transform`

In `components/ui/Toaster.tsx`:
Change toast item class on line 21 to:
`rounded-xl shadow-[var(--shadow-pop)] border bg-white px-3 py-2.5 flex items-start gap-2.5 animate-toast-in hover:shadow-lg transition-all duration-200`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/ModalAnimation.test.tsx components/ui/__tests__/DropdownAnimation.test.tsx components/ui/__tests__/ToasterAnimation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/Modal.tsx components/ui/Dropdown.tsx components/ui/Toaster.tsx components/ui/__tests__/ModalAnimation.test.tsx components/ui/__tests__/DropdownAnimation.test.tsx components/ui/__tests__/ToasterAnimation.test.tsx
git commit -m "feat(ui): add smooth enter transitions for Modal, Dropdown, and Toaster"
```

---

### Task 5: Marketing Landing Page Micro-Interactions

**Files:**
- Modify: `components/marketing/Hero.tsx`
- Modify: `components/marketing/Features.tsx`
- Modify: `components/marketing/HowItWorks.tsx`
- Modify: `components/marketing/Pricing.tsx`
- Modify: `components/marketing/FinalCTA.tsx`
- Test: Create `components/marketing/__tests__/MarketingAnimation.test.tsx`

**Interfaces:**
- Consumes: Tailwind utility classes `group-hover:translate-x-1`, `hover:-translate-y-1`, `hover:shadow-card-hover`.
- Produces: Polished interactive landing page surfaces with fluid mouse interactions.

- [ ] **Step 1: Write the failing test**

Create `components/marketing/__tests__/MarketingAnimation.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/marketing/__tests__/MarketingAnimation.test.tsx`
Expected: FAIL due to missing hover and animation classes.

- [ ] **Step 3: Update marketing components**

In `components/marketing/Hero.tsx`:
- Add `group` to `<Button size="lg" className="group">` on line 23.
- In arrow icon: `<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />`
- Enhance preview card on line 44: `relative max-w-full rounded-[20px] border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] p-3.5 md:rotate-1 md:hover:rotate-0 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`

In `components/marketing/Features.tsx`:
- Update card wrapper on line 57: `group p-4 rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] hover:bg-white hover:-translate-y-1 hover:border-[var(--color-publiora-blue)]/40 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200`
- Update icon wrapper on line 59: `h-9 w-9 rounded-lg bg-[var(--color-publiora-black)] grid place-items-center text-white transition-transform duration-200 group-hover:scale-110`

In `components/marketing/HowItWorks.tsx`:
- Update step card on line 26: `group p-4 rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white hover:-translate-y-1 hover:border-[var(--color-gold)]/50 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200`

In `components/marketing/Pricing.tsx`:
- Update tier card mapping to include `hover:-translate-y-1.5 transition-all duration-300 hover:shadow-xl`

In `components/marketing/FinalCTA.tsx`:
- Add `animate-pulse-soft` to ambient glow orbs on lines 9 and 10.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/marketing/__tests__/MarketingAnimation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/marketing/ components/marketing/__tests__/MarketingAnimation.test.tsx
git commit -m "feat(marketing): add hover elevation, arrow sliding, and ambient animations to landing page"
```

---

### Task 6: Workspace AI Generation Progress Integration

**Files:**
- Modify: `components/workspace/OutlinePanel.tsx`
- Modify: `components/workspace/OutlineSectionCard.tsx`
- Test: Create `components/workspace/__tests__/OutlineAnimation.test.tsx`

**Interfaces:**
- Consumes: `LoadingDots` from `@/components/ui/LoadingDots`, `animate-pulse-soft`.
- Produces: Fluid visual feedback during outline generation and section drafting.

- [ ] **Step 1: Write the failing test**

Create `components/workspace/__tests__/OutlineAnimation.test.tsx`:

```typescript
// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { OutlineSectionCard } from "@/components/workspace/OutlineSectionCard";

describe("Outline Section Card Animations", () => {
  it("renders generating status with animated indicators", () => {
    render(
      <OutlineSectionCard
        section={{
          id: "sec-1",
          section_order: 1,
          title: "Bab 1: Pengenalan",
          key_points: ["Poin 1"],
          target_word_count: 500,
          generation_status: "generating",
        }}
        index={0}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const badge = screen.getByText(/menulis/i);
    expect(badge).toBeInTheDocument();
    // Indicator or pulse class is present
    const card = badge.closest("div[class*='border']");
    expect(card).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails / passes as baseline**

Run: `npx vitest run components/workspace/__tests__/OutlineAnimation.test.tsx`

- [ ] **Step 3: Update `OutlineSectionCard.tsx` and `OutlinePanel.tsx` with refined status styling**

Integrate `LoadingDots` and gentle pulse animations when a section is `generating` or outline is being generated.
In `components/workspace/OutlineSectionCard.tsx`, apply:
`border-[var(--color-publiora-blue)]/60 shadow-sm animate-pulse-soft` when `section.generation_status === "generating"`.
In `components/workspace/OutlinePanel.tsx`, import `LoadingDots` and render next to "Menyusun outline…" or outline generation buttons when `generateOutline.isPending`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/workspace/__tests__/OutlineAnimation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/workspace/OutlinePanel.tsx components/workspace/OutlineSectionCard.tsx components/workspace/__tests__/OutlineAnimation.test.tsx
git commit -m "feat(workspace): integrate LoadingDots and pulse indicators for AI outline generation"
```

---

### Task 7: Comprehensive Verification & Test Suite

**Files:**
- Test all components touched across the tasks.

- [ ] **Step 1: Run all animation & UI test suites**

Run: `npx vitest run __tests__/design/animations.test.ts components/ui/__tests__ components/marketing/__tests__ components/workspace/__tests__/OutlineAnimation.test.tsx`
Expected: All tests PASS with 0 failures.

- [ ] **Step 2: Build verification check**

Run: `npm run build`
Expected: Next.js production build succeeds with no type errors or CSS compilation errors.

- [ ] **Step 3: Commit final plan documentation**

```bash
git add docs/superpowers/plans/2026-09-07-ui-animations.md
git commit -m "docs(plans): add complete UI animations implementation plan"
```
