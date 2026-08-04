import type { FeedStory } from "@/lib/types";

function playerKey(story: FeedStory) {
  return story.player.trim().toLocaleLowerCase();
}

function formatKey(story: FeedStory) {
  return story.type === "market" ? story.storyKind : "news";
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Builds one complete feed cycle without dropping or duplicating stories.
 * Selection favors a different player and format from the previous story,
 * then relaxes those constraints when the remaining pool makes that impossible.
 */
export function remixFeedStories(stories: FeedStory[], previous?: FeedStory) {
  const pool = [...stories];
  const ordered: FeedStory[] = [];
  let last = previous;

  while (pool.length > 0) {
    const currentLast = last;
    const candidates = pool.map((story, index) => ({ story, index }));
    const differentStory = currentLast
      ? candidates.filter(({ story }) => story.id !== currentLast.id)
      : candidates;
    const differentPlayer = currentLast
      ? differentStory.filter(({ story }) => playerKey(story) !== playerKey(currentLast))
      : differentStory;
    const differentFormat = currentLast
      ? differentPlayer.filter(({ story }) => formatKey(story) !== formatKey(currentLast))
      : differentPlayer;
    const eligible = differentFormat.length
      ? differentFormat
      : differentPlayer.length
        ? differentPlayer
        : differentStory.length
          ? differentStory
          : candidates;
    const selected = randomItem(eligible);
    const [next] = pool.splice(selected.index, 1);
    ordered.push(next);
    last = next;
  }

  return ordered;
}
