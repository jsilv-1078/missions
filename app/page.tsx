import { PulseFeed } from "./pulse-feed";
import { getFeedStories } from "@/lib/db";
import { remixFeedStories } from "@/lib/feed-order";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories,cookieStore] = await Promise.all([getFeedStories(120),cookies()]);
  const showIntroInitially = cookieStore.get("cm_pulse_intro_v3")?.value !== "seen";
  return (
    <>
      <PulseFeed initialStories={remixFeedStories(stories)} showIntroInitially={showIntroInitially}/>
      <nav className="cm-bottom-nav" aria-label="Card Madness navigation" style={{gridTemplateColumns:"repeat(6,1fr)"}}>
        <a className="cm-nav-item selected" href="/"><span className="cm-nav-icon">∿</span><small>Pulse</small></a>
        <a className="cm-nav-item" href="/market"><span className="cm-nav-icon">⌁</span><small>Market</small></a>
        <button className="cm-scan-button" type="button" aria-label="Scan card"><img src="/IMG_4838.jpeg" alt="" style={{width:34,height:34,objectFit:'cover',borderRadius:6,display:'block'}}/></button>
        <a className="cm-nav-item" href="/collection-demo?view=collection"><span className="cm-nav-icon">▥</span><small>My Collection</small></a>
        <a className="cm-nav-item" href="/gauge"><span className="cm-nav-icon">◎</span><small>Gauge</small></a>
        <button className="cm-nav-item" type="button"><span className="cm-nav-icon">☰</span><small>More</small></button>
      </nav>
    </>
  );
}
