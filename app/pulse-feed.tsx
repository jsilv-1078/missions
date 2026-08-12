"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RECENT_CARD_COOLDOWN_MS, remixFeedStories, storyCardKeys } from "@/lib/feed-order";
import type { FeedStory, MarketInsightItem, MarketStory, MarketStoryKind, NewsStory } from "@/lib/types";

function PulseLogo() {
  return <div className="pulse-logo" aria-label="Card Madness Pulse"><Image className="pulse-brand-mark" src="/card-madness-symbol.png" alt="" width={40} height={50}/><b>PULSE</b></div>;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(date)
    : "Date unavailable";
}

function marketFreshnessLabel(story: MarketStory) {
  if (story.freshnessDays <= 0) return "UPDATED TODAY";
  if (story.freshnessDays === 1) return "UPDATED 1D AGO";
  return `UPDATED ${story.freshnessDays}D AGO`;
}

function newsTypeLabel(story: NewsStory) {
  const category = story.category.trim().toLocaleLowerCase();
  if (category.includes("player")) return "PLAYER NEWS";
  if (category.includes("hobby")) return "HOBBY NEWS";
  if (category.includes("industry")) return "INDUSTRY NEWS";
  if (category.includes("sale")) return "CARD SALE";
  if (category.includes("card")) return "CARD NEWS";
  return "NEWS";
}

function signedDifference(value: number, suffix = "%") {
  if (!Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}${suffix}`;
}

const MARKET_FORMATS:Record<MarketStoryKind,{ label:string;icon:string;cue:string }> = {
  high_sales_30d:{ label:"HIGH 30-DAY SALES",icon:"30",cue:"VOLUME, SALES & CONFIDENCE" },
  biggest_gain:{ label:"CARD GAINING VALUE",icon:"↑",cue:"PRICE MOVE & SALES" },
  biggest_loss:{ label:"CARD LOSING VALUE",icon:"↓",cue:"PRICE MOVE & SALES" },
  recent_sale:{ label:"SOLD TODAY",icon:"✓",cue:"SALE RECEIPT & COMPS" },
  grade_gap:{ label:"GRADING PREMIUM",icon:"G",cue:"PSA 10, PSA 9 & RAW" },
  sales_surge:{ label:"SALES SURGE",icon:"⚡",cue:"PACE & SALES BREAKDOWN" },
  rookie_watch:{ label:"ROOKIE WATCH",icon:"RC",cue:"ROOKIE MARKET DETAILS" },
  vintage_mover:{ label:"VINTAGE MOVER",icon:"V",cue:"ERA, VALUE & SALES" },
  player_snapshot:{ label:"PLAYER MARKET",icon:"P",cue:"CARDS, SALES & DIRECTION" },
  price_volume:{ label:"PRICE + VOLUME",icon:"↕",cue:"SIGNAL, LIQUIDITY & COMPS" },
  market_matchup:{ label:"MARKET MATCHUP",icon:"VS",cue:"COMPARE BOTH MARKETS" },
};

function kindClass(kind: MarketStoryKind) {
  return "market-" + kind.replaceAll("_","-");
}

function CardImage({ story }: { story: MarketStory }) {
  return <div className="market-card-image"><Image src={story.imageUrl} alt={story.cardTitle} fill sizes="(max-width: 430px) 45vw, 190px"/></div>;
}

function InsightImage({ insight, className = "" }: { insight: MarketInsightItem; className?: string }) {
  return <div className={`insight-card-image ${className}`}><Image src={insight.imageUrl} alt={insight.cardTitle} fill sizes="(max-width: 430px) 40vw, 170px"/></div>;
}

function moveLabel(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
}

function GradeStamp({ grade }: { grade: string }) {
  return <div className="market-grade"><span>CARD GRADE</span><strong>{grade}</strong></div>;
}

function gradePremiumLabel(prices: MarketStory["gradePrices"], index: number) {
  const current = prices[index];
  const next = prices[index + 1];
  if (!current || !next || next.price <= 0) return null;
  const premium = Math.round((current.price / next.price - 1) * 100);
  const dollars = current.price - next.price;
  return "+" + currency(dollars) + " · +" + premium.toLocaleString() + "% vs " + next.grade;
}

function MarketFrontVisual({ story }: { story: MarketStory }) {
  if (story.storyKind === "player_snapshot") {
    const items = story.insight?.items ?? [];
    const average = story.insight?.averageChange30d ?? 0;
    return <div className="player-snapshot-stage">
      <div className="snapshot-card-strip">{items.slice(0,3).map((market) => <figure className="snapshot-card" key={market.id}><InsightImage insight={market}/><figcaption>{market.cardTitle}</figcaption></figure>)}</div>
      <div className="player-snapshot-total"><span>WEIGHTED 30-DAY DIRECTION</span><strong className={average < 0 ? "down" : "up"}>{moveLabel(average)}</strong><div><b>{story.insight?.cardsTracked ?? items.length}</b> CARDS <i/> <b>{story.insight?.totalSales30d?.toLocaleString() ?? 0}</b> SALES</div></div>
    </div>;
  }

  if (story.storyKind === "price_volume") return <div className="market-stage signal-stage">
    <CardImage story={story}/><div className="signal-tally"><GradeStamp grade={story.grade}/><small>{story.insight?.label ?? "PRICE + VOLUME"}</small><strong className={story.change30d < 0 ? "down" : "up"}>{moveLabel(story.change30d)}</strong><b>{story.sales30d.toLocaleString()} SALES</b><span>{story.insight?.volumePercentile ?? 0}th percentile in Pulse</span></div>
  </div>;

  if (story.storyKind === "market_matchup") {
    const items = story.insight?.items ?? [];
    return <div className="matchup-stage">{items.slice(0,2).map((market,index) => <div className="matchup-side" key={market.id}><InsightImage insight={market}/><span>{market.player}</span><strong>{currency(market.currentValue)}</strong><b className={market.change30d < 0 ? "down" : "up"}>{moveLabel(market.change30d)}</b>{index === 0 ? <i>VS</i> : null}</div>)}</div>;
  }

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

  if (story.storyKind === "vintage_mover") return <div className="market-stage vintage-stage"><div className="vintage-card-wrap"><CardImage story={story}/></div><div className="vintage-tally"><GradeStamp grade={story.grade}/><small>VINTAGE ISSUE</small><strong>{story.cardYear || "VINTAGE"}</strong><b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b><span>30-day move<br/>{currency(story.currentValue)} current FMV</span></div></div>;

  return <div className="market-stage rookie-stage"><div className="rookie-card-wrap"><span>RC</span><CardImage story={story}/></div><div className="rookie-tally"><GradeStamp grade={story.grade}/><small>ROOKIE FMV</small><strong>{currency(story.currentValue)}</strong><b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b><span>{story.sales30d} sales · 30 days</span></div></div>;
}

function MarketFront({ story, open }: { story: MarketStory; open: () => void }) {
  const format = MARKET_FORMATS[story.storyKind];
  const styleClass = kindClass(story.storyKind);
  const showCardTitle = !["player_snapshot","market_matchup"].includes(story.storyKind);
  return <section className={"story-face market-face " + styleClass}>
    <header><PulseLogo/><span className="live-pill">{marketFreshnessLabel(story)}</span></header>
    <div className="type-banner market-banner"><b aria-hidden="true">{format.icon}</b><div><span>MARKET DATA</span><strong>{format.label}</strong></div></div>
    <h1>{story.headline}</h1>
    <MarketFrontVisual story={story}/>
    {showCardTitle ? <p className="market-card-title">{story.cardTitle}</p> : null}
    <button className="detail-cue market-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>{format.cue}</strong><b>→</b></button>
  </section>;
}

function NewsFront({ story, open }: { story: NewsStory; open: () => void }) {
  return <section className="story-face news-face">
    <header><PulseLogo/><span className="live-pill">CURATED</span></header>
    <div className="type-banner news-banner"><b>N</b><div><span>{newsTypeLabel(story)}</span><strong>{story.category}</strong></div></div>
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

function priorValue(story: MarketStory) {
  const multiplier = 1 + story.change30d / 100;
  return multiplier > 0 ? story.currentValue / multiplier : 0;
}

function preciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US",{
    style:"currency",currency:"USD",minimumFractionDigits:value < 100 ? 2 : 0,maximumFractionDigits:value < 100 ? 2 : 0,
  }).format(value);
}

function median(values: number[]) {
  const ordered = [...values].sort((first,second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  if (!ordered.length) return 0;
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

type StoredMarketSnapshot = { currentValue:number;sales30d:number;updatedAt:string;viewedAt:number };

function visitChangeLabel(story: MarketStory, previous?: StoredMarketSnapshot) {
  if (!previous || previous.updatedAt === story.updatedAt) return null;
  const valueChange = story.currentValue - previous.currentValue;
  const percentChange = previous.currentValue > 0 ? valueChange / previous.currentValue * 100 : 0;
  const volumeChange = story.sales30d - previous.sales30d;
  if (Math.abs(valueChange) < 0.005 && volumeChange === 0) return null;
  const pieces:string[] = [];
  if (Math.abs(valueChange) >= 0.005) pieces.push(`FMV ${valueChange < 0 ? "−" : "+"}${preciseCurrency(Math.abs(valueChange))} (${signedDifference(percentChange)})`);
  if (volumeChange !== 0) pieces.push(`30-day volume ${volumeChange > 0 ? "+" : "−"}${Math.abs(volumeChange).toLocaleString()}`);
  return pieces.join(" · ");
}

function CollectorEvidence({ story,previous }: { story: MarketStory;previous?: StoredMarketSnapshot }) {
  const sales = [...story.comps]
    .filter((comp) => Number.isFinite(comp.price) && comp.price > 0)
    .sort((first,second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0,3);
  const prices = sales.map((sale) => sale.price);
  const latest = sales[0];
  const recentMedian = median(prices);
  const minimum = prices.length ? Math.min(...prices) : 0;
  const maximum = prices.length ? Math.max(...prices) : 0;
  const spread = recentMedian > 0 ? (maximum - minimum) / recentMedian * 100 : 0;
  const stability = spread <= 10 ? "TIGHT" : spread <= 25 ? "MODERATE" : "WIDE";
  const latestVsFmv = latest && story.currentValue > 0 ? (latest.price / story.currentValue - 1) * 100 : Number.NaN;
  const dailySales = story.sales30d / 30;
  const liquidity = dailySales >= 1
    ? `${dailySales.toFixed(dailySales >= 10 ? 0 : 1)}/DAY`
    : story.sales30d > 0 ? `1 / ${(30 / story.sales30d).toFixed(1)} DAYS` : "NO SALES";
  const paceChange = story.salesPaceMultiple > 0 ? (story.salesPaceMultiple - 1) * 100 : Number.NaN;
  const reversal = Math.abs(story.change7d) >= 1
    && Math.abs(story.change30d) >= 1
    && Math.sign(story.change7d) !== Math.sign(story.change30d);
  const confidence = story.confidenceGrade === "A" ? "HIGH EVIDENCE" : story.confidenceGrade === "B" ? "GOOD EVIDENCE" : "LIMITED EVIDENCE";
  const sinceVisit = visitChangeLabel(story,previous);

  return <section className="collector-evidence" aria-label="Collector market evidence">
    <header><div><span>COLLECTOR SIGNALS</span><strong>{confidence}</strong></div><b>{story.comps.length} COMPS · {marketFreshnessLabel(story)}</b></header>
    {sinceVisit ? <p className="since-visit"><b>CHANGED SINCE YOUR LAST VIEW</b><span>{sinceVisit}</span></p> : null}
    <div className="evidence-grid">
      <article><span>LATEST VS FMV</span><strong className={latestVsFmv < 0 ? "down" : latestVsFmv > 0 ? "up" : undefined}>{signedDifference(latestVsFmv)}</strong><small>{latest ? `${preciseCurrency(latest.price)} sale · ${preciseCurrency(story.currentValue)} FMV` : "No recent sale"}</small></article>
      <article><span>RECENT RANGE</span><strong>{prices.length ? `${preciseCurrency(minimum)}–${preciseCurrency(maximum)}` : "N/A"}</strong><small>{prices.length ? `${stability} SPREAD · ${spread.toFixed(1)}%` : "Not enough comps"}</small></article>
      <article><span>LIQUIDITY</span><strong>{liquidity}</strong><small>{story.sales30d.toLocaleString()} sales · 30 days</small></article>
      <article><span>SALES PACE</span><strong className={paceChange < 0 ? "down" : paceChange > 0 ? "up" : undefined}>{signedDifference(paceChange)}</strong><small>vs preceding 23 days</small></article>
    </div>
    {reversal ? <p className="momentum-reversal"><b>MOMENTUM REVERSAL</b><span>{signedDifference(story.change7d)} over 7 days vs {signedDifference(story.change30d)} over 30 days</span></p> : null}
    <div className="evidence-sales"><h2>LAST {sales.length || 3} VERIFIED SALES</h2>{sales.length ? sales.map((sale,index) => <article key={sale.date + index}><span><b>{dateLabel(sale.date)}</b><small>{sale.venue ?? "Recorded sale"}</small></span><strong>{preciseCurrency(sale.price)}</strong></article>) : <p>No recent verified sales available.</p>}</div>
    <footer>Signals describe verified pricing activity and are not a recommendation to buy, sell or grade.</footer>
  </section>;
}

function InsightMarketRows({ label, items }: { label:string; items:MarketInsightItem[] }) {
  if (!items.length) return null;
  return <section className="insight-market-list"><header>{label}</header>{items.map((market) => <article key={market.id}>
    <InsightImage insight={market}/><div><strong>{market.player}</strong><span>{market.cardTitle}</span><small>{market.grade} · {market.sales30d.toLocaleString()} sales</small></div><aside><b>{currency(market.currentValue)}</b><em className={market.change30d < 0 ? "down" : "up"}>{moveLabel(market.change30d)}</em></aside>
  </article>)}</section>;
}

function MarketDetailLead({ story }: { story: MarketStory }) {
  const negative = story.change30d < 0;
  if (story.storyKind === "player_snapshot") {
    const average = story.insight?.averageChange30d ?? 0;
    return <><div className="player-detail-summary"><span>PLAYER MARKET SNAPSHOT</span><strong className={average < 0 ? "down" : "up"}>{moveLabel(average)}</strong><b>WEIGHTED 30-DAY DIRECTION</b><div><p><small>TRACKED CARDS</small><b>{story.insight?.cardsTracked ?? 0}</b></p><p><small>RECORDED SALES</small><b>{story.insight?.totalSales30d?.toLocaleString() ?? 0}</b></p></div></div><InsightMarketRows label="CARDS IN THIS SNAPSHOT" items={story.insight?.items ?? []}/></>;
  }
  if (story.storyKind === "price_volume") return <div className="signal-detail"><span>PRICE + VOLUME SIGNAL</span><b>{story.insight?.label ?? "MARKET SIGNAL"}</b><strong className={negative ? "down" : "up"}>{moveLabel(story.change30d)}</strong><div><p><small>30-DAY SALES</small><b>{story.sales30d.toLocaleString()}</b></p><p><small>VOLUME RANK</small><b>{story.insight?.volumePercentile ?? 0}TH %ILE</b></p></div></div>;
  if (story.storyKind === "market_matchup") return <><div className="matchup-detail"><span>HEAD-TO-HEAD MARKET</span>{(story.insight?.items ?? []).slice(0,2).map((market,index) => <article key={market.id}><InsightImage insight={market}/><div><small>{index === 0 ? "MARKET A" : "MARKET B"}</small><strong>{market.player}</strong><span>{market.cardTitle}</span><p><b>{market.grade}</b><b>{currency(market.currentValue)}</b><b className={market.change30d < 0 ? "down" : "up"}>{moveLabel(market.change30d)}</b><b>{market.sales30d} sales</b></p></div>{index === 0 ? <i>VS</i> : null}</article>)}</div></>;
  if (story.storyKind === "high_sales_30d") {
    const recentShare = story.sales30d ? Math.round((story.sales7d / story.sales30d) * 100) : 0;
    return <><div className="volume-detail"><span>30-DAY SALES</span><strong>{story.sales30d.toLocaleString()}</strong><b>{story.sales7d} in the last 7 days</b><small>{recentShare}% of monthly sales occurred this week</small></div><MetricGrid story={story}/></>;
  }
  if (story.storyKind === "recent_sale") return <div className="receipt-detail"><span>CONFIRMED SALE · {story.grade}</span><strong>{currency(story.recentSale?.price ?? story.currentValue)}</strong><div><b>{story.recentSale ? dateLabel(story.recentSale.date) : "Today"}</b><small>{story.recentSale?.venue ?? "Recorded comp"}</small></div><p>Current FMV <b>{currency(story.currentValue)}</b></p></div>;
  if (story.storyKind === "grade_gap") return <><div className="gap-detail"><span>GRADING PRICE LADDER</span><strong>{story.gradeGapMultiple.toFixed(1)}×</strong><small>{story.gradePrices[0]?.grade} TO {story.gradePrices[story.gradePrices.length - 1]?.grade} PREMIUM</small>{story.gradePrices.map((item,index) => <div key={item.grade} className={index === 0 ? "premium" : ""}><span><b>{item.grade}</b>{gradePremiumLabel(story.gradePrices,index) ? <small>{gradePremiumLabel(story.gradePrices,index)}</small> : null}</span><strong>{currency(item.price)}</strong></div>)}</div><div className="detail-price compact"><span>CURRENT FMV · {story.grade}</span><strong>{currency(story.currentValue)}</strong></div></>;
  if (story.storyKind === "sales_surge") {
    const recentDaily = story.sales7d / 7;
    const priorDaily = story.previous23DaySales / 23;
    return <><div className="surge-detail"><span>SALES VELOCITY</span><strong>{story.salesPaceMultiple.toFixed(1)}×</strong><small>FASTER DAILY PACE</small><div><p><b>{priorDaily.toFixed(1)}</b><span>DAILY · PRIOR 23D</span></p><i>→</i><p><b>{recentDaily.toFixed(1)}</b><span>DAILY · LAST 7D</span></p></div></div><SalesContextGrid story={story} surge/></>;
  }
  if (story.storyKind === "rookie_watch") {
    return <div className="rookie-detail"><b>RC</b><div><span>ROOKIE CARD FMV · {story.grade}</span><strong>{currency(story.currentValue)}</strong><small>{story.sales30d} recorded sales in 30 days</small></div></div>;
  }
  if (story.storyKind === "vintage_mover") {
    return <div className="vintage-detail"><span>VINTAGE MARKET</span><strong>{story.cardYear || "VINTAGE"}</strong><div><p><small>CARD GRADE</small><b>{story.grade}</b></p><p><small>CURRENT FMV</small><b>{currency(story.currentValue)}</b></p></div><em className={negative ? "down" : "up"}>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}% OVER 30 DAYS</em></div>;
  }
  const oldValue = priorValue(story);
  const dollarMove = story.currentValue - oldValue;
  return <div className="detail-price"><span>30-DAY CARD VALUE {story.storyKind === "biggest_loss" ? "DECLINE" : "INCREASE"} · {story.grade}</span><strong>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}%</strong><b>{currency(story.currentValue)} FMV · {(dollarMove < 0 ? "−" : "+") + currency(Math.abs(dollarMove))}</b></div>;
}

function MarketDetail({ story, close,previous }: { story: MarketStory; close: () => void;previous?: StoredMarketSnapshot }) {
  const format = MARKET_FORMATS[story.storyKind];
  const combinedMarket = ["player_snapshot","market_matchup"].includes(story.storyKind);
  return <section className={"detail-face market-detail " + kindClass(story.storyKind)}>
    <header className="detail-header"><button onClick={close} aria-label="Return to story">←</button><div><span>{format.label}</span><strong>{story.player}</strong></div><b>{format.icon}</b></header>
    <div className="detail-scroll">
      <MarketDetailLead story={story}/>
      {!combinedMarket ? <CollectorEvidence story={story} previous={previous}/> : null}
      <div className="why"><span>COLLECTOR TAKEAWAY</span><p>{story.summary}</p></div>
    </div>
    <button className="return-cue" onClick={close}>← SWIPE LEFT TO RETURN</button>
  </section>;
}

function NewsDetail({ story, close }: { story: NewsStory; close: () => void }) {
  return <section className="detail-face news-detail">
    <header className="detail-header"><button onClick={close} aria-label="Return to story">←</button><div><span>{newsTypeLabel(story)}</span><strong>{story.player}</strong></div><b>N</b></header>
    <div className="detail-scroll">
      <div className="article-meta"><span>{story.category}</span><b>{story.source}</b><small>{dateLabel(story.publishedAt)}</small></div>
      <h2 className="article-headline">{story.headline}</h2>
      <div className="article-image"><Image src={story.imageUrl} alt={story.player} fill sizes="(max-width: 799px) 92vw, 55vw"/></div>
      <p className="article-summary">{story.summary}</p>
      <a className="article-link" href={story.articleUrl} target="_blank" rel="noreferrer">READ THE ORIGINAL ARTICLE <b>↗</b></a>
    </div>
    <button className="return-cue" onClick={close}>← SWIPE LEFT TO RETURN</button>
  </section>;
}

function Story({ story,previous }: { story: FeedStory;previous?: StoredMarketSnapshot }) {
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
      {story.type === "market" ? <MarketDetail story={story} close={() => setOpen(false)} previous={previous}/> : <NewsDetail story={story} close={() => setOpen(false)}/>}
    </div>
  </article>;
}

function EmptyFeed() {
  return <section className="empty-feed">
    <PulseLogo/>
    <div><span>LIVE FEED</span><h1>No verified stories yet.</h1><p>Published news and live card-market updates will appear here as they become available.</p></div>
  </section>;
}

function WelcomeScreen({ start }: { start: () => void }) {
  return <section className="pulse-intro" aria-labelledby="pulse-intro-title">
    <header><PulseLogo/><span>YOUR HOBBY FEED</span></header>
    <div className="intro-body">
      <span className="intro-kicker">MARKET INTELLIGENCE · CURATED NEWS</span>
      <h1 id="pulse-intro-title">Know what’s moving.</h1>
      <p>See what’s moving, selling and making news in the cards you care about.</p>
      <div className="intro-topics" aria-label="Pulse coverage">
        <span>PRICE MOVES</span><span>RECENT SALES</span><span>CARD NEWS</span>
      </div>
      <div className="intro-controls" aria-label="How to use Pulse">
        <article><b aria-hidden="true">↑</b><div><span>SCROLL UP</span><strong>NEXT STORY</strong></div></article>
        <article><b aria-hidden="true">→</b><div><span>SWIPE RIGHT</span><strong>DETAILS &amp; STATS</strong></div></article>
      </div>
    </div>
    <button className="intro-start" onClick={start}><span>START EXPLORING</span><b aria-hidden="true">→</b></button>
  </section>;
}

const RECENT_CARD_STORAGE_KEY = "cm_pulse_recent_cards_v1";
const MARKET_SNAPSHOT_STORAGE_KEY = "cm_pulse_market_snapshots_v1";
const MARKET_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function PulseFeed({ initialStories,showIntroInitially = false }: { initialStories: FeedStory[]; showIntroInitially?: boolean }) {
  const cycleRef = useRef(0);
  const appendingRef = useRef(false);
  const sourceStories = useRef(initialStories);
  const recentCardTimestamps = useRef<Record<string,number>>({});
  const storedMarketSnapshots = useRef<Record<string,StoredMarketSnapshot>>({});
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewedStoryId = useRef<string | null>(null);
  const [showIntro,setShowIntro] = useState(showIntroInitially);
  const [previousMarketSnapshots,setPreviousMarketSnapshots] = useState<Record<string,StoredMarketSnapshot>>({});
  const [entries,setEntries] = useState(() => initialStories.map((story,index) => ({
    instanceId:`0-${index}-${story.id}`,
    story,
  })));

  useEffect(() => {
    if (showIntro) return;
    const now = Date.now();
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_CARD_STORAGE_KEY) ?? "{}") as Record<string,number>;
      recentCardTimestamps.current = Object.fromEntries(Object.entries(stored).filter(([,viewedAt]) =>
        Number.isFinite(viewedAt) && now - viewedAt < RECENT_CARD_COOLDOWN_MS,
      ));
    } catch {
      recentCardTimestamps.current = {};
    }
    try {
      const stored = JSON.parse(localStorage.getItem(MARKET_SNAPSHOT_STORAGE_KEY) ?? "{}") as Record<string,StoredMarketSnapshot>;
      storedMarketSnapshots.current = Object.fromEntries(Object.entries(stored).filter(([,snapshot]) =>
        snapshot && Number.isFinite(snapshot.currentValue) && Number.isFinite(snapshot.sales30d)
          && Number.isFinite(snapshot.viewedAt) && now - snapshot.viewedAt < MARKET_SNAPSHOT_MAX_AGE_MS,
      ));
      setPreviousMarketSnapshots({ ...storedMarketSnapshots.current });
    } catch {
      storedMarketSnapshots.current = {};
      setPreviousMarketSnapshots({});
    }
    const remixed = remixFeedStories(initialStories,undefined,{ recentCardTimestamps:recentCardTimestamps.current,now });
    sourceStories.current = remixed;
    cycleRef.current = 0;
    setEntries(remixed.map((story,index) => ({ instanceId:`0-${index}-${story.id}`,story })));
    if (remixed[0]) scheduleStoryViewed(remixed[0]);
    return () => {
      if (viewTimer.current) clearTimeout(viewTimer.current);
    };
  },[initialStories,showIntro]);

  function markStoryViewed(story: FeedStory) {
    if (lastViewedStoryId.current === story.id) return;
    lastViewedStoryId.current = story.id;
    const now = Date.now();
    for (const key of storyCardKeys(story)) recentCardTimestamps.current[key] = now;
    if (story.type === "market") {
      storedMarketSnapshots.current[story.cardId] = {
        currentValue:story.currentValue,sales30d:story.sales30d,updatedAt:story.updatedAt,viewedAt:now,
      };
    }
    try {
      localStorage.setItem(RECENT_CARD_STORAGE_KEY,JSON.stringify(recentCardTimestamps.current));
      localStorage.setItem(MARKET_SNAPSHOT_STORAGE_KEY,JSON.stringify(storedMarketSnapshots.current));
    } catch {
      // Feed behavior remains intact when private browsing blocks local storage.
    }
  }

  function scheduleStoryViewed(story: FeedStory) {
    if (viewTimer.current) clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(() => markStoryViewed(story),800);
  }

  function appendRemixedCycle() {
    if (appendingRef.current || sourceStories.current.length === 0) return;
    appendingRef.current = true;
    setEntries((current) => {
      const recentHistory = current.slice(-20).map((entry) => entry.story);
      const nextCycle = remixFeedStories(sourceStories.current,recentHistory,{
        recentCardTimestamps:recentCardTimestamps.current,
      });
      cycleRef.current += 1;
      return [...current,...nextCycle.map((story,index) => ({
        instanceId:`${cycleRef.current}-${index}-${story.id}`,
        story,
      }))];
    });
    requestAnimationFrame(() => {
      appendingRef.current = false;
    });
  }

  function handleScroll(event: React.UIEvent<HTMLElement>) {
    const feed = event.currentTarget;
    const visibleIndex = Math.max(0,Math.min(entries.length - 1,Math.round(feed.scrollTop / feed.clientHeight)));
    if (entries[visibleIndex]) scheduleStoryViewed(entries[visibleIndex].story);
    const remaining = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    if (remaining < feed.clientHeight * 3) appendRemixedCycle();
  }

  function dismissIntro() {
    document.cookie = "cm_pulse_intro_v1=seen; Path=/; Max-Age=31536000; SameSite=Lax";
    setShowIntro(false);
  }

  if (showIntro) return <main className="app-shell"><WelcomeScreen start={dismissIntro}/></main>;

  return <main className="app-shell">
    <nav className="desktop-nav"><PulseLogo/><div><button className="active">For You</button><button>Market</button><button>News</button></div><a href="/admin/news">News Admin</a></nav>
    <section className="feed" aria-label="Pulse market and news feed" onScroll={handleScroll}>
      {entries.length ? entries.map(({instanceId,story}) => <Story key={instanceId} story={story} previous={story.type === "market" ? previousMarketSnapshots[story.cardId] : undefined}/>) : <EmptyFeed/>}
    </section>
    <nav className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>○</b><span>Compete</span></button><button><b>□</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>●</b><span>Profile</span></button></nav>
  </main>;
}
