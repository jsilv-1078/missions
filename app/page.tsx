import { PulseFeed } from "./pulse-feed";
import { getFeedStories } from "@/lib/db";
import { remixFeedStories } from "@/lib/feed-order";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories,cookieStore] = await Promise.all([getFeedStories(120),cookies()]);
  const showIntroInitially = cookieStore.get("cm_pulse_intro_v1")?.value !== "seen";
  return <PulseFeed initialStories={remixFeedStories(stories)} showIntroInitially={showIntroInitially}/>;
}
