import type { MarketStoryKind } from "./types";

export const MAX_DIRECTIONAL_VALUE_AGE_DAYS = 7;

const DIRECTIONAL_STORY_KINDS = new Set<MarketStoryKind>([
  "biggest_gain",
  "biggest_loss",
  "vintage_mover",
]);

export function valueDirectionIsCurrent(freshnessDays: number) {
  return Number.isFinite(freshnessDays)
    && freshnessDays >= 0
    && freshnessDays <= MAX_DIRECTIONAL_VALUE_AGE_DAYS;
}

export function storyRequiresCurrentValueDirection(storyKind: MarketStoryKind) {
  return DIRECTIONAL_STORY_KINDS.has(storyKind);
}
