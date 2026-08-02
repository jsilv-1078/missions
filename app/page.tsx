"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Format = "playerMarket" | "cardMarket" | "playerNews" | "cardNews";
type Detail = { label: string; value: string };
type Sale = { date: string; price: string; venue: string };

type Story = {
  format: Format;
  kicker: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  accent: string;
  change?: string;
  stat?: string;
  statLabel?: string;
  chart?: number[];
  details: Detail[];
  insight: string;
  chips: string[];
  sales?: Sale[];
  article?: { source: string; published: string; url: string; readTime: string };
};

const stories: Story[] = [
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Victor Wembanyama",
    subtitle: "Basketball · San Antonio · 1,284 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#8b5cf6",
    change: "+12.4%",
    stat: "$4.82M",
    statLabel: "Tracked market cap",
    chart: [36, 39, 38, 45, 43, 51, 49, 58, 62, 60, 72, 78],
    details: [
      { label: "30D sales", value: "$1.34M" },
      { label: "Market breadth", value: "84% up" },
      { label: "Avg. sale", value: "$376" },
      { label: "Top category", value: "Prizm RCs" },
    ],
    insight: "Premium rookie cards are driving the move, with strength spread across most tracked Wembanyama markets.",
    chips: ["Trending #1", "Basketball", "High liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2023 Prizm Silver RC",
    subtitle: "Victor Wembanyama · Card #136 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#1e9e38",
    change: "+18.7%",
    stat: "$1,248",
    statLabel: "Current market estimate",
    details: [
      { label: "Set", value: "2023 Panini Prizm" },
      { label: "Parallel", value: "Silver" },
      { label: "Grade", value: "PSA 10" },
      { label: "30D volume", value: "42 sales" },
    ],
    sales: [
      { date: "Jul 31", price: "$1,275", venue: "Auction" },
      { date: "Jul 28", price: "$1,220", venue: "Best Offer" },
      { date: "Jul 24", price: "$1,249", venue: "Auction" },
    ],
    insight: "The latest three comparable sales are clustered tightly, while 30-day volume remains high for a premium modern card.",
    chips: ["Silver parallel", "PSA 10", "42 sales / 30D"],
  },
  {
    format: "playerNews",
    kicker: "PLAYER NEWS",
    title: "Gronk says collecting is at its “super peak”",
    subtitle: "The former Patriot returns to the hobby at The National",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/13229.png",
    imageAlt: "Rob Gronkowski",
    accent: "#ef4444",
    details: [
      { label: "Person", value: "Rob Gronkowski" },
      { label: "Event", value: "The National" },
      { label: "Partner", value: "eBay Live" },
      { label: "Topic", value: "Hobby growth" },
    ],
    insight: "Gronkowski is returning to collecting through an eBay Live series and says the hobby has reached a new level of popularity.",
    chips: ["NFL", "Collector culture", "The National"],
    article: {
      source: "New York Post",
      published: "July 27, 2026",
      readTime: "5 min read",
      url: "https://nypost.com/2026/07/27/lifestyle/patriots-legend-rob-gronkowski-returns-to-childhood-hobby-says-its-at-its-super-peak/",
    },
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Shohei Ohtani",
    subtitle: "Baseball · Los Angeles · 2,912 cards tracked",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/39832.png",
    imageAlt: "Shohei Ohtani",
    accent: "#3b82f6",
    change: "+4.9%",
    stat: "$11.6M",
    statLabel: "Tracked market cap",
    chart: [45, 47, 46, 50, 48, 54, 58, 56, 60, 63, 61, 68],
    details: [
      { label: "30D sales", value: "$2.08M" },
      { label: "Market breadth", value: "67% up" },
      { label: "Avg. sale", value: "$714" },
      { label: "Top category", value: "Chrome Autos" },
    ],
    insight: "Numbered Chrome cards and authenticated autographs are outperforming Ohtani’s broader base-card market.",
    chips: ["Trending #3", "Baseball", "Deep market"],
  },
  {
    format: "cardNews",
    kicker: "CARD NEWS",
    title: "Wemby Prizm Black 1/1 sells for $5.11M",
    subtitle: "A record price for a non-autographed modern NBA card",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#f59e0b",
    stat: "$5.11M",
    statLabel: "Reported private sale",
    details: [
      { label: "Card", value: "2023 Prizm Black" },
      { label: "Serial", value: "1 of 1" },
      { label: "Grade", value: "PSA 10" },
      { label: "Sale type", value: "Private deal" },
    ],
    insight: "The reported sale reset Wembanyama’s card record and highlighted the premium placed on his rare non-autographed rookies.",
    chips: ["Record sale", "One-of-one", "Modern basketball"],
    article: {
      source: "Dexerto",
      published: "May 26, 2026",
      readTime: "4 min read",
      url: "https://www.dexerto.com/sports/victor-wembanyama-rookie-card-sells-for-record-5-11m-after-hobby-controversy-3368300/",
    },
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Caitlin Clark",
    subtitle: "Basketball · Indiana · 864 cards tracked",
    image: "https://a.espncdn.com/i/headshots/wnba/players/full/4433403.png",
    imageAlt: "Caitlin Clark",
    accent: "#f59e0b",
    change: "+8.6%",
    stat: "$2.14M",
    statLabel: "Tracked market cap",
    chart: [41,43,42,47,49,46,53,55,58,61,60,67],
    details: [{label:"30D sales",value:"$688K"},{label:"Market breadth",value:"76% up"},{label:"Avg. sale",value:"$294"},{label:"Top category",value:"Prizm RCs"}],
    insight: "Premium rookies and numbered parallels are leading Clark’s market as women’s basketball demand expands.",
    chips: ["Trending #2","Basketball","Rising volume"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2024 Select Gold RC /10",
    subtitle: "Caitlin Clark · Courtside · PSA 10",
    image: "https://a.espncdn.com/i/headshots/wnba/players/full/4433403.png",
    imageAlt: "Caitlin Clark",
    accent: "#f59e0b",
    change: "+11.2%",
    stat: "$8,450",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2024 Select"},{label:"Parallel",value:"Gold /10"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"3 sales"}],
    sales: [{date:"Jul 30",price:"$8,600",venue:"Auction"},{date:"Jul 12",price:"$8,250",venue:"Private"},{date:"Jun 29",price:"$8,500",venue:"Auction"}],
    insight: "Low serial numbering limits liquidity, but recent results establish a narrow premium-market range.",
    chips: ["Gold /10","PSA 10","Courtside"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "LeBron James",
    subtitle: "Basketball · Los Angeles · 4,180 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/1966.png",
    imageAlt: "LeBron James",
    accent: "#8b5cf6",
    change: "+3.1%",
    stat: "$18.9M",
    statLabel: "Tracked market cap",
    chart: [48,47,49,51,50,53,52,55,57,56,58,60],
    details: [{label:"30D sales",value:"$3.24M"},{label:"Market breadth",value:"59% up"},{label:"Avg. sale",value:"$1,088"},{label:"Top category",value:"Chrome RCs"}],
    insight: "LeBron’s market remains deep and liquid, with flagship rookies outperforming later-career releases.",
    chips: ["Basketball","Blue chip","Deep liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2003 Topps Chrome RC",
    subtitle: "LeBron James · Card #111 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/1966.png",
    imageAlt: "LeBron James",
    accent: "#8b5cf6",
    change: "+4.4%",
    stat: "$14,800",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2003 Topps Chrome"},{label:"Card",value:"#111 Rookie"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"18 sales"}],
    sales: [{date:"Jul 29",price:"$14,950",venue:"Auction"},{date:"Jul 21",price:"$14,500",venue:"Best Offer"},{date:"Jul 10",price:"$14,875",venue:"Auction"}],
    insight: "Frequent sales make this one of the clearest benchmarks for LeBron’s flagship rookie market.",
    chips: ["Flagship rookie","PSA 10","High liquidity"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Aaron Judge",
    subtitle: "Baseball · New York · 2,206 cards tracked",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/33192.png",
    imageAlt: "Aaron Judge",
    accent: "#06b6d4",
    change: "+6.8%",
    stat: "$6.72M",
    statLabel: "Tracked market cap",
    chart: [39,42,41,45,48,46,52,54,53,59,62,66],
    details: [{label:"30D sales",value:"$1.11M"},{label:"Market breadth",value:"71% up"},{label:"Avg. sale",value:"$506"},{label:"Top category",value:"Chrome Autos"}],
    insight: "Rookie autographs and numbered refractors are responding fastest to Judge’s on-field momentum.",
    chips: ["Baseball","Power index","Strong breadth"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2017 Topps Chrome Refractor",
    subtitle: "Aaron Judge · Card #169 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/33192.png",
    imageAlt: "Aaron Judge",
    accent: "#06b6d4",
    change: "+9.3%",
    stat: "$1,875",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2017 Topps Chrome"},{label:"Parallel",value:"Refractor"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"24 sales"}],
    sales: [{date:"Jul 31",price:"$1,925",venue:"Auction"},{date:"Jul 25",price:"$1,850",venue:"Best Offer"},{date:"Jul 17",price:"$1,875",venue:"Auction"}],
    insight: "Recent sales show consistent demand with limited price dispersion across major marketplaces.",
    chips: ["Refractor","PSA 10","24 sales / 30D"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Patrick Mahomes",
    subtitle: "Football · Kansas City · 2,744 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png",
    imageAlt: "Patrick Mahomes",
    accent: "#ef4444",
    change: "+2.7%",
    stat: "$9.38M",
    statLabel: "Tracked market cap",
    chart: [50,49,51,50,53,55,54,57,56,59,60,62],
    details: [{label:"30D sales",value:"$1.74M"},{label:"Market breadth",value:"56% up"},{label:"Avg. sale",value:"$812"},{label:"Top category",value:"Prizm RCs"}],
    insight: "Mahomes remains football’s deepest modern market, led by scarce rookies and premium autographs.",
    chips: ["Football","Blue chip","Deep liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2017 Prizm Silver RC",
    subtitle: "Patrick Mahomes · Card #269 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png",
    imageAlt: "Patrick Mahomes",
    accent: "#ef4444",
    change: "+3.8%",
    stat: "$11,200",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2017 Panini Prizm"},{label:"Parallel",value:"Silver"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"11 sales"}],
    sales: [{date:"Jul 28",price:"$11,400",venue:"Auction"},{date:"Jul 16",price:"$10,950",venue:"Private"},{date:"Jul 03",price:"$11,250",venue:"Auction"}],
    insight: "A small but regular sales cadence continues to anchor the premium Mahomes rookie market.",
    chips: ["Silver rookie","PSA 10","Premium football"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Connor McDavid",
    subtitle: "Hockey · Edmonton · 1,506 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png",
    imageAlt: "Connor McDavid",
    accent: "#3b82f6",
    change: "+5.5%",
    stat: "$4.26M",
    statLabel: "Tracked market cap",
    chart: [43,45,44,48,47,52,50,55,57,56,61,64],
    details: [{label:"30D sales",value:"$782K"},{label:"Market breadth",value:"64% up"},{label:"Avg. sale",value:"$519"},{label:"Top category",value:"Young Guns"}],
    insight: "Young Guns rookies and premium Cup releases continue to define McDavid’s hockey market.",
    chips: ["Hockey","Young Guns","Global demand"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2015 Upper Deck Young Guns",
    subtitle: "Connor McDavid · Card #201 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png",
    imageAlt: "Connor McDavid",
    accent: "#3b82f6",
    change: "+7.1%",
    stat: "$3,950",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2015 Upper Deck"},{label:"Card",value:"#201 Young Guns"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"29 sales"}],
    sales: [{date:"Jul 30",price:"$4,050",venue:"Auction"},{date:"Jul 23",price:"$3,875",venue:"Best Offer"},{date:"Jul 14",price:"$3,925",venue:"Auction"}],
    insight: "High sales frequency makes the Young Guns PSA 10 the central benchmark for McDavid collectors.",
    chips: ["Young Guns","PSA 10","29 sales / 30D"],
  }
];

function PulseLogo() {
  return <div className="logo" aria-label="Card Madness Pulse"><span className="logo-mark">CM</span><span>PULSE</span></div>;
}

function MarketLineChart({ values }: { values: number[] }) {
  const width = 280;
  const height = 86;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 8 - ((value - min) / range) * (height - 18),
  ] as const);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points.at(-1)!;
  return (
    <div className="player-chart" aria-label="30-day player market trend">
      <div className="chart-top"><span>30 DAY MARKET TREND</span><b>LIVE</b></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs><linearGradient id="player-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".32"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
        <path className="grid-line" d={`M0,${height * .33}H${width} M0,${height * .66}H${width}`}/>
        <path className="chart-area" d={area} fill="url(#player-area)"/>
        <path className="chart-line" d={line}/>
        <circle className="chart-dot" cx={last[0]} cy={last[1]} r="3"/>
      </svg>
      <div className="chart-axis"><span>30D AGO</span><span>TODAY</span></div>
    </div>
  );
}

function DetailGrid({ details }: { details: Detail[] }) {
  return <div className="detail-grid">{details.map((detail) => <div key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>)}</div>;
}

function PlayerMarket({ story }: { story: Story }) {
  return (
    <div className="format-body player-market">
      <div className="market-summary"><div><strong>{story.stat}</strong><span>{story.statLabel}</span></div><b>{story.change}</b></div>
      <MarketLineChart values={story.chart!}/>
      <DetailGrid details={story.details}/>
      <p className="insight">{story.insight}</p>
    </div>
  );
}

function CardMarket({ story }: { story: Story }) {
  return (
    <div className="format-body card-market">
      <div className="card-price"><span>CURRENT ESTIMATE</span><strong>{story.stat}</strong><b>{story.change} · 30D</b></div>
      <DetailGrid details={story.details}/>
      <div className="sales-table"><div className="sales-head"><span>RECENT COMPARABLE SALES</span><small>Date · venue · price</small></div>{story.sales!.map((sale) => <div className="sale-row" key={`${sale.date}-${sale.price}`}><span>{sale.date}</span><span>{sale.venue}</span><strong>{sale.price}</strong></div>)}</div>
      <p className="insight">{story.insight}</p>
    </div>
  );
}

function PlayerNews({ story }: { story: Story }) {
  return (
    <div className="format-body player-news">
      <div className="news-byline"><span>{story.article!.source}</span><i/> <span>{story.article!.published}</span><i/> <span>{story.article!.readTime}</span></div>
      <p className="news-dek">{story.insight}</p>
      <DetailGrid details={story.details}/>
      <a className="article-button" href={story.article!.url} target="_blank" rel="noreferrer">Read full article <span>↗</span></a>
    </div>
  );
}

function CardNews({ story }: { story: Story }) {
  return (
    <div className="format-body card-news">
      <div className="record-sale"><span>REPORTED SALE</span><strong>{story.stat}</strong><small>{story.statLabel}</small></div>
      <div className="card-news-specs"><DetailGrid details={story.details}/></div>
      <p className="news-dek">{story.insight}</p>
      <div className="source-row"><div><span>SOURCE</span><strong>{story.article!.source}</strong><small>{story.article!.published}</small></div><a href={story.article!.url} target="_blank" rel="noreferrer">Read sale report ↗</a></div>
    </div>
  );
}

function StoryContent({ story }: { story: Story }) {
  if (story.format === "playerMarket") return <PlayerMarket story={story}/>;
  if (story.format === "cardMarket") return <CardMarket story={story}/>;
  if (story.format === "playerNews") return <PlayerNews story={story}/>;
  return <CardNews story={story}/>;
}

function StoryCard({ story, index, saved, onSave }: { story: Story; index: number; saved: boolean; onSave: () => void }) {
  const isNews = story.format === "playerNews" || story.format === "cardNews";
  const isCard = story.format === "cardMarket" || story.format === "cardNews";
  return (
    <article className={`story format-${story.format}`} style={{ "--accent": story.accent } as React.CSSProperties}>
      <header className="topbar"><PulseLogo/><div className="top-actions"><button aria-label="Search">⌕</button><button aria-label="Notifications">●</button></div></header>
      <div className="story-image" aria-hidden="true">
        <div className={`image-frame ${isCard ? "card-render" : ""}`}>
          {isCard ? (
            <>
              <div className="slab-label"><b>PSA</b><span>GEM MT</span><strong>10</strong></div>
              <div className="card-art">
                <Image src={story.image} alt={story.imageAlt} fill sizes="(max-width: 799px) 32vw, 22vw" priority={index === 0}/>
                <div className="card-foil"/>
                <div className="card-nameplate"><strong>{story.imageAlt}</strong><span>{story.title}</span></div>
              </div>
            </>
          ) : (
            <><Image src={story.image} alt={story.imageAlt} fill sizes="(max-width: 799px) 60vw, 32vw" priority={index === 0}/><div className="photo-shade"/><span className="photo-name">{story.imageAlt}</span></>
          )}
          <span className="edition">0{index + 1}</span>
        </div>
        <span className={`format-pill ${isNews ? "editorial" : "market"}`}>{isNews ? "EDITORIAL" : "MARKET DATA"}</span>
      </div>
      <section className="story-content">
        <p className="kicker"><i/>{story.kicker}</p>
        <h1>{story.title}</h1>
        <p className="subtitle">{story.subtitle}</p>
        <StoryContent story={story}/>
        <div className="chips">{story.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
      </section>
      <aside className="rail" aria-label="Story actions"><button onClick={onSave} className={saved ? "active" : ""} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><b>{saved ? "★" : "☆"}</b><span>{saved ? "Saved" : "Watch"}</span></button><button aria-label="Share story"><b>↗</b><span>Share</span></button></aside>
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
      <nav className="desktop-nav"><PulseLogo/><div><button className="selected">For You</button><button>Players</button><button>Cards</button><button>News</button></div><button className="profile">JS</button></nav>
      <section className="feed" ref={feedRef} aria-label="Pulse market feed">{stories.map((story, index) => <StoryCard key={story.title} story={story} index={index} saved={saved.includes(index)} onSave={() => setSaved((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}/>)}</section>
      <div className="progress" aria-label={`Story ${active + 1} of ${stories.length}`}>{stories.map((_, index) => <button key={index} className={active === index ? "active" : ""} onClick={() => feedRef.current?.scrollTo({ top:index * (feedRef.current?.clientHeight ?? 0), behavior:"smooth" })} aria-label={`Go to story ${index + 1}`}/>)}</div>
      <footer className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>◎</b><span>Compete</span></button><button><b>▣</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>○</b><span>Profile</span></button></footer>
    </main>
  );
}
