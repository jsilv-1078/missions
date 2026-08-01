"use client";

import { useEffect, useRef, useState } from "react";

type Story = {
  kicker: string;
  title: string;
  subtitle: string;
  stat: string;
  statLabel: string;
  change: string;
  positive: boolean;
  accent: string;
  chips: string[];
  insight: string;
  kind: "player" | "card" | "news" | "watch";
};

const stories: Story[] = [
  {
    kicker: "PLAYER PULSE",
    title: "Victor Wembanyama",
    subtitle: "Basketball · San Antonio",
    stat: "$4.82M",
    statLabel: "Tracked market cap",
    change: "+12.4%",
    positive: true,
    accent: "#8b5cf6",
    chips: ["1,284 cards", "84% positive", "Trending #1"],
    insight: "Wemby is leading today’s basketball market with premium rookies driving most of the gain.",
    kind: "player",
  },
  {
    kicker: "BIGGEST MOVER",
    title: "2023 Prizm Silver RC",
    subtitle: "Victor Wembanyama · PSA 10",
    stat: "$1,248",
    statLabel: "Latest market value",
    change: "+18.7%",
    positive: true,
    accent: "#1e9e38",
    chips: ["42 sales / 30d", "$1,052 last month", "High velocity"],
    insight: "Three strong sales pushed this card above its 90-day range. Momentum remains elevated.",
    kind: "card",
  },
  {
    kicker: "MARKET NEWS",
    title: "The National effect",
    subtitle: "Basketball rookies heat up after the show",
    stat: "+7.2%",
    statLabel: "Rookie index · 7 days",
    change: "LIVE",
    positive: true,
    accent: "#f59e0b",
    chips: ["8 min read", "Market-wide", "Updated 12m ago"],
    insight: "Post-show sales are concentrating around recognizable stars, rare parallels, and low-pop slabs.",
    kind: "news",
  },
  {
    kicker: "PLAYER PULSE",
    title: "Shohei Ohtani",
    subtitle: "Baseball · Los Angeles",
    stat: "$11.6M",
    statLabel: "Tracked market cap",
    change: "+4.9%",
    positive: true,
    accent: "#ef4444",
    chips: ["2,912 cards", "67% positive", "Trending #3"],
    insight: "Modern flagship and numbered Chrome cards are seeing the strongest buyer demand this week.",
    kind: "player",
  },
  {
    kicker: "WATCH ALERT",
    title: "Buyers stepping back",
    subtitle: "2020 Select Field Level · PSA 10",
    stat: "$385",
    statLabel: "Latest market value",
    change: "−9.1%",
    positive: false,
    accent: "#06b6d4",
    chips: ["14 sales / 30d", "$424 last month", "Cooling"],
    insight: "The last two sales landed below the 30-day average. Add it to your watchlist before making a move.",
    kind: "watch",
  },
];

const miniBars = [42, 55, 48, 63, 58, 72, 69, 84, 79, 94, 88, 100];

function PulseLogo() {
  return (
    <div className="logo" aria-label="Card Madness Pulse">
      <span className="logo-mark">CM</span>
      <span>PULSE</span>
    </div>
  );
}

function StoryCard({ story, index, saved, onSave }: { story: Story; index: number; saved: boolean; onSave: () => void }) {
  return (
    <article className="story" style={{ "--accent": story.accent } as React.CSSProperties}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <PulseLogo />
        <div className="top-actions"><button aria-label="Search">⌕</button><button aria-label="Notifications">●</button></div>
      </header>

      <div className="hero-visual" aria-hidden="true">
        <div className={`visual-core ${story.kind}`}>
          <span className="edition">0{index + 1}</span>
          <span className="monogram">{story.kind === "news" ? "CM" : story.title.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
          <div className="scanline" />
        </div>
        <div className="market-card">
          <span>MARKET SIGNAL</span>
          <strong className={story.positive ? "up" : "down"}>{story.change}</strong>
        </div>
      </div>

      <section className="story-content">
        <p className="kicker"><i />{story.kicker}</p>
        <h1>{story.title}</h1>
        <p className="subtitle">{story.subtitle}</p>

        <div className="stat-row">
          <div><strong>{story.stat}</strong><span>{story.statLabel}</span></div>
          <div className="sparkline" aria-label="Recent upward price trend">
            {miniBars.map((height, i) => <i key={i} style={{ height: `${height}%`, opacity: .25 + i / 16 }} />)}
          </div>
        </div>

        <div className="chips">{story.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
        <p className="insight">{story.insight}</p>
        <button className="deep-dive">View full market breakdown <span>→</span></button>
      </section>

      <aside className="rail" aria-label="Story actions">
        <button onClick={onSave} className={saved ? "active" : ""} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><b>{saved ? "★" : "☆"}</b><span>{saved ? "Saved" : "Watch"}</span></button>
        <button aria-label="Share story"><b>↗</b><span>Share</span></button>
        <button aria-label="Open discussion"><b>◌</b><span>{18 + index * 7}</span></button>
      </aside>

      <div className="swipe-hint"><span>↑</span> Swipe for next pulse</div>
    </article>
  );
}

export default function Home() {
  const [saved, setSaved] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const feedRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const onScroll = () => setActive(Math.round(feed.scrollTop / feed.clientHeight));
    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="app-shell">
      <nav className="desktop-nav">
        <PulseLogo />
        <div><button className="selected">For You</button><button>Players</button><button>Cards</button><button>News</button></div>
        <button className="profile">JS</button>
      </nav>
      <section className="feed" ref={feedRef} aria-label="Pulse market feed">
        {stories.map((story, index) => (
          <StoryCard key={story.title} story={story} index={index} saved={saved.includes(index)} onSave={() => setSaved((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} />
        ))}
      </section>
      <div className="progress" aria-label={`Story ${active + 1} of ${stories.length}`}>
        {stories.map((_, index) => <button key={index} className={active === index ? "active" : ""} onClick={() => feedRef.current?.scrollTo({ top: index * (feedRef.current?.clientHeight ?? 0), behavior: "smooth" })} aria-label={`Go to story ${index + 1}`} />)}
      </div>
      <footer className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>◎</b><span>Compete</span></button><button><b>▣</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>○</b><span>Profile</span></button></footer>
    </main>
  );
}
