"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { playerPreferenceKey, RECENT_CARD_COOLDOWN_MS, remixFeedStories, storyCardKeys } from "@/lib/feed-order";
import { storyRequiresCurrentValueDirection, valueDirectionIsCurrent } from "@/lib/market-freshness";
import type { FeedStory, MarketInsightItem, MarketStory, MarketStoryKind, NewsStory } from "@/lib/types";

function PulseLogo() {
  return <div className="pulse-logo" aria-label="Card Madness Pulse"><Image className="pulse-brand-mark" src="/card-madness-symbol.png" alt="" width={40} height={50}/><b>PULSE</b></div>;
}

type PreferenceAction = "follow" | "less";
type PlayerPreferences = { version:1;followed:string[];less:string[] };
type PreferenceChange = (player: string,action: PreferenceAction) => void;

const EMPTY_PLAYER_PREFERENCES:PlayerPreferences = { version:1,followed:[],less:[] };

function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.7Z"/></svg>;
}

function ShowLessIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 3.5h8.2c1 0 1.8.6 2.1 1.5l2 6.1c.4 1.2-.5 2.4-1.7 2.4h-4.2l.6 3.1c.3 1.5-.5 3-1.8 3.7l-.8.4-3.8-7.2H4.7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.8v9.5"/></svg>;
}

function PreferenceControls({ player,preferences,onChange }: {
  player:string;preferences:PlayerPreferences;onChange:PreferenceChange;
}) {
  const key = playerPreferenceKey(player);
  const followed = preferences.followed.includes(key);
  const less = preferences.less.includes(key);
  return <div className="story-preferences" aria-label={`Feed preferences for ${player}`} onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}>
    <button className={followed ? "preference-button follow active" : "preference-button follow"} type="button" aria-label={followed ? `Stop following ${player}` : `Follow ${player}`} aria-pressed={followed} title={followed ? `Following ${player}` : `Follow ${player}`} onClick={() => onChange(player,"follow")}>
      <StarIcon/>
    </button>
    <button className={less ? "preference-button less active" : "preference-button less"} type="button" aria-label={less ? `Remove show less for ${player}` : `Show less of ${player}`} aria-pressed={less} title={less ? `Showing less of ${player}` : `Show less of ${player}`} onClick={() => onChange(player,"less")}>
      <ShowLessIcon/>
    </button>
  </div>;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US",{
    style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1,
  }).format(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(value);
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(date)
    : "Date unavailable";
}

function ageLabel(days: number) {
  if (days <= 0) return "TODAY";
  if (days === 1) return "1D OLD";
  return `${days}D OLD`;
}

function marketFreshnessLabel(story: MarketStory) {
  if (story.storyKind === "player_index") return `INDEX DATA · ${ageLabel(story.freshnessDays)}`;
  if (["player_snapshot","market_matchup"].includes(story.storyKind)) return "MULTI-CARD VIEW";
  return `${story.grade} VALUE · ${ageLabel(story.freshnessDays)}`;
}

function marketFreshnessDescription(story: MarketStory) {
  if (story.storyKind === "player_index") return `Player Index data is ${ageLabel(story.freshnessDays).toLocaleLowerCase()}.`;
  if (["player_snapshot","market_matchup"].includes(story.storyKind)) return "This page combines multiple card records.";
  return `${story.grade} estimated value is ${ageLabel(story.freshnessDays).toLocaleLowerCase()}. Sales activity is card-wide across all grades.`;
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
  player_index:{ label:"30-DAY PLAYER INDEX",icon:"PI",cue:"VALUE, LIQUIDITY & SCORE" },
  player_snapshot:{ label:"PLAYER MARKET",icon:"P",cue:"CARDS, SALES & DIRECTION" },
  price_volume:{ label:"PRICE + VOLUME",icon:"↕",cue:"SIGNAL, LIQUIDITY & COMPS" },
  market_matchup:{ label:"MARKET MATCHUP",icon:"VS",cue:"COMPARE BOTH MARKETS" },
};

function marketFormat(story: MarketStory) {
  const format = MARKET_FORMATS[story.storyKind];
  if (valueDirectionIsCurrent(story.freshnessDays)) return format;
  if (story.storyKind === "vintage_mover") return { label:"VINTAGE ACTIVITY",icon:"V",cue:"SALES, GRADE & VALUE" };
  if (story.storyKind === "biggest_gain" || story.storyKind === "biggest_loss") {
    return { label:"CARD ACTIVITY",icon:"30",cue:"SALES, GRADE & VALUE" };
  }
  return format;
}

function kindClass(kind: MarketStoryKind) {
  return "market-" + kind.replaceAll("_","-");
}

function CardImage({ story }: { story: MarketStory }) {
  return <div className="market-card-image"><Image src={story.imageUrl} alt={story.cardTitle} fill sizes="(max-width: 430px) 45vw, 190px"/></div>;
}

function InsightImage({ insight, className = "" }: { insight: MarketInsightItem; className?: string }) {
  return <div className={`insight-card-image ${className}`}><Image src={insight.imageUrl} alt={insight.cardTitle} fill sizes="(max-width: 430px) 40vw, 170px"/></div>;
}

function PlayerIndexPortrait({ story }: { story: MarketStory }) {
  const [failed,setFailed] = useState(false);
  const initials = story.player.split(/\s+/).map((part) => part[0]).join("").slice(0,2);
  const tallPortrait = story.imageUrl.includes("mlbstatic.com");
  return <div className="player-index-portrait" data-tall={tallPortrait ? "true" : "false"}>
    {failed
      ? <div className="player-index-portrait-fallback" aria-hidden="true">{initials}</div>
      : <Image src={story.imageUrl} alt={`${story.player} portrait`} fill sizes="(max-width: 430px) 58vw, 245px" onError={() => setFailed(true)}/>}
  </div>;
}

function moveLabel(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
}

function playerIndexFeature(story: MarketStory) {
  const insight = story.insight;
  const metric = insight?.featureMetric ?? "average_sale_change";
  const value = insight?.featureValue ?? insight?.averageSaleChange30d ?? 0;
  const direction = insight?.featureDirection ?? (value > 0 ? "up" : value < 0 ? "down" : "neutral");
  if (metric === "market_breadth") return {
    display:`${Math.round(value)}%`,label:`TRACKED CARDS ${direction === "up" ? "RISING" : "FALLING"}`,
    context:"CURRENT 30-DAY BREADTH",direction,
  };
  if (metric === "traded_value") return {
    display:compactCurrency(value),label:"TRADED IN 30 DAYS",context:"VERIFIED PLAYER MARKET",direction,
  };
  const label = metric === "sales_change" ? "RECORDED SALES"
    : metric === "traded_value_change" ? "TRADED VALUE" : "AVERAGE SALE";
  return { display:moveLabel(value),label:`${label} ${direction === "up" ? "UP" : direction === "down" ? "DOWN" : "FLAT"}`,context:"VS PRIOR 30 DAYS",direction };
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

  if (storyRequiresCurrentValueDirection(story.storyKind) && !valueDirectionIsCurrent(story.freshnessDays)) return <div className="market-stage volume-stage">
    <CardImage story={story}/><div className="volume-tally"><GradeStamp grade={story.grade}/><small>CARD-WIDE SALES</small><strong>{story.sales30d.toLocaleString()}</strong><b>ALL GRADES · 30 DAYS</b><span>{story.sales7d.toLocaleString()} card-wide sales in the last 7 days</span></div>
  </div>;

  if (story.storyKind === "high_sales_30d") return <div className="market-stage volume-stage">
    <CardImage story={story}/><div className="volume-tally"><GradeStamp grade={story.grade}/><small>CARD-WIDE SALES</small><strong>{story.sales30d.toLocaleString()}</strong><b>ALL GRADES · 30 DAYS</b><span>{story.sales7d.toLocaleString()} card-wide sales in the last 7 days</span></div>
  </div>;

  if (story.storyKind === "biggest_gain" || story.storyKind === "biggest_loss") {
    const loss = story.storyKind === "biggest_loss";
    return <div className="market-stage mover-stage"><CardImage story={story}/><div className="mover-tally"><GradeStamp grade={story.grade}/><small>CARD-WIDE 30D MOVE</small><strong>{loss ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}%</strong><b>{loss ? "MOVING LOWER" : "MOVING HIGHER"}</b><span>{story.grade} estimated value<br/>{currency(story.currentValue)}</span></div></div>;
  }

  if (story.storyKind === "recent_sale") return <div className="market-stage sale-stage"><CardImage story={story}/><div className="sale-ticket"><GradeStamp grade={story.grade}/><small>CONFIRMED COMP</small><b>SOLD TODAY</b><strong>{currency(story.recentSale?.price ?? story.currentValue)}</strong><span>{story.recentSale?.venue ?? "Recorded sale"}</span><em>{story.recentSale ? dateLabel(story.recentSale.date) : "Today"}</em></div></div>;

  if (story.storyKind === "grade_gap") {
    const prices = story.gradePrices.length >= 2 ? story.gradePrices : [{ grade:story.grade,price:story.currentValue }];
    return <div className="market-stage gap-stage"><CardImage story={story}/><div className="grade-ladder"><small>GRADE PRICE ESTIMATES</small>{prices.map((item,index) => <div key={item.grade} className={index === 0 ? "premium" : ""}><span>{item.grade}</span><strong>{currency(item.price)}</strong>{gradePremiumLabel(prices,index) ? <em>{gradePremiumLabel(prices,index)}</em> : null}</div>)}<b>{prices[0].grade} IS {story.gradeGapMultiple.toFixed(1)}× {prices[prices.length - 1].grade}</b></div></div>;
  }

  if (story.storyKind === "sales_surge") return <div className="market-stage surge-stage"><CardImage story={story}/><div className="surge-tally"><GradeStamp grade={story.grade}/><small>CARD-WIDE SALES PACE</small><strong>{story.salesPaceMultiple.toFixed(1)}×</strong><b>FASTER</b><div><span><strong>{story.sales7d}</strong>LAST 7D</span><i>→</i><span><strong>{story.previous23DaySales}</strong>PRIOR 23D</span></div></div></div>;

  if (story.storyKind === "vintage_mover") return <div className="market-stage vintage-stage"><div className="vintage-card-wrap"><CardImage story={story}/></div><div className="vintage-tally"><GradeStamp grade={story.grade}/><small>VINTAGE CARD</small><strong>{story.cardYear || "VINTAGE"}</strong><b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b><span>Card-wide 30-day move<br/>{story.grade} value · {currency(story.currentValue)}</span></div></div>;

  const currentDirection = valueDirectionIsCurrent(story.freshnessDays);
  return <div className="market-stage rookie-stage"><div className="rookie-card-wrap"><span>RC</span><CardImage story={story}/></div><div className="rookie-tally"><GradeStamp grade={story.grade}/><small>{story.grade} EST. VALUE</small><strong>{currency(story.currentValue)}</strong>{currentDirection ? <b className={story.change30d < 0 ? "down" : "up"}>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</b> : <b>{story.sales30d} SALES</b>}<span>{currentDirection ? "Card-wide 30-day move" : "All grades · 30 days"}</span></div></div>;
}

function PlayerIndexFront({ story, open,preferenceControls }: { story: MarketStory;open: () => void;preferenceControls?:React.ReactNode }) {
  const insight = story.insight;
  const feature = playerIndexFeature(story);
  const averageSale = compactCurrency(insight?.averageSale30d ?? 0);
  const activity = insight?.featureMetric === "sales_change"
    ? [{ label:"TRADED VALUE",value:compactCurrency(insight?.totalValue30d ?? 0) },{ label:"AVERAGE SALE",value:averageSale }]
    : insight?.featureMetric === "traded_value" || insight?.featureMetric === "traded_value_change"
      ? [{ label:"AVERAGE SALE",value:averageSale },{ label:"RECORDED SALES",value:compactNumber(insight?.totalSales30d ?? 0) }]
      : [{ label:"TRADED VALUE",value:compactCurrency(insight?.totalValue30d ?? 0) },{ label:"RECORDED SALES",value:compactNumber(insight?.totalSales30d ?? 0) }];
  return <section className="story-face market-face market-player-index player-index-front">
    <header><PulseLogo/><span className="live-pill" title={marketFreshnessDescription(story)} aria-label={marketFreshnessDescription(story)}>{marketFreshnessLabel(story)}</span></header>
    <div className="player-index-type"><b aria-hidden="true">PI</b><div className="type-copy"><span>PLAYER INDEX</span><strong>30-DAY MARKET VIEW</strong></div>{preferenceControls}</div>
    <div className="player-index-hero">
      <PlayerIndexPortrait key={story.imageUrl} story={story}/>
      <div className="player-index-hero-shade"/>
      <div className="player-index-score-badge"><span>TRADE SCORE</span><strong>{insight?.score ?? 0}</strong><b>{insight?.scoreLabel ?? "INDEX"}</b></div>
      <div className="player-index-hero-copy">
        <span>{story.sport} · PLAYER MARKET</span>
        <h1>{story.player}</h1>
        <div className="player-index-move"><strong className={feature.direction === "down" ? "down" : feature.direction === "up" ? "up" : undefined}>{feature.display}</strong><p>{feature.label}<b>{feature.context}</b></p></div>
      </div>
    </div>
    <div className="player-index-activity" aria-label="30-day Player Index activity">
      <p><span>{activity[0].label}</span><strong>{activity[0].value}</strong></p>
      <i/>
      <p><span>{activity[1].label}</span><strong>{activity[1].value}</strong></p>
    </div>
    <button className="detail-cue market-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>VIEW FULL PLAYER INDEX</strong><b>→</b></button>
  </section>;
}

function MarketFront({ story, open,preferenceControls }: { story: MarketStory; open: () => void;preferenceControls?:React.ReactNode }) {
  if (story.storyKind === "player_index") return <PlayerIndexFront story={story} open={open} preferenceControls={preferenceControls}/>;
  const format = marketFormat(story);
  const styleClass = kindClass(story.storyKind);
  const showCardTitle = !["player_index","player_snapshot","market_matchup"].includes(story.storyKind);
  return <section className={"story-face market-face " + styleClass}>
    <header><PulseLogo/><span className="live-pill" title={marketFreshnessDescription(story)} aria-label={marketFreshnessDescription(story)}>{marketFreshnessLabel(story)}</span></header>
    <div className="type-banner market-banner"><b aria-hidden="true">{format.icon}</b><div className="type-copy"><span>MARKET DATA</span><strong>{format.label}</strong></div>{preferenceControls}</div>
    <h1>{story.headline}</h1>
    <MarketFrontVisual story={story}/>
    {showCardTitle ? <p className="market-card-title">{story.cardTitle}</p> : null}
    <button className="detail-cue market-cue" onClick={open}><span>SWIPE RIGHT OR TAP</span><strong>{format.cue}</strong><b>→</b></button>
  </section>;
}

function NewsFront({ story, open,preferenceControls }: { story: NewsStory; open: () => void;preferenceControls?:React.ReactNode }) {
  return <section className="story-face news-face">
    <header><PulseLogo/><span className="live-pill">CURATED</span></header>
    <div className="type-banner news-banner"><b>N</b><div className="type-copy"><span>{newsTypeLabel(story)}</span><strong>{story.category}</strong></div>{preferenceControls}</div>
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
  const currentDirection = valueDirectionIsCurrent(story.freshnessDays);
  return <div className="metric-grid">{currentDirection ? <><div><span>CARD-WIDE 7D MOVE</span><strong>{story.change7d > 0 ? "+" : ""}{story.change7d.toFixed(1)}%</strong></div><div><span>CARD-WIDE 30D MOVE</span><strong>{story.change30d > 0 ? "+" : ""}{story.change30d.toFixed(1)}%</strong></div></> : <><div><span>{story.grade} VALUE AGE</span><strong>{ageLabel(story.freshnessDays)}</strong></div><div><span>{story.grade} EST. VALUE</span><strong>{currency(story.currentValue)}</strong></div></>}<div><span>7D SALES · ALL GRADES</span><strong>{story.sales7d}</strong></div><div><span>30D SALES · ALL GRADES</span><strong>{story.sales30d}</strong></div></div>;
}

function SalesContextGrid({ story, surge = false }: { story: MarketStory; surge?: boolean }) {
  return <div className="metric-grid"><div><span>7D SALES · ALL GRADES</span><strong>{story.sales7d}</strong></div><div><span>{surge ? "PRIOR 23D · ALL GRADES" : "30D SALES · ALL GRADES"}</span><strong>{surge ? story.previous23DaySales : story.sales30d}</strong></div><div><span>{surge ? "30D TOTAL · ALL GRADES" : "VALUE AGE"}</span><strong>{surge ? story.sales30d : ageLabel(story.freshnessDays)}</strong></div><div><span>{story.grade} EST. VALUE</span><strong>{currency(story.currentValue)}</strong></div></div>;
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

type StoredMarketSnapshot = { currentValue:number;sales30d:number;grade?:string;updatedAt:string;viewedAt:number };

function visitChangeLabel(story: MarketStory, previous?: StoredMarketSnapshot) {
  if (!previous || previous.updatedAt === story.updatedAt) return null;
  const comparableGrade = previous.grade === story.grade;
  const valueChange = comparableGrade ? story.currentValue - previous.currentValue : 0;
  const percentChange = previous.currentValue > 0 ? valueChange / previous.currentValue * 100 : 0;
  const volumeChange = story.sales30d - previous.sales30d;
  if (Math.abs(valueChange) < 0.005 && volumeChange === 0) return null;
  const pieces:string[] = [];
  if (Math.abs(valueChange) >= 0.005) pieces.push(`${story.grade} value ${valueChange < 0 ? "−" : "+"}${preciseCurrency(Math.abs(valueChange))} (${signedDifference(percentChange)})`);
  if (volumeChange !== 0) pieces.push(`card-wide 30-day sales ${volumeChange > 0 ? "+" : "−"}${Math.abs(volumeChange).toLocaleString()}`);
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
  const currentDirection = valueDirectionIsCurrent(story.freshnessDays);
  const reversal = currentDirection && Math.abs(story.change7d) >= 1
    && Math.abs(story.change30d) >= 1
    && Math.sign(story.change7d) !== Math.sign(story.change30d);
  const confidence = story.confidenceGrade === "A" ? "HIGH EVIDENCE" : story.confidenceGrade === "B" ? "GOOD EVIDENCE" : "LIMITED EVIDENCE";
  const sinceVisit = visitChangeLabel(story,previous);

  return <section className="collector-evidence" aria-label="Collector market evidence">
    <header><div><span>COLLECTOR SIGNALS</span><strong>{confidence}</strong></div><b>{story.comps.length} {story.grade} COMPS · {marketFreshnessLabel(story)}</b></header>
    {sinceVisit ? <p className="since-visit"><b>CHANGED SINCE YOUR LAST VIEW</b><span>{sinceVisit}</span></p> : null}
    <div className="evidence-grid">
      <article><span>LATEST {story.grade} SALE VS VALUE</span><strong className={latestVsFmv < 0 ? "down" : latestVsFmv > 0 ? "up" : undefined}>{signedDifference(latestVsFmv)}</strong><small>{latest ? `${preciseCurrency(latest.price)} sale · ${preciseCurrency(story.currentValue)} estimate` : `No recent ${story.grade} sale`}</small></article>
      <article><span>RECENT {story.grade} RANGE</span><strong>{prices.length ? `${preciseCurrency(minimum)}–${preciseCurrency(maximum)}` : "N/A"}</strong><small>{prices.length ? `${stability} SPREAD · ${spread.toFixed(1)}%` : "Not enough comps"}</small></article>
      <article><span>CARD-WIDE LIQUIDITY</span><strong>{liquidity}</strong><small>{story.sales30d.toLocaleString()} sales · all grades · 30 days</small></article>
      <article><span>CARD-WIDE SALES PACE</span><strong className={paceChange < 0 ? "down" : paceChange > 0 ? "up" : undefined}>{signedDifference(paceChange)}</strong><small>all grades · vs preceding 23 days</small></article>
    </div>
    {reversal ? <p className="momentum-reversal"><b>MOMENTUM REVERSAL</b><span>{signedDifference(story.change7d)} over 7 days vs {signedDifference(story.change30d)} over 30 days</span></p> : null}
    <div className="evidence-sales"><h2>LAST {sales.length || 3} VERIFIED {story.grade} SALES</h2>{sales.length ? sales.map((sale,index) => <article key={sale.date + index}><span><b>{dateLabel(sale.date)}</b><small>{sale.venue ?? "Recorded sale"}</small></span><strong>{preciseCurrency(sale.price)}</strong></article>) : <p>No recent verified {story.grade} sales available.</p>}</div>
    <footer>Grade-specific values and comps are labeled separately from card-wide sales across all grades. Signals are not a recommendation to buy, sell or grade.</footer>
  </section>;
}

function InsightMarketRows({ label, items,cardLevelSales = false }: { label:string; items:MarketInsightItem[];cardLevelSales?:boolean }) {
  if (!items.length) return null;
  return <section className="insight-market-list"><header>{label}</header>{items.map((market) => <article key={market.id}>
    <InsightImage insight={market}/><div><strong>{market.player}</strong><span>{market.cardTitle}</span><small>{market.grade}{cardLevelSales ? " representative price" : ""} · {market.sales30d.toLocaleString()} {cardLevelSales ? "card-level " : ""}sales</small></div><aside><b>{currency(market.currentValue)}</b><em className={market.change30d < 0 ? "down" : "up"}>{moveLabel(market.change30d)}</em></aside>
  </article>)}</section>;
}

function MarketDetailLead({ story }: { story: MarketStory }) {
  const negative = story.change30d < 0;
  if (story.storyKind === "player_index") {
    const insight = story.insight;
    const breakdown = insight?.scoreBreakdown;
    const averageMovement = insight?.averageSaleChange30d ?? 0;
    return <>
      <section className="player-index-detail">
        <div className="index-score-detail"><span>TRADE SCORE</span><strong>{insight?.score ?? 0}</strong><b>{insight?.scoreLabel ?? "INDEX"}</b><small>Market activity score—not a buy or sell rating</small></div>
        <div className="index-detail-metrics">
          <article><span>30D TRADED VALUE</span><strong>{currency(insight?.totalValue30d ?? 0)}</strong><small>{signedDifference(insight?.totalValueChange30d ?? 0)} vs prior 30d</small></article>
          <article><span>AVERAGE SALE</span><strong>{currency(insight?.averageSale30d ?? 0)}</strong><small className={averageMovement < 0 ? "down" : "up"}>{moveLabel(averageMovement)} vs prior 30d</small></article>
          <article><span>RECORDED SALES</span><strong>{(insight?.totalSales30d ?? 0).toLocaleString()}</strong><small>{signedDifference(insight?.salesChange30d ?? 0)} vs prior 30d</small></article>
          <article><span>ACTIVE CARDS</span><strong>{(insight?.cardsTracked ?? 0).toLocaleString()}</strong><small>{(insight?.catalogMatches ?? 0).toLocaleString()} exact catalog matches</small></article>
        </div>
      </section>
      {breakdown ? <section className="index-score-breakdown"><header>SCORE BREAKDOWN</header>{Object.entries(breakdown).map(([label,value]) => <article key={label}><span>{label.toUpperCase()}</span><strong>{value}</strong><small>/ 100</small></article>)}</section> : null}
      <InsightMarketRows label="MOST ACTIVE CARDS IN THIS INDEX" items={insight?.items ?? []} cardLevelSales/>
      <p className="index-method">Uses exact-player sales recorded in 60 fully closed daily buckets: the latest 30 days versus the prior 30. Trade Score weights liquidity 35%, momentum 25%, breadth 20%, stability 10% and evidence 10%. Traded value and average sale are transaction totals; average-price movement can also reflect a change in the mix of cards sold, including bulk lots.</p>
    </>;
  }
  if (story.storyKind === "player_snapshot") {
    const average = story.insight?.averageChange30d ?? 0;
    return <><div className="player-detail-summary"><span>PLAYER MARKET SNAPSHOT</span><strong className={average < 0 ? "down" : "up"}>{moveLabel(average)}</strong><b>WEIGHTED 30-DAY DIRECTION</b><div><p><small>TRACKED CARDS</small><b>{story.insight?.cardsTracked ?? 0}</b></p><p><small>RECORDED SALES</small><b>{story.insight?.totalSales30d?.toLocaleString() ?? 0}</b></p></div></div><InsightMarketRows label="CARDS IN THIS SNAPSHOT" items={story.insight?.items ?? []}/></>;
  }
  if (story.storyKind === "price_volume") return <div className="signal-detail"><span>PRICE + VOLUME SIGNAL</span><b>{story.insight?.label ?? "MARKET SIGNAL"}</b><strong className={negative ? "down" : "up"}>{moveLabel(story.change30d)}</strong><div><p><small>30-DAY SALES</small><b>{story.sales30d.toLocaleString()}</b></p><p><small>VOLUME RANK</small><b>{story.insight?.volumePercentile ?? 0}TH %ILE</b></p></div></div>;
  if (story.storyKind === "market_matchup") return <><div className="matchup-detail"><span>HEAD-TO-HEAD MARKET</span>{(story.insight?.items ?? []).slice(0,2).map((market,index) => <article key={market.id}><InsightImage insight={market}/><div><small>{index === 0 ? "MARKET A" : "MARKET B"}</small><strong>{market.player}</strong><span>{market.cardTitle}</span><p><b>{market.grade}</b><b>{currency(market.currentValue)}</b><b className={market.change30d < 0 ? "down" : "up"}>{moveLabel(market.change30d)}</b><b>{market.sales30d} sales</b></p></div>{index === 0 ? <i>VS</i> : null}</article>)}</div></>;
  if (story.storyKind === "high_sales_30d") {
    const recentShare = story.sales30d ? Math.round((story.sales7d / story.sales30d) * 100) : 0;
    return <><div className="volume-detail"><span>CARD-WIDE SALES · ALL GRADES</span><strong>{story.sales30d.toLocaleString()}</strong><b>{story.sales7d} card-wide sales in the last 7 days</b><small>{recentShare}% of all-grade monthly sales occurred this week</small></div><MetricGrid story={story}/></>;
  }
  if (story.storyKind === "recent_sale") return <div className="receipt-detail"><span>CONFIRMED SALE · {story.grade}</span><strong>{currency(story.recentSale?.price ?? story.currentValue)}</strong><div><b>{story.recentSale ? dateLabel(story.recentSale.date) : "Today"}</b><small>{story.recentSale?.venue ?? "Recorded comp"}</small></div><p>Current FMV <b>{currency(story.currentValue)}</b></p></div>;
  if (story.storyKind === "grade_gap") return <><div className="gap-detail"><span>GRADE PRICE ESTIMATES</span><strong>{story.gradeGapMultiple.toFixed(1)}×</strong><small>{story.gradePrices[0]?.grade} TO {story.gradePrices[story.gradePrices.length - 1]?.grade} PREMIUM</small>{story.gradePrices.map((item,index) => <div key={item.grade} className={index === 0 ? "premium" : ""}><span><b>{item.grade}</b>{gradePremiumLabel(story.gradePrices,index) ? <small>{gradePremiumLabel(story.gradePrices,index)}</small> : null}</span><strong>{currency(item.price)}</strong></div>)}</div><div className="detail-price compact"><span>{story.grade} ESTIMATED VALUE · {ageLabel(story.freshnessDays)}</span><strong>{currency(story.currentValue)}</strong></div></>;
  if (story.storyKind === "sales_surge") {
    const recentDaily = story.sales7d / 7;
    const priorDaily = story.previous23DaySales / 23;
    return <><div className="surge-detail"><span>SALES VELOCITY</span><strong>{story.salesPaceMultiple.toFixed(1)}×</strong><small>FASTER DAILY PACE</small><div><p><b>{priorDaily.toFixed(1)}</b><span>DAILY · PRIOR 23D</span></p><i>→</i><p><b>{recentDaily.toFixed(1)}</b><span>DAILY · LAST 7D</span></p></div></div><SalesContextGrid story={story} surge/></>;
  }
  if (story.storyKind === "rookie_watch") {
    return <div className="rookie-detail"><b>RC</b><div><span>{story.grade} ROOKIE ESTIMATED VALUE · {ageLabel(story.freshnessDays)}</span><strong>{currency(story.currentValue)}</strong><small>{story.sales30d} card-wide sales · all grades · 30 days</small></div></div>;
  }
  if (story.storyKind === "vintage_mover") {
    if (!valueDirectionIsCurrent(story.freshnessDays)) return <><div className="volume-detail"><span>VINTAGE CARD-WIDE SALES · ALL GRADES</span><strong>{story.sales30d.toLocaleString()}</strong><b>{story.sales7d} card-wide sales in the last 7 days</b><small>{story.grade} estimated value is {story.freshnessDays} days old</small></div><MetricGrid story={story}/></>;
    return <div className="vintage-detail"><span>VINTAGE CARD</span><strong>{story.cardYear || "VINTAGE"}</strong><div><p><small>SELECTED GRADE</small><b>{story.grade}</b></p><p><small>{story.grade} EST. VALUE</small><b>{currency(story.currentValue)}</b></p></div><em className={negative ? "down" : "up"}>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}% CARD-WIDE MOVE · 30 DAYS</em></div>;
  }
  if (storyRequiresCurrentValueDirection(story.storyKind) && !valueDirectionIsCurrent(story.freshnessDays)) {
    return <><div className="volume-detail"><span>CARD-WIDE SALES · ALL GRADES</span><strong>{story.sales30d.toLocaleString()}</strong><b>{story.sales7d} card-wide sales in the last 7 days</b><small>{story.grade} estimated value is {story.freshnessDays} days old; price direction is withheld</small></div><MetricGrid story={story}/></>;
  }
  return <div className="detail-price"><span>CARD-WIDE 30-DAY VALUE {story.storyKind === "biggest_loss" ? "DECLINE" : "INCREASE"}</span><strong>{negative ? "−" : "+"}{Math.abs(story.change30d).toFixed(1)}%</strong><b>{story.grade} EST. VALUE · {currency(story.currentValue)}</b></div>;
}

function MarketDetail({ story, close,previous }: { story: MarketStory; close: () => void;previous?: StoredMarketSnapshot }) {
  const format = marketFormat(story);
  const combinedMarket = ["player_index","player_snapshot","market_matchup"].includes(story.storyKind);
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

function preferencePlayer(story: FeedStory) {
  if (story.type === "market" && story.storyKind === "market_matchup") return null;
  if (story.type === "news" && ["HOBBY NEWS","INDUSTRY NEWS","NEWS"].includes(newsTypeLabel(story))) return null;
  return story.player.trim() || null;
}

function Story({ story,previous,preferences,onPreferenceChange }: {
  story:FeedStory;previous?:StoredMarketSnapshot;preferences:PlayerPreferences;onPreferenceChange:PreferenceChange;
}) {
  const [open,setOpen] = useState(false);
  const start = useRef<{x:number;y:number}|null>(null);
  const player = preferencePlayer(story);
  const preferenceControls = player
    ? <PreferenceControls player={player} preferences={preferences} onChange={onPreferenceChange}/>
    : null;
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
      {story.type === "market" ? <MarketFront story={story} open={() => setOpen(true)} preferenceControls={preferenceControls}/> : <NewsFront story={story} open={() => setOpen(true)} preferenceControls={preferenceControls}/>}
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
      <div className="intro-personalize" aria-label="How to personalize your Pulse feed">
        <div className="intro-preference-icons" aria-hidden="true"><span><StarIcon/></span><span><ShowLessIcon/></span></div>
        <div><span>PERSONALIZE YOUR FEED</span><p><strong>FOLLOW</strong> prioritizes verified player stories. <strong>SHOW LESS</strong> moves that player later.</p></div>
      </div>
    </div>
    <button className="intro-start" onClick={start}><span>START EXPLORING</span><b aria-hidden="true">→</b></button>
  </section>;
}

const RECENT_CARD_STORAGE_KEY = "cm_pulse_recent_cards_v1";
const MARKET_SNAPSHOT_STORAGE_KEY = "cm_pulse_market_snapshots_v1";
const PLAYER_PREFERENCES_STORAGE_KEY = "cm_pulse_player_preferences_v1";
const MARKET_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function playerPreferencesFromStorage(raw: string | null):PlayerPreferences {
  if (!raw) return EMPTY_PLAYER_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    const normalized = (values:unknown) => Array.isArray(values)
      ? [...new Set(values.filter((value):value is string => typeof value === "string").map(playerPreferenceKey).filter(Boolean))].slice(0,100)
      : [];
    const followed = normalized(parsed.followed);
    const followedSet = new Set(followed);
    return { version:1,followed,less:normalized(parsed.less).filter((key) => !followedSet.has(key)) };
  } catch {
    return EMPTY_PLAYER_PREFERENCES;
  }
}

function preferenceRemixOptions(preferences:PlayerPreferences) {
  return { followedPlayers:preferences.followed,lessPlayers:preferences.less };
}

export function PulseFeed({ initialStories,showIntroInitially = false }: { initialStories: FeedStory[]; showIntroInitially?: boolean }) {
  const cycleRef = useRef(0);
  const appendingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const sourceStories = useRef(initialStories);
  const playerPreferencesRef = useRef<PlayerPreferences>(EMPTY_PLAYER_PREFERENCES);
  const recentCardTimestamps = useRef<Record<string,number>>({});
  const storedMarketSnapshots = useRef<Record<string,StoredMarketSnapshot>>({});
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferenceNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewedStoryId = useRef<string | null>(null);
  const [showIntro,setShowIntro] = useState(showIntroInitially);
  const [playerPreferences,setPlayerPreferences] = useState<PlayerPreferences>(EMPTY_PLAYER_PREFERENCES);
  const [preferenceNotice,setPreferenceNotice] = useState("");
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
    let storedPreferences = EMPTY_PLAYER_PREFERENCES;
    try {
      storedPreferences = playerPreferencesFromStorage(localStorage.getItem(PLAYER_PREFERENCES_STORAGE_KEY));
    } catch {
      storedPreferences = EMPTY_PLAYER_PREFERENCES;
    }
    playerPreferencesRef.current = storedPreferences;
    setPlayerPreferences(storedPreferences);
    const remixed = remixFeedStories(initialStories,undefined,{
      recentCardTimestamps:recentCardTimestamps.current,now,...preferenceRemixOptions(storedPreferences),
    });
    sourceStories.current = remixed;
    cycleRef.current = 0;
    activeIndexRef.current = 0;
    setEntries(remixed.map((story,index) => ({ instanceId:`0-${index}-${story.id}`,story })));
    if (remixed[0]) scheduleStoryViewed(remixed[0]);
    return () => {
      if (viewTimer.current) clearTimeout(viewTimer.current);
      if (preferenceNoticeTimer.current) clearTimeout(preferenceNoticeTimer.current);
    };
  },[initialStories,showIntro]);

  function markStoryViewed(story: FeedStory) {
    if (lastViewedStoryId.current === story.id) return;
    lastViewedStoryId.current = story.id;
    const now = Date.now();
    for (const key of storyCardKeys(story)) recentCardTimestamps.current[key] = now;
    if (story.type === "market") {
      storedMarketSnapshots.current[story.cardId] = {
        currentValue:story.currentValue,sales30d:story.sales30d,grade:story.grade,updatedAt:story.updatedAt,viewedAt:now,
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

  function showPreferenceNotice(message:string) {
    setPreferenceNotice(message);
    if (preferenceNoticeTimer.current) clearTimeout(preferenceNoticeTimer.current);
    preferenceNoticeTimer.current = setTimeout(() => setPreferenceNotice(""),2800);
  }

  function rerankUpcomingStories(preferences:PlayerPreferences) {
    const nextCycleId = ++cycleRef.current;
    setEntries((current) => {
      if (!current.length) return current;
      const activeIndex = Math.max(0,Math.min(activeIndexRef.current,current.length - 1));
      const retained = current.slice(0,activeIndex + 1);
      const history = retained.slice(-20).map((entry) => entry.story);
      const upcoming = remixFeedStories(sourceStories.current,history,{
        recentCardTimestamps:recentCardTimestamps.current,...preferenceRemixOptions(preferences),
      });
      return [...retained,...upcoming.map((story,index) => ({
        instanceId:`preference-${nextCycleId}-${index}-${story.id}`,story,
      }))];
    });
  }

  function handlePreferenceChange(player:string,action:PreferenceAction) {
    const key = playerPreferenceKey(player);
    if (!key) return;
    const followed = new Set(playerPreferencesRef.current.followed);
    const less = new Set(playerPreferencesRef.current.less);
    let enabled = false;
    if (action === "follow") {
      enabled = !followed.has(key);
      if (enabled) {
        followed.add(key);
        less.delete(key);
      } else {
        followed.delete(key);
      }
    } else {
      enabled = !less.has(key);
      if (enabled) {
        less.add(key);
        followed.delete(key);
      } else {
        less.delete(key);
      }
    }
    const next:PlayerPreferences = { version:1,followed:[...followed],less:[...less] };
    playerPreferencesRef.current = next;
    setPlayerPreferences(next);
    try {
      localStorage.setItem(PLAYER_PREFERENCES_STORAGE_KEY,JSON.stringify(next));
    } catch {
      // The in-memory preference still works when private browsing blocks storage.
    }
    rerankUpcomingStories(next);
    showPreferenceNotice(action === "follow"
      ? enabled ? `Following ${player}. Verified stories will be prioritized when available.` : `Follow removed for ${player}.`
      : enabled ? `Showing less of ${player}.` : `Show less removed for ${player}.`);
  }

  function appendRemixedCycle() {
    if (appendingRef.current || sourceStories.current.length === 0) return;
    appendingRef.current = true;
    setEntries((current) => {
      const recentHistory = current.slice(-20).map((entry) => entry.story);
      const nextCycle = remixFeedStories(sourceStories.current,recentHistory,{
        recentCardTimestamps:recentCardTimestamps.current,
        ...preferenceRemixOptions(playerPreferencesRef.current),
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
    activeIndexRef.current = visibleIndex;
    if (entries[visibleIndex]) scheduleStoryViewed(entries[visibleIndex].story);
    const remaining = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    if (remaining < feed.clientHeight * 3) appendRemixedCycle();
  }

  function dismissIntro() {
    document.cookie = "cm_pulse_intro_v2=seen; Path=/; Max-Age=31536000; SameSite=Lax";
    setShowIntro(false);
  }

  if (showIntro) return <main className="app-shell"><WelcomeScreen start={dismissIntro}/></main>;

  return <main className="app-shell">
    <nav className="desktop-nav"><PulseLogo/><div><button className="active">For You</button><button>Market</button><button>News</button></div><a href="/admin/news">News Admin</a></nav>
    <section className="feed" aria-label="Pulse market and news feed" onScroll={handleScroll}>
      {entries.length ? entries.map(({instanceId,story}) => <Story key={instanceId} story={story} previous={story.type === "market" ? previousMarketSnapshots[story.cardId] : undefined} preferences={playerPreferences} onPreferenceChange={handlePreferenceChange}/>) : <EmptyFeed/>}
    </section>
    <div className={preferenceNotice ? "preference-notice visible" : "preference-notice"} role="status" aria-live="polite">{preferenceNotice}</div>
    <nav className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>○</b><span>Compete</span></button><button><b>□</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>●</b><span>Profile</span></button></nav>
  </main>;
}
