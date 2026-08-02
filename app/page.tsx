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
  image: string;
  imageAlt: string;
  chart: number[];
  details: { label: string; value: string }[];
  news?: { source: string; url: string; published: string };
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
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    chart: [36, 39, 38, 45, 43, 51, 49, 58, 62, 60, 72, 78],
    details: [
      { label: "30D sales", value: "$1.34M" },
      { label: "Cards tracked", value: "1,284" },
      { label: "Market breadth", value: "84% up" },
      { label: "Top market", value: "Prizm RCs" },
    ],
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
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    chart: [30, 33, 32, 36, 34, 42, 40, 47, 52, 56, 69, 82],
    details: [
      { label: "Set / Card", value: "2023 Prizm #136" },
      { label: "Parallel", value: "Silver Prizm" },
      { label: "Grade", value: "PSA 10" },
      { label: "30D sales", value: "42 comps" },
    ],
  },
  {
    kicker: "HOBBY NEWS",
    title: "Gronk says collecting is at its “super peak”",
    subtitle: "The former Patriot returns to the hobby at The National",
    stat: "2026",
    statLabel: "The National · Chicago",
    change: "NEW",
    positive: true,
    accent: "#ef4444",
    chips: ["New York Post", "5 min read", "July 27, 2026"],
    insight: "Rob Gronkowski is returning to collecting through an eBay Live series and says sports cards are experiencing a new peak.",
    kind: "news",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/13229.png",
    imageAlt: "Rob Gronkowski",
    chart: [42, 41, 44, 46, 45, 50, 53, 52, 56, 59, 61, 65],
    details: [
      { label: "Source", value: "New York Post" },
      { label: "Published", value: "Jul 27, 2026" },
      { label: "Topic", value: "Hobby growth" },
      { label: "Event", value: "The National" },
    ],
    news: {
      source: "New York Post",
      published: "July 27, 2026",
      url: "https://nypost.com/2026/07/27/lifestyle/patriots-legend-rob-gronkowski-returns-to-childhood-hobby-says-its-at-its-super-peak/",
    },
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
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/39832.png",
    imageAlt: "Shohei Ohtani",
    chart: [45, 47, 46, 50, 48, 54, 58, 56, 60, 63, 61, 68],
    details: [
      { label: "30D sales", value: "$2.08M" },
      { label: "Cards tracked", value: "2,912" },
      { label: "Market breadth", value: "67% up" },
      { label: "Top market", value: "Chrome Autos" },
    ],
  },
  {
    kicker: "WATCH ALERT",
    title: "Buyers stepping back",
    subtitle: "Justin Herbert · 2020 Select Field Level · PSA 10",
    stat: "$385",
    statLabel: "Latest market value",
    change: "−9.1%",
    positive: false,
    accent: "#06b6d4",
    chips: ["14 sales / 30d", "$424 last month", "Cooling"],
    insight: "The last two sales landed below the 30-day average. Add it to your watchlist before making a move.",
    kind: "watch",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/4038941.png",
    imageAlt: "Justin Herbert",
    chart: [76, 73, 75, 69, 71, 64, 66, 59, 61, 55, 49, 46],
    details: [
      { label: "Set / Card", value: "2020 Select #344" },
      { label: "Level", value: "Field Level" },
      { label: "Grade", value: "PSA 10" },
      { label: "30D range", value: "$360–$428" },
    ],
  },
];

function PulseLogo() {
  return (
    <div className="logo" aria-label="Card Madness Pulse">
      <span className="logo-mark">CM</span>
      <span>PULSE</span>
    </div>
  );
}

function MarketLineChart({ values, positive }: { values: number[]; positive: boolean }) {
  const width = 220;
  const height = 58;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 5 - ((value - min) / range) * (height - 12);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <div className={`market-chart ${positive ? "positive" : "negative"}`} aria-label={`${positive ? "Upward" : "downward"} 30-day price trend`}>
      <div className="chart-label"><span>30D</span><b>{positive ? "▲" : "▼"}</b></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id={`area-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".34" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="grid-line" d={`M0,${height * .33} H${width} M0,${height * .66} H${width}`} />
        <path className="chart-area" d={area} fill={`url(#area-${positive ? "up" : "down"})`} />
        <path className="chart-line" d={line} />
        <circle className="chart-dot-pulse" cx={last[0]} cy={last[1]} r="5" />
        <circle className="chart-dot" cx={last[0]} cy={last[1]} r="2.8" />
      </svg>
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
          <img className="player-photo" src={story.image} alt={story.imageAlt} />
          <div className="photo-shade" />
          <span className="photo-name">{story.imageAlt}</span>
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
          <MarketLineChart values={story.chart} positive={story.positive} />
        </div>

        <div className="chips">{story.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
        <div className="detail-panel">
          <div className="detail-heading">
            <span>{story.kind === "player" ? "PLAYER MARKET PROFILE" : story.kind === "news" ? "NEWS DETAILS" : "CARD DETAILS"}</span>
            <small>{story.kind === "player" ? "30-day snapshot" : story.kind === "news" ? story.news?.published : "Market snapshot"}</small>
          </div>
          <div className="detail-grid">
            {story.details.map((detail) => <div key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>)}
          </div>
          {story.news && (
            <a className="article-link" href={story.news.url} target="_blank" rel="noreferrer">
              Read the full article at {story.news.source} <b>↗</b>
            </a>
          )}
        </div>
        <p className="insight">{story.insight}</p>
        <button className="deep-dive">{story.kind === "news" ? "See related market activity" : "View full market breakdown"} <span>→</span></button>
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
