import type { EventCategory } from "@/types/event";

/**
 * Maps a GDELT CAMEO EventRootCode to one of our conflict categories.
 * Only these roots are considered "conflict-relevant" — the rest (mostly
 * diplomatic statements, appeals, cooperation) are excluded from ingestion
 * entirely to keep the signal-to-noise ratio reasonable. This is a
 * simplification of the full CAMEO taxonomy, not a 1:1 match to how ACLED
 * classifies events.
 */
export const ROOT_CODE_TO_CATEGORY: Record<string, EventCategory> = {
  "14": "Protests",
  "15": "Strategic developments",
  "17": "Violence against civilians",
  "18": "Violence against civilians",
  "19": "Battles",
  "20": "Explosions/Remote violence",
};

export function categoryForRootCode(rootCode: string): EventCategory | undefined {
  return ROOT_CODE_TO_CATEGORY[rootCode];
}
