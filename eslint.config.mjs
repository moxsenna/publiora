import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const setStateInEffectFiles = [
  "app/billing/return/page.tsx",
  "components/billing/CheckoutPaymentModal.tsx",
  "components/offers/OfferForm.tsx",
  "components/offers/OfferPicker.tsx",
  "components/offers/OfferQuickCreateDialog.tsx",
  "components/offers/OfferSyncDialog.tsx",
  "components/workspace/CtaComposer.tsx",
  "components/workspace/ReviewPanel.tsx",
  "components/workspace/StrategyFieldEditor.tsx",
  "components/workspace/useOutlineDraft.ts",
  "components/workspace/useSectionDraft.ts",
];

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: setStateInEffectFiles,
    rules: {
      // Existing controlled synchronization patterns; compiler adoption is outside scope.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/(app)/settings/billing/page.tsx"],
    rules: {
      // Existing controlled browser navigation; compiler adoption is outside scope.
      "react-hooks/immutability": "off",
    },
  },
  {
    files: ["components/workspace/StrategyPanel.tsx"],
    rules: {
      // Existing manual memoization; compiler adoption is outside scope.
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    files: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "**/__tests__/**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Existing test mocks use flexible shapes; production typing remains enforced.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([
    ".next/**", "node_modules/**", "coverage/**", "playwright-report/**",
    "test-results/**", ".worktrees/**", "testsprite_tests/**",
  ]),
]);
