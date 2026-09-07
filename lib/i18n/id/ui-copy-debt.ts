export type UiCopyDebtEntry = {
  file: string;
  matchedPhrase: string;
  line: number;
  column: number;
};

// Task 13: copy debt closed — all previously forbidden UI copy is localized.
export const uiCopyDebt: readonly UiCopyDebtEntry[] = [];
