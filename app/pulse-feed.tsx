"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { FeedStory, MarketStory, NewsStory } from "@/lib/types";

function PulseLogo() {
  return <div className="pulse-logo" aria-label="Card Madness Pulse"><span>↗</span><b>PULSE</b></div>;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value));
}

function LineChart({ values, negative }: { values: number[]; negative: boolean }) {
  const safe = values.length > 1 ? values : [0,1];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const points = safe.map((value,index) => {
    const x = (index / (safe.length - 1)) * 320;
    const y = 90 - ((value - min) / range) * 76;
    return String(x) + "," + String(y);
  }).join(" ");
  return <div className={"line-chart " + (negative ? "negative" : "")}><svg viewBox="0 0 320 100" role="img" aria-label="30-day price trend"><polyline points={points}/></svg><div><span>30 DAYS AGO</span><span>TODAY</span></div></div>;
}

function MarketFront({ story, open }: { story: MarketStory; open: () => void }) {
  const negative = story.change30d < 0;
  return <section className="story-face market-face">
    <header><PulseLogo/><span className="live-pill">LIVE DATA</span></header>
    <div className="type-banner market-banner"><b>$</b><div><span>MARKET DATA</span><strong>{story.storyKind === "volume" ? "HIGH ACTIVITY" : negative ? "PRICE DECLINE" : "PRICE GAIN"}</strong></div></div>
    <h1>{story.headline}</h1>
    <p className="subject-line">{story.cardTitle} · {story.grade}</p>
    <div className="market-hero">
      <div className="card-photo"><Image src={story.imageUrl} alt={story.cardTitle} fill sizes="(max-width: 799px) 44vw, 24vw"/></div>
      <div className="price-signal">
        <span>CURRENT FMV</span><strong>{currency(story.currentValue)}</strong>
        <b className={negative ? "down" : "up"}>{negative ? "↓" : "↑"} {Math.abs(story.change30d).toFixed(1)}%</b>
        <small>30-DAY MOVEMENT</small>
      </div>
    </div>
    <button className="detail-cue market-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>CHART, SALES & CONFIDENCE</strong><b>→</b></button>
  </section>;
}

function NewsFront({ story, open }: { story: NewsStory; open: () => void }) {
  return <section className="story-face news-face">
    <header><PulseLogo/><span className="live-pill">CURATED</span></header>
    <div className="type-banner news-banner"><b>N</b><div><span>PLAYER NEWS</span><strong>{story.category}</strong></div></div>
    <h1>{story.headline}</h1>
    <div className="news-hero">
      <Image src={story.imageUrl} alt={story.player} fill sizes="(max-width: 799px) 100vw, 45vw"/>
      <div className="news-shade"/>
      <div className="news-source"><span>{story.source}</span><b>{dateLabel(story.publishedAt)}</b></div>
    </div>
    <div className="news-grabber"><span>{story.player} · {story.sport}</span><p>{story.summary}</p></div>
    <button className="detail-cue news-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>READ THE STORY</strong><b>→</b></button>
  </section>;
}

function MarketDetail({ story, close }: { story: MarketStory; close: () => void }) {
  const negative = story.change30d < 0;
  return <section className="detail-face">
    <header className="detail-header"><button onClick={close} aria-label="Return to story">←</button><div><span>MARKET DATA</span><strong>{story.player}</strong></div><b>$</b></header>
    <div className="detail-scroll">
      <div className="detail-price"><span>CURRENT FMV · {story.grade}</span><strong>{currency(story.currentValue)}</strong><b className={negative ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b></div>
      <LineChart values={story.chart} negative={negative}/>
      <div className="metric-grid">
        <div><span>7D CHANGE</span><strong>{story.change7d > 0 ? "+" : ""}{story.change7d.toFixed(1)}%</strong></div>
        <div><span>30D CHANGE</span><strong>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</strong></div>
        <div><span>7D SALES</span><strong>{story.sales7d}</strong></div>
        <div><span>30D SALES</span><strong>{story.sales30d}</strong></div>
      </div>
      <div className="confidence"><div><span>DATA CONFIDENCE</span><strong>GRADE {story.confidenceGrade}</strong></div><p>Updated {story.freshnessDays} day{story.freshnessDays === 1 ? "" : "s"} ago</p></div>
      {story.comps.length ? <div className="comps"><h2>Recent comparable sales</h2>{story.comps.map((comp,index) => <div key={comp.date + index}><span>{dateLabel(comp.date)}</span><small>{comp.venue ?? "Sale"}</small><strong>{currency(comp.price)}</strong></div>)}</div> : null}
      <div className="why"><span>WHY IT MATTERS</span><p>{story.summary}</p></div>
    </div>
    <button className="return-cue" onClick={close}>← SWIPE LEFT TO RETURN</button>
  </section>;
}

function NewsDetail({ story, close }: { story: NewsStory; close: () => void }) {
  return <section className="detail-face news-detail">
    <header className="detail-header"><button onClick={close} aria-label="Return to story">←</button><div><span>PLAYER NEWS</span><strong>{story.player}</strong></div><b>N</b></header>
    <div className="detail-scroll">
      <div className="article-meta"><span>{story.category}</span><b>{story.source}</b><small>{dateLabel(story.publishedAt)}</small></div>
      <h2 className="article-headline">{story.headline}</h2>
      <div className="article-image"><Image src={story.imageUrl} alt={story.player} fill sizes="(max-width: 799px) 92vw, 55vw"/></div>
      <p className="article-summary">{story.summary}</p>
      <div className="why"><span>WHY COLLECTORS CARE</span><p>Player news can change attention, sales volume and demand for related cards. Market context will be connected automatically when Card Hedge identifies a matching player or card.</p></div>
      <a className="article-link" href={story.articleUrl} target="_blank" rel="noreferrer">READ THE ORIGINAL ARTICLE <b>↗</b></a>
    </div>
    <button className="return-cue" onClick={close}>← SWIPE LEFT TO RETURN</button>
  </section>;
}

function Story({ story }: { story: FeedStory }) {
  const [open,setOpen] = useState(false);
  const start = useRef<{x:number;y:number}|null>(null);
  const touchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    start.current = {x:touch.clientX,y:touch.clientY};
  };
  const touchEnd = (event: React.TouchEvent) => {
    if (!start.current) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX - start.current.x;
    const y = touch.clientY - start.current.y;
    start.current = null;
    if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y)) setOpen(x > 0);
  };
  return <article className={"pulse-story " + story.type + (open ? " open" : "")} onTouchStart={touchStart} onTouchEnd={touchEnd}>
    <div className="story-track">
      {story.type === "market" ? <MarketFront story={story} open={() => setOpen(true)}/> : <NewsFront story={story} open={() => setOpen(true)}/>}
      {story.type === "market" ? <MarketDetail story={story} close={() => setOpen(false)}/> : <NewsDetail story={story} close={() => setOpen(false)}/>}
    </div>
  </article>;
}

function EmptyFeed() {
  return <section className="empty-feed">
    <PulseLogo/>
    <div><span>LIVE FEED</span><h1>No verified stories yet.</h1><p>Published news and live Card Hedge market updates will appear here as they become available.</p></div>
  </section>;
}

export function PulseFeed({ initialStories }: { initialStories: FeedStory[] }) {
  return <main className="app-shell">
    <nav className="desktop-nav"><PulseLogo/><div><button className="active">For You</button><button>Market</button><button>News</button></div><a href="/admin/news">News Admin</a></nav>
    <section className="feed" aria-label="Pulse market and news feed">{initialStories.length ? initialStories.map((story) => <Story key={story.id} story={story}/>) : <EmptyFeed/>}</section>
    <nav className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>○</b><span>Compete</span></button><button><b>□</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>●</b><span>Profile</span></button></nav>
  </main>;
}
