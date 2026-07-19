// Title style metadata (label + description for badge rendering)

import type { TitleStyle } from "./ai-suggestions";

export const TITLE_STYLES: {
  id: TitleStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "curiosity",
    label: "Curiosity",
    description: "Piques interest with an intriguing hook or question.",
  },
  {
    id: "authority",
    label: "Authority",
    description: "Positions the ebook as the definitive guide.",
  },
  {
    id: "practical",
    label: "Practical",
    description: "Direct, actionable, and benefit-focused.",
  },
  {
    id: "contrarian",
    label: "Contrarian",
    description: "Challenges a common belief to grab attention.",
  },
  {
    id: "outcome",
    label: "Outcome",
    description: "Leads with the transformation or result.",
  },
];
