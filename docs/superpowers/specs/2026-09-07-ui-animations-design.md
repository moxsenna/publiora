# Publiora UI Animations & Micro-Interactions — Design Spec

Date: 2026-09-07  
Status: Approved for planning (pending user review of this file)

## 1. Goal

Elevate the user experience and perceived polish across Publiora Landing Page (LP) and App Workspace through lightweight, GPU-accelerated CSS animations, tactile button micro-interactions, responsive dialog/toast transitions, and refined loading/AI-thinking states.

## 2. Decisions Locked

| Decision | Choice | Rationale |
|---|---|---|
| Technology Stack | **Pure Tailwind CSS v4 + Native CSS Keyframes** | 0 KB added JavaScript bundle, zero React 19 hydration issues, native 60fps GPU acceleration. |
| External Motion Library | **None (No Framer Motion/Motion)** | Avoid unnecessary bundle size and SSR hydration edge cases; existing UI primitives are well-suited for CSS transitions. |
| Accessibility | **Strict `prefers-reduced-motion: reduce`** | Instantly neutralizes all keyframes, transitions, and transforms for users with motion sensitivity. |
| Scope | **Landing Page + App UI Primitives + AI Loading States** | Unified visual feedback from public marketing to interactive workspace. |

## 3. Foundation & Tokens (`app/globals.css`)

### 3.1 New CSS Keyframes
- `@keyframes modal-enter`:
  - `0%`: `opacity: 0; transform: scale(0.96) translateY(8px);`
  - `100%`: `opacity: 1; transform: scale(1) translateY(0);`
  - Timing: `180ms cubic-bezier(0.16, 1, 0.3, 1)`
- `@keyframes modal-backdrop-enter`:
  - `0%`: `opacity: 0;`
  - `100%`: `opacity: 1;`
  - Timing: `150ms ease-out`
- `@keyframes scale-in`:
  - `0%`: `opacity: 0; transform: scale(0.95);`
  - `100%`: `opacity: 1; transform: scale(1);`
  - Timing: `140ms cubic-bezier(0.16, 1, 0.3, 1)`
- `@keyframes toast-in`:
  - `0%`: `opacity: 0; transform: translateY(12px) scale(0.98);`
  - `100%`: `opacity: 1; transform: translateY(0) scale(1);`
  - Timing: `200ms cubic-bezier(0.21, 1.02, 0.73, 1)`
- `@keyframes pulse-dot`:
  - `0%, 80%, 100%`: `opacity: 0.25; transform: scale(0.85);`
  - `40%`: `opacity: 1; transform: scale(1.1);`
  - Timing: `1.2s infinite ease-in-out`
- Refined `@keyframes shimmer`:
  - Gradient sweep with smoother interpolation for skeleton loaders.

### 3.2 Utility Classes
- `.animate-modal-enter`
- `.animate-modal-backdrop-enter`
- `.animate-scale-in`
- `.animate-toast-in`
- `.animate-pulse-dot`

### 3.3 Reduced Motion Invariants
All new utility classes and keyframes are automatically disabled under `@media (prefers-reduced-motion: reduce)` with `animation: none !important` and `transition-duration: 0.01ms !important`.

## 4. UI Primitives (`components/ui/`)

### 4.1 Button (`components/ui/Button.tsx`)
- **Tactile feedback:** `active:scale-[0.98] transition-all duration-150 ease-out`.
- **Hover refinement:** Subtle shadow elevation `hover:shadow-sm` or `hover:shadow-md` based on variant.
- **Loading state:**
  - Spinner: smooth rotating ring with clean layout preservation.
  - Disabled / loading buttons suppress `active:scale` to avoid accidental feel of action trigger.

### 4.2 Modal (`components/ui/Modal.tsx`)
- Backdrop: applies `animate-modal-backdrop-enter` with `backdrop-blur-sm`.
- Dialog container: applies `animate-modal-enter` with `will-change-transform`.

### 4.3 Dropdown (`components/ui/Dropdown.tsx`)
- Menu surface: applies `animate-scale-in` with dynamic transform-origin (`origin-top-right` or `origin-top-left`).

### 4.4 Loading & Skeleton States (`components/ui/PageState.tsx`, `components/ui/Skeleton.tsx`, `components/ui/LoadingDots.tsx`)
- **`LoadingState` (`PageState.tsx`):**
  - Spinner icon enhanced with dual-color track + breathing label text (`animate-pulse-soft`).
- **`Skeleton` (`Skeleton.tsx`):**
  - Optimized shimmer gradient against canvas colors (`#EFEFEC` to `#FAFAF8`).
- **New `LoadingDots` component (`components/ui/LoadingDots.tsx`):**
  - Three dot indicators with staggered animation delays (`0ms`, `150ms`, `300ms`).
  - Used for AI thinking banners, inline chat status, and generation progress.

### 4.5 Toaster (`components/ui/Toaster.tsx`)
- Toast notifications appear with `animate-toast-in`.
- Smooth hover elevation and exit dismissal transition.

## 5. Landing Page Animations (`components/marketing/`)

### 5.1 Hero (`components/marketing/Hero.tsx`)
- Pill badge: subtle aura pulse and icon micro-interaction.
- Primary CTA button: `group` styling with sliding arrow (`group-hover:translate-x-1 transition-transform duration-200`).
- Mockup card: 3D perspective subtle lift on hover (`hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-all duration-300`).

### 5.2 Features (`components/marketing/Features.tsx`)
- Grid cards: `hover:-translate-y-1 hover:border-[var(--color-publiora-blue)]/30 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200`.
- Feature icon badge: pops on card hover (`group-hover:scale-105 transition-transform duration-200`).

### 5.3 HowItWorks & Pricing (`components/marketing/HowItWorks.tsx`, `components/marketing/Pricing.tsx`)
- Step markers: hover highlight and transition.
- Pricing cards: prominent "Pro" tier highlights with elevation lift on hover.

### 5.4 FinalCTA (`components/marketing/FinalCTA.tsx`)
- Ambient background glow breathing pulse.

## 6. Workspace & AI Interaction States

- **AI Strategist / Planner / Writer Generation:**
  - AI thinking banners and outline loaders adopt `LoadingDots` and synchronized breathing animations.
- **Section Generation Cards:**
  - Active generation highlights with subtle pulse border rather than static plain borders.

## 7. Spec Self-Review Check

- **Placeholders:** No "TBD" or "TODO" items.
- **Consistency:** Uses exact Publiora color tokens (`--color-publiora-blue`, `--color-gold`, etc.) and established Tailwind CSS v4 variables.
- **Scope Check:** Concentrated on visual styling, CSS tokens, and component enhancement. Zero breaking changes to business logic or server routes.
- **Ambiguity Check:** Explicit timing curves and keyframe definitions provided.

## 8. Verification Plan

1. **Automated Unit Tests:**
   - Run `npm run test` (Vitest) to ensure all UI component tests pass and props remain backward-compatible.
2. **Accessibility & Motion Check:**
   - Validate CSS reduced-motion overrides via browser emulation or CSS test check.
3. **Visual Smoke Check:**
   - Test button press, modal opening, dropdown toggling, toast notification, and landing page hover effects.
