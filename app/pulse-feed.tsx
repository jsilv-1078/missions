"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { FeedStory, MarketStory, MarketStoryKind, NewsStory } from "@/lib/types";

const FEED_PAGE_SIZE = 12;

function PulseLogo() {
  return <div className="pulse-logo" aria-label="Card Madness Pulse"><Image className="pulse-brand-mark" src="/card-madness-symbol.png" alt="" width={40} height={50}/><b>PULSE</b></div>;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(date)
    : "Date unavailable";
}

const MARKET_FORMATS:Record<MarketStoryKind,{ label:string;icon:string;cue:string }> = {
  high_sales_30d:{ label:"HIGH 30-DAY SALES",icon:"30",cue:"VOLUME, SALES & CONFIDENCE" },
  biggest_gain:{ label:"BIGGEST PRICE GAIN",icon:"↑",cue:"PRICE TREND & COMPS" },
  biggest_loss:{ label:"BIGGEST PRICE LOSS",icon:"↓",cue:"PRICE TREND & COMPS" },
  recent_sale:{ label:"SOLD TODAY",icon:"✓",cue:"SALE RECEIPT & COMPS" },
  grade_gap:{ label:"GRADING PREMIUM",icon:"G",cue:"PSA 10, PSA 9 & RAW" },
  sales_surge:{ label:"SALES SURGE",icon:"⚡",cue:"PACE & SALES BREAKDOWN" },
  rookie_watch:{ label:"ROOKIE WATCH",icon:"RC",cue:"ROOKIE MARKET DETAILS" },
  vintage_mover:{ label:"VINTAGE MOVER",icon:"V",cue:"ERA, TREND & COMPS" },
};

function kindClass(kind: MarketStoryKind) {
  return "market-" + kind.replaceAll("_","-");
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

function CardImage({ story }: { story: MarketStory }) {
  return <div className="market-card-image"><Image src={story.imageUrl} alt={story.cardTitle} fill sizes="(max-width: 430px) 45vw, 190px"/></div>;
}

function GradeStamp({ grade }: { grade: string }) {
  return <div className="market-grade"><span>CARD GRADE</span><strong>{grade}</strong></div>;
}

function gradePremiumLabel(prices: MarketStory["gradePrices"], index: number) {
  const current = prices[index];
  const next = prices[index + 1];
  if (!current || !next || next.price <= 0) return null;
  const premium = Math.round((current.price / next.price - 1) * 100);
  return "+" + premium.toLocaleString() + "% vs " + next.grade;
}

function MarketFrontVisual({ story }: { story: MarketStory }) {
  if (story.storyKind === "high_sales_30d") return <div className="market-stage volume-stage">
    <CardImage story={story}/><div className="volume-tally"><GradeStamp grade={story.grade}/><small>RECORDED SALES</small><strong>{story.sales30d.toLocaleString()}</strong><b>30 DAYS</b><span>{story.sales7d.toLocaleString()} in the last 7 days</span></div>
  </div>;

  if (story.storyKind === "biggest_gain" || story.storyKind === "biggest_loss") {
    const loss = story.storyKind === "biggest_loss";
    return <div className="market-stage mover-stage"><CardImage story={story}/><div className="mover-tally"><GradeStamp grade={story.grade}/><small>30-DAY MOVE</small><strong>{loss ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}%</strong><b>{loss ? "MOVING LOWER" : "MOVING HIGHER"}</b><span>{currency(story.currentValue)} current FMV</span></div></div>;
  }

  if (story.storyKind === "recent_sale") return <div className="market-stage sale-stage"><CardImage story={story}/><div className="sale-ticket"><GradeStamp grade={story.grade}/><small>CONFIRMED COMP</small><b>SOLD TODAY</b><strong>{currency(story.recentSale?.price ?? story.currentValue)}</strong><span>{story.recentSale?.venue ?? "Recorded sale"}</span><em>{story.recentSale ? dateLabel(story.recentSale.date) : "Today"}</em></div></div>;

  if (story.storyKind === "grade_gap") {
    const prices = story.gradePrices.length >= 2 ? story.gradePrices : [{ grade:story.grade,price:story.currentValue }];
    return <div className="market-stage gap-stage"><CardImage story={story}/><div className="grade-ladder"><small>LATEST GRADE PRICES</small>{prices.map((item,index) => <div key={item.grade} className={index === 0 ? "premium" : ""}><span>{item.grade}</span><strong>{currency(item.price)}</strong>{gradePremiumLabel(prices,index) ? <em>{gradePremiumLabel(prices,index)}</em> : null}</div>)}<b>{prices[0].grade} IS {story.gradeGapMultiple.toFixed(1)}× {prices[prices.length - 1].grade}</b></div></div>;
  }

  if (story.storyKind === "sales_surge") return <div className="market-stage surge-stage"><CardImage story={story}/><div className="surge-tally"><GradeStamp grade={story.grade}/><small>SALES PACE</small><strong>{story.salesPaceMultiple.toFixed(1)}×</strong><b>FASTER</b><div><span><strong>{story.sales7d}</strong>LAST 7D</span><i>→</i><span><strong>{story.previous23DaySales}</strong>PRIOR 23D</span></div></div></div>;

  if (story.storyKind === "vintage_mover") return <div className="market-stage vintage-stage"><div className="vintage-card-wrap"><span>PRE-1980</span><CardImage story={story}/></div><div className="vintage-tally"><GradeStamp grade={story.grade}/><small>VINTAGE ISSUE</small><strong>{story.cardYear || "PRE-80"}</strong><b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b><span>30-day move<br/>{currency(story.currentValue)} current FMV</span></div></div>;

  return <div className="market-stage rookie-stage"><div className="rookie-card-wrap"><span>RC</span><CardImage story={story}/></div><div className="rookie-tally"><GradeStamp grade={story.grade}/><small>ROOKIE FMV</small><strong>{currency(story.currentValue)}</strong><b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b><span>{story.sales30d} sales · 30 days</span></div></div>;
}

function MarketFront({ story, open }: { story: MarketStory; open: () => void }) {
  const format = MARKET_FORMATS[story.storyKind];
  const styleClass = kindClass(story.storyKind);
  return <section className={"story-face market-face " + styleClass}>
    <header><PulseLogo/><span className="live-pill">LIVE DATA</span></header>
    <div className="type-banner market-banner"><b aria-hidden="true">{format.icon}</b><div><span>MARKET DATA</span><strong>{format.label}</strong></div></div>
    <h1>{story.headline}</h1>
    <p className="subject-line">{story.cardTitle}</p>
    <MarketFrontVisual story={story}/>
    <button className="detail-cue market-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>{format.cue}</strong><b>→</b></button>
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

function MetricGrid({ story }: { story: MarketStory }) {
  return <div className="metric-grid"><div><span>7D CHANGE</span><strong>{story.change7d > 0 ? "+" : ""}{story.change7d.toFixed(1)}%</strong></div><div><span>30D CHANGE</span><strong>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</strong></div><div><span>7D SALES</span><strong>{story.sales7d}</strong></div><div><span>30D SALES</span><strong>{story.sales30d}</strong></div></div>;
}

function SalesContextGrid({ story, surge = false }: { story: MarketStory; surge?: boolean }) {
  return <div className="metric-grid"><div><span>7D SALES</span><strong>{story.sales7d}</strong></div><div><span>{surge ? "PRIOR 23D" : "30D SALES"}</span><strong>{surge ? story.previous23DaySales : story.sales30d}</strong></div><div><span>{surge ? "30D TOTAL" : "7D CHANGE"}</span><strong>{surge ? story.sales30d : (story.change7d > 0 ? "+" : "") + story.change7d.toFixed(1) + "%"}</strong></div><div><span>CURRENT FMV</span><strong>{currency(story.currentValue)}</strong></div></div>;
}

function ComparableSales({ story }: { story: MarketStory }) {
  if (!story.comps.length) return null;
  return <div className="comps"><h2>Verified comparable sales</h2>{story.comps.map((comp,index) => <div key={comp.date + index}><span>{dateLabel(comp.date)}</span><small>{comp.venue ?? "Sale"}</small><strong>{currency(comp.price)}</strong></div>)}</div>;
}

function MarketDetailLead({ story }: { story: MarketStory }) {
  const negative = story.change30d < 0;
  if (story.storyKind === "high_sales_30d") {
    const recentShare = story.sales30d ? Math.round((story.sales7d / story.sales30d) * 100) : 0;
    return <><div className="volume-detail"><span>30-DAY SALES</span><strong>{story.sales30d.toLocaleString()}</strong><b>{story.sales7d} in the last 7 days</b><small>{recentShare}% of monthly sales occurred this week</small></div><MetricGrid story={story}/></>;
  }
  if (story.storyKind === "recent_sale") return <><div className="receipt-detail"><span>CONFIRMED SALE · {story.grade}</span><strong>{currency(story.recentSale?.price ?? story.currentValue)}</strong><div><b>{story.recentSale ? dateLabel(story.recentSale.date) : "Today"}</b><small>{story.recentSale?.venue ?? "Recorded comp"}</small></div><p>Current FMV <b>{currency(story.currentValue)}</b></p></div><ComparableSales story={story}/></>;
  if (story.storyKind === "grade_gap") return <><div className="gap-detail"><span>GRADING PRICE LADDER</span><strong>{story.gradeGapMultiple.toFixed(1)}×</strong><small>{story.gradePrices[0]?.grade} TO {story.gradePrices[story.gradePrices.length - 1]?.grade} PREMIUM</small>{story.gradePrices.map((item,index) => <div key={item.grade} className={index === 0 ? "premium" : ""}><span><b>{item.grade}</b>{gradePremiumLabel(story.gradePrices,index) ? <small>{gradePremiumLabel(story.gradePrices,index)}</small> : null}</span><strong>{currency(item.price)}</strong></div>)}</div><div className="detail-price compact"><span>CURRENT FMV · {story.grade}</span><strong>{currency(story.currentValue)}</strong></div></>;
  if (story.storyKind === "sales_surge") {
    const recentDaily = story.sales7d / 7;
    const priorDaily = story.previous23DaySales / 23;
    return <><div className="surge-detail"><span>SALES VELOCITY</span><strong>{story.salesPaceMultiple.toFixed(1)}×</strong><small>FASTER DAILY PACE</small><div><p><b>{priorDaily.toFixed(1)}</b><span>DAILY · PRIOR 23D</span></p><i>→</i><p><b>{recentDaily.toFixed(1)}</b><span>DAILY · LAST 7D</span></p></div></div><SalesContextGrid story={story} surge/></>;
  }
  if (story.storyKind === "rookie_watch") return <><div className="rookie-detail"><b>RC</b><div><span>ROOKIE CARD FMV · {story.grade}</span><strong>{currency(story.currentValue)}</strong><small>{story.sales30d} recorded sales in 30 days</small></div></div><LineChart values={story.chart} negative={negative}/><SalesContextGrid story={story}/></>;
  if (story.storyKind === "vintage_mover") return <><div className="vintage-detail"><span>PRE-1980 ISSUE</span><strong>{story.cardYear || "VINTAGE"}</strong><div><p><small>CARD GRADE</small><b>{story.grade}</b></p><p><small>CURRENT FMV</small><b>{currency(story.currentValue)}</b></p></div><em className={negative ? "down" : "up"}>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}% OVER 30 DAYS</em></div><LineChart values={story.chart} negative={negative}/><MetricGrid story={story}/></>;
  return <><div className="detail-price"><span>30-DAY {story.storyKind === "biggest_loss" ? "PRICE LOSS" : "PRICE GAIN"} · {story.grade}</span><strong>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}%</strong><b>{currency(story.currentValue)} FMV</b></div><LineChart values={story.chart} negative={negative}/><MetricGrid story={story}/></>;
}

function MarketDetail({ story, close }: { story: MarketStory; close: () => void }) {
  const format = MARKET_FORMATS[story.storyKind];
  const hideExtraComps = story.storyKind === "recent_sale";
  return <section className={"detail-face market-detail " + kindClass(story.storyKind)}>
    <header className="detail-header"><button onClick={close} aria-label="Return to story">←</button><div><span>{format.label}</span><strong>{story.player}</strong></div><b>{format.icon}</b></header>
    <div className="detail-scroll">
      <MarketDetailLead story={story}/>
      <div className="confidence"><div><span>DATA CONFIDENCE</span><strong>GRADE {story.confidenceGrade}</strong></div><p>Updated {story.freshnessDays} day{story.freshnessDays === 1 ? "" : "s"} ago</p></div>
      {!hideExtraComps ? <ComparableSales story={story}/> : null}
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
  const [stories,setStories] = useState(initialStories);
  const [hasMore,setHasMore] = useState(initialStories.length === FEED_PAGE_SIZE);
  const [loading,setLoading] = useState(false);
  const [loadError,setLoadError] = useState(false);
  const loadingRef = useRef(false);

  async function loadMore() {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/feed?limit=" + FEED_PAGE_SIZE + "&offset=" + stories.length);
      if (!response.ok) throw new Error("Feed request failed");
      const result = await response.json() as { stories?:FeedStory[]; meta?:{ hasMore?:boolean } };
      const incoming = result.stories ?? [];
      setStories((current) => {
        const existing = new Set(current.map((story) => story.id));
        return [...current,...incoming.filter((story) => !existing.has(story.id))];
      });
      setHasMore(Boolean(result.meta?.hasMore) && incoming.length > 0);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function handleScroll(event: React.UIEvent<HTMLElement>) {
    const feed = event.currentTarget;
    const remaining = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    if (remaining < feed.clientHeight * 2) void loadMore();
  }

  return <main className="app-shell">
    <nav className="desktop-nav"><PulseLogo/><div><button className="active">For You</button><button>Market</button><button>News</button></div><a href="/admin/news">News Admin</a></nav>
    <section className="feed" aria-label="Pulse market and news feed" onScroll={handleScroll}>
      {stories.length ? stories.map((story) => <Story key={story.id} story={story}/>) : <EmptyFeed/>}
      {stories.length && (loading || loadError || !hasMore) ? <div className="feed-status">
        {loading ? <span>Loading more verified stories…</span> : loadError ? <button onClick={loadMore}>Unable to load more · Tap to retry</button> : <span>You’re caught up.</span>}
      </div> : null}
    </section>
    <nav className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>○</b><span>Compete</span></button><button><b>□</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>●</b><span>Profile</span></button></nav>
  </main>;
}
