import { PulseFeed } from "./pulse-feed";
import { getFeedStories } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stories = await getFeedStories(12);
  return <PulseFeed initialStories={stories}/>;
}
