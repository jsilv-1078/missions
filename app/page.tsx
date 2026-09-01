import { PulseFeed } from "./pulse-feed";
import AppNav from "./components/AppNav";
import { getFeedStories } from "@/lib/db";
import { remixFeedStories } from "@/lib/feed-order";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stories = await getFeedStories(120);
  const cleanerStories = stories.filter((story:any) => {
    if (story?.type !== "market") return true;
    const move = Math.abs(Number(story.change30d ?? 0));
    const sales = Number(story.sales30d ?? 0);
    const value = Number(story.currentValue ?? 0);
    if (String(story.headline ?? "").includes("$$")) return false;
    if (move > 80 && sales < 100) return false;
    if (value < 10 && move > 60) return false;
    return true;
  });
  return <><PulseFeed initialStories={remixFeedStories(cleanerStories)} showIntroInitially={false}/><AppNav active="pulse"/></>;
}
