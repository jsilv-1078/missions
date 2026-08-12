import type { FeedStory } from "@/lib/types";

const PLAYER_WINDOW = 12;
const FORMAT_WINDOW = 8;
const SPORT_WINDOW = 8;
const CARD_WINDOW = 20;
const PLAYER_EXPOSURE_PENALTY = 5000;
export const RECENT_CARD_COOLDOWN_MS = 72 * 60 * 60 * 1000;

export type RemixFeedOptions = {
  recentCardTimestamps?: Record<string,number>;
  now?: number;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function storyPlayerKeys(story: FeedStory) {
  const players = [story.player];
  if (story.type === "market") {
    players.push(...(story.insight?.items?.map((item) => item.player) ?? []));
  }
  return [...new Set(players.map(normalized).filter(Boolean))];
}

function formatKey(story: FeedStory) {
  return story.type === "market" ? story.storyKind : `news:${normalized(story.category)}`;
}

function sportKey(story: FeedStory) {
  return normalized(story.sport);
}

export function storyCardKeys(story: FeedStory) {
  if (story.type === "news") return [`news:${story.id}`];
  const insightKeys = story.insight?.items?.map((item) => item.id).filter(Boolean) ?? [];
  return [...new Set(insightKeys.length ? insightKeys : [story.cardId])];
}

function storiesShareCard(first: FeedStory, second: FeedStory) {
  const firstKeys = new Set(storyCardKeys(first));
  return storyCardKeys(second).some((key) => firstKeys.has(key));
}

function storiesSharePlayer(first: FeedStory, second: FeedStory) {
  const firstKeys = new Set(storyPlayerKeys(first));
  return storyPlayerKeys(second).some((key) => firstKeys.has(key));
}

function lastGap(history: FeedStory[], predicate: (story: FeedStory) => boolean) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (predicate(history[index])) return history.length - index;
  }
  return Number.POSITIVE_INFINITY;
}

function recentCount(history: FeedStory[], size: number, predicate: (story: FeedStory) => boolean) {
  return history.slice(-size).filter(predicate).length;
}

function cooldownPenalty(story: FeedStory, recentCardTimestamps: Record<string,number>, now: number) {
  let penalty = 0;
  for (const key of storyCardKeys(story)) {
    const viewedAt = recentCardTimestamps[key];
    if (!Number.isFinite(viewedAt)) continue;
    const age = Math.max(0,now - viewedAt);
    if (age >= RECENT_CARD_COOLDOWN_MS) continue;
    penalty = Math.max(penalty,2400 * (1 - age / RECENT_CARD_COOLDOWN_MS));
  }
  return penalty;
}

function noveltyPenalty(
  story: FeedStory,
  history: FeedStory[],
  recentCardTimestamps: Record<string,number>,
  now: number,
) {
  const last = history.at(-1);
  let penalty = Math.random() * 35;

  if (last?.id === story.id) penalty += 20_000;

  const cardGap = lastGap(history.slice(-CARD_WINDOW),(candidate) => storiesShareCard(candidate,story));
  if (cardGap <= CARD_WINDOW) penalty += 9000 + (CARD_WINDOW - cardGap) * 300;

  const playerGap = lastGap(history.slice(-PLAYER_WINDOW),(candidate) => storiesSharePlayer(candidate,story));
  if (playerGap <= PLAYER_WINDOW) penalty += 900 + (PLAYER_WINDOW - playerGap + 1) * 350;

  const formatCount = recentCount(history,FORMAT_WINDOW,(candidate) => formatKey(candidate) === formatKey(story));
  if (formatCount >= 2) penalty += (formatCount - 1) * 800;
  if (last && formatKey(last) === formatKey(story)) penalty += 1200;

  const sportCount = recentCount(history,SPORT_WINDOW,(candidate) => sportKey(candidate) === sportKey(story));
  if (sportCount >= 3) penalty += (sportCount - 2) * 350;
  if (last && sportKey(last) === sportKey(story)) penalty += 100;

  return penalty + cooldownPenalty(story,recentCardTimestamps,now);
}

/**
 * Builds one complete feed cycle without dropping or duplicating stories.
 * Repetition rules are deliberately soft: the best available story wins when
 * the remaining inventory makes a spacing target impossible.
 */
export function remixFeedStories(
  stories: FeedStory[],
  previous?: FeedStory | FeedStory[],
  options: RemixFeedOptions = {},
) {
  const pool = [...stories];
  const ordered: FeedStory[] = [];
  const history = Array.isArray(previous) ? [...previous] : previous ? [previous] : [];
  const recentCardTimestamps = options.recentCardTimestamps ?? {};
  const now = options.now ?? Date.now();
  const playerExposureCounts = history.reduce<Map<string,number>>((counts,story) => {
    for (const key of storyPlayerKeys(story)) counts.set(key,(counts.get(key) ?? 0) + 1);
    return counts;
  },new Map());

  while (pool.length > 0) {
    const last = history.at(-1);
    const remainingFormats = pool.reduce<Map<string,number>>((counts,story) => {
      const key = formatKey(story);
      counts.set(key,(counts.get(key) ?? 0) + 1);
      return counts;
    },new Map());
    let eligibleIndexes = pool.map((_,index) => index);
    if (last) {
      const differentCard = eligibleIndexes.filter((index) => !storiesShareCard(last,pool[index]));
      if (differentCard.length) eligibleIndexes = differentCard;
      const recentHistory = history.slice(-PLAYER_WINDOW);
      const differentRecentPlayer = eligibleIndexes.filter((index) =>
        !recentHistory.some((previousStory) => storiesSharePlayer(previousStory,pool[index])),
      );
      if (differentRecentPlayer.length) eligibleIndexes = differentRecentPlayer;
      const differentFormat = eligibleIndexes.filter((index) => formatKey(pool[index]) !== formatKey(last));
      if (differentFormat.length) eligibleIndexes = differentFormat;
    }
    let selectedIndex = eligibleIndexes[0] ?? 0;
    let selectedPenalty = Number.POSITIVE_INFINITY;
    for (const index of eligibleIndexes) {
      const story = pool[index];
      const playerExposure = storyPlayerKeys(story).reduce(
        (highest,key) => Math.max(highest,playerExposureCounts.get(key) ?? 0),0,
      );
      const inventoryBonus = (remainingFormats.get(formatKey(story)) ?? 0) * 220;
      const penalty = noveltyPenalty(story,history,recentCardTimestamps,now)
        + playerExposure * PLAYER_EXPOSURE_PENALTY - inventoryBonus;
      if (penalty >= selectedPenalty) continue;
      selectedIndex = index;
      selectedPenalty = penalty;
    }
    const [next] = pool.splice(selectedIndex,1);
    ordered.push(next);
    history.push(next);
    for (const key of storyPlayerKeys(next)) {
      playerExposureCounts.set(key,(playerExposureCounts.get(key) ?? 0) + 1);
    }
    if (history.length > CARD_WINDOW) history.shift();
  }

  return ordered;
}
