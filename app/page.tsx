import { PulseFeed } from "./pulse-feed";
import { getFeedStories } from "@/lib/db";
import { remixFeedStories } from "@/lib/feed-order";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stories = await getFeedStories(120);
  return <PulseFeed initialStories={remixFeedStories(stories)}/>;
}
