import type { MarketInsightItem, MarketStory, PlayerIndexFeatureMetric } from "./types";

export const PLAYER_INDEX_DAILY_TARGET = 8;
export const PLAYER_INDEX_DAILY_MINIMUM = 6;
export const PLAYER_INDEX_COOLDOWN_DAYS = 3;

export const PLAYER_INDEX_PILOTS = [
  { player:"Kobe Bryant",sport:"Basketball",imageUrl:"https://cdn.nba.com/headshots/nba/latest/1040x760/977.png" },
  { player:"Paul Skenes",sport:"Baseball",imageUrl:"https://img.mlbstatic.com/mlb-photos/image/upload/w_426,q_auto:best/v1/people/694973/headshot/67/current" },
  { player:"Willie Mays",sport:"Baseball",imageUrl:"https://img.mlbstatic.com/mlb-photos/image/upload/w_426,q_auto:best/v1/people/118495/headshot/67/current" },
  { player:"Tom Brady",sport:"Football",imageUrl:"https://a.espncdn.com/i/headshots/nfl/players/full/2330.png" },
] as const;

export function playerIndexPortraitUrl(player: string) {
  return PLAYER_INDEX_PILOTS.find((pilot) => normalized(pilot.player) === normalized(player))?.imageUrl;
}

export type PlayerSalesBucket = {
  start: string;
  end: string;
  count: number;
  totalAmount: number;
  averageSale: number;
  partial?: boolean;
};

export type PlayerIndexCard = MarketInsightItem;

export type PlayerIndexRecentFeature = {
  player: string;
  featuredOn: string;
  averageSaleChange30d: number;
  salesChange30d: number;
  totalValueChange30d: number;
  score: number;
};

export type PlayerSalesSummary = {
  currentBuckets: PlayerSalesBucket[];
  priorBuckets: PlayerSalesBucket[];
  current: { count:number;totalAmount:number;averageSale:number };
  prior: { count:number;totalAmount:number;averageSale:number };
  averageSaleChange30d: number;
  salesChange30d: number;
  totalValueChange30d: number;
};

type BuildPlayerIndexInput = {
  player: string;
  sport: string;
  playerImageUrl: string;
  buckets: PlayerSalesBucket[];
  cards: PlayerIndexCard[];
  catalogMatches: number;
  updatedAt?: string;
};

const MIN_CURRENT_DAYS = 30;
const MIN_PRIOR_DAYS = 30;
const MIN_CURRENT_SALES = 25;
const MIN_TRACKED_CARDS = 5;

function clamp(value: number,min = 0,max = 100) {
  return Math.min(max,Math.max(min,value));
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function slug(value: string) {
  return normalized(value).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "player";
}

function sum(values: number[]) {
  return values.reduce((total,value) => total + (Number.isFinite(value) ? value : 0),0);
}

function median(values: number[]) {
  const ordered = values.filter(Number.isFinite).sort((first,second) => first - second);
  if (!ordered.length) return 0;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function percentageChange(current: number,previous: number) {
  return previous > 0 ? (current / previous - 1) * 100 : 0;
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
}

function usd(value: number) {
  return value.toLocaleString("en-US",{ style:"currency",currency:"USD",maximumFractionDigits:0 });
}

function validBucket(bucket: PlayerSalesBucket) {
  return Number.isFinite(Date.parse(bucket.start))
    && Number.isFinite(bucket.count) && bucket.count >= 0
    && Number.isFinite(bucket.totalAmount) && bucket.totalAmount >= 0;
}

function bucketTotals(buckets: PlayerSalesBucket[]) {
  const count = sum(buckets.map((bucket) => bucket.count));
  const totalAmount = sum(buckets.map((bucket) => bucket.totalAmount));
  return { count,totalAmount,averageSale:count > 0 ? totalAmount / count : 0 };
}

export function summarizePlayerSales(buckets: PlayerSalesBucket[]):PlayerSalesSummary | null {
  const ordered = buckets.filter(validBucket).sort((first,second) => Date.parse(first.start) - Date.parse(second.start));
  const currentBuckets = ordered.slice(-30);
  const priorBuckets = ordered.slice(-60,-30);
  if (currentBuckets.length < MIN_CURRENT_DAYS || priorBuckets.length < MIN_PRIOR_DAYS) return null;
  const current = bucketTotals(currentBuckets);
  const prior = bucketTotals(priorBuckets);
  if (current.count < MIN_CURRENT_SALES || prior.count < MIN_CURRENT_SALES) return null;
  if (current.totalAmount <= 0 || prior.totalAmount <= 0) return null;
  return {
    currentBuckets,priorBuckets,current,prior,
    averageSaleChange30d:percentageChange(current.averageSale,prior.averageSale),
    salesChange30d:percentageChange(current.count,prior.count),
    totalValueChange30d:percentageChange(current.totalAmount,prior.totalAmount),
  };
}

function scoreLabel(score: number) {
  if (score >= 80) return "VERY ACTIVE";
  if (score >= 65) return "ACTIVE";
  if (score >= 50) return "BALANCED";
  if (score >= 35) return "SELECTIVE";
  return "THIN MARKET";
}

function headlineFor(player: string,sales: number,totalValue: number,averageSaleChange: number) {
  if (averageSaleChange >= 1) {
    return `${player} average sale rises ${averageSaleChange.toFixed(1)}% across ${sales.toLocaleString()} sales`;
  }
  if (averageSaleChange <= -1) {
    return `${player} average sale falls ${Math.abs(averageSaleChange).toFixed(1)}% across ${sales.toLocaleString()} sales`;
  }
  return `${player} records ${sales.toLocaleString()} sales worth ${usd(totalValue)} in 30 days`;
}

export function buildPlayerIndexStory(input: BuildPlayerIndexInput):MarketStory | null {
  const salesSummary = summarizePlayerSales(input.buckets);
  if (!salesSummary) return null;
  const {
    currentBuckets,current,prior,averageSaleChange30d,salesChange30d,totalValueChange30d,
  } = salesSummary;
  const cards = [...new Map(input.cards.map((card) => [card.id,card])).values()]
    .filter((card) => normalized(card.player) === normalized(input.player)
      && Number.isFinite(card.currentValue) && card.currentValue > 0
      && Number.isFinite(card.sales30d) && card.sales30d > 0
      && Number.isFinite(card.change30d))
    .sort((first,second) => second.sales30d - first.sales30d);

  if (cards.length < MIN_TRACKED_CARDS || current.totalAmount <= 0 || prior.totalAmount <= 0) return null;

  const totalCardSales = sum(cards.map((card) => card.sales30d));
  const trackedCardMovement30d = totalCardSales > 0
    ? sum(cards.map((card) => card.change30d * card.sales30d)) / totalCardSales
    : 0;
  const risingCount = cards.filter((card) => card.change30d > 1).length;
  const fallingCount = cards.filter((card) => card.change30d < -1).length;
  const flatCount = cards.length - risingCount - fallingCount;

  const dailyAverageSales = current.count / Math.max(1,currentBuckets.length);
  const liquidity = Math.round(clamp(Math.log10(dailyAverageSales + 1) / 3 * 100 * .75 + Math.min(cards.length,25) / 25 * 25));
  const priceMomentum = clamp(50 + averageSaleChange30d * 2);
  const volumeMomentum = clamp(50 + salesChange30d);
  const momentum = Math.round(priceMomentum * .65 + volumeMomentum * .35);
  const breadth = Math.round(clamp((risingCount + flatCount * .5) / cards.length * 100));
  const dailyAverages = currentBuckets.filter((bucket) => bucket.count > 0 && bucket.averageSale > 0).map((bucket) => bucket.averageSale);
  const dailyMedian = median(dailyAverages);
  const deviations = dailyAverages.map((value) => Math.abs(value - dailyMedian));
  const robustVariation = dailyMedian > 0 ? median(deviations) / dailyMedian * 100 : 100;
  const stability = Math.round(clamp(100 - robustVariation * 2));
  const dayCoverage = currentBuckets.filter((bucket) => bucket.count > 0).length / 30;
  const evidence = Math.round(clamp(dayCoverage * 45 + Math.min(current.count,500) / 500 * 30 + Math.min(cards.length,25) / 25 * 25));
  const scoreBreakdown = { liquidity,momentum,breadth,stability,evidence };
  const score = Math.round(liquidity * .35 + momentum * .25 + breadth * .20 + stability * .10 + evidence * .10);
  const confidenceGrade = evidence >= 80 ? "A" : evidence >= 60 ? "B" : "C";
  const representativeCards = cards.slice(0,3);
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const freshnessDays = Math.max(0,Math.floor((Date.now() - Date.parse(currentBuckets.at(-1)?.end ?? updatedAt)) / 86_400_000));
  const id = `player-index-${slug(input.player)}`;

  return {
    id,type:"market",storyKind:"player_index",player:input.player,sport:input.sport,
    headline:headlineFor(input.player,current.count,current.totalAmount,averageSaleChange30d),
    summary:`Across the latest 30 closed daily sales buckets, ${input.player} cards produced ${current.count.toLocaleString()} recorded sales totaling ${usd(current.totalAmount)}. Average sale price is ${signedPercent(averageSaleChange30d)} versus the prior 30 days; card mix and bulk lots can influence that comparison.`,
    cardId:id,cardTitle:`${cards.length.toLocaleString()} active card records · multi-grade player market`,
    imageUrl:input.playerImageUrl,grade:"MULTI-GRADE",currentValue:current.totalAmount,
    change7d:0,change30d:averageSaleChange30d,
    sales7d:sum(currentBuckets.slice(-7).map((bucket) => bucket.count)),sales30d:current.count,
    confidenceGrade,freshnessDays,chart:[],comps:[],rookie:false,cardYear:0,gradePrices:[],gradeGapMultiple:0,
    salesPaceMultiple:prior.count > 0 ? (current.count / 30) / (prior.count / 30) : 0,
    previous23DaySales:Math.max(0,current.count - sum(currentBuckets.slice(-7).map((bucket) => bucket.count))),
    insight:{
      cardsTracked:cards.length,totalSales30d:current.count,totalValue30d:current.totalAmount,
      averageSale30d:current.averageSale,priorTotalSales30d:prior.count,priorTotalValue30d:prior.totalAmount,
      priorAverageSale30d:prior.averageSale,salesChange30d,totalValueChange30d,averageSaleChange30d,
      trackedCardMovement30d,risingCount,fallingCount,flatCount,catalogMatches:input.catalogMatches,
      coverageDays:currentBuckets.length,score,scoreLabel:scoreLabel(score),scoreBreakdown,
      items:representativeCards,
    },
    updatedAt,demo:false,
  };
}

type FeatureSignal = {
  metric: PlayerIndexFeatureMetric;
  value: number;
  label: string;
  direction: "up" | "down" | "neutral";
  strength: number;
  reason: string;
};

function sameDirection(first: number,second: number) {
  return Math.sign(first) !== 0 && Math.sign(first) === Math.sign(second);
}

function featureHeadline(story: MarketStory,signal: FeatureSignal) {
  const count = story.insight?.totalSales30d ?? story.sales30d;
  if (signal.metric === "average_sale_change") {
    return `${story.player} average sale ${signal.direction === "up" ? "rises" : "falls"} ${Math.abs(signal.value).toFixed(1)}% across ${count.toLocaleString()} sales`;
  }
  if (signal.metric === "sales_change") {
    return `${story.player} recorded sales ${signal.direction === "up" ? "increase" : "decrease"} ${Math.abs(signal.value).toFixed(1)}% over the prior 30 days`;
  }
  if (signal.metric === "traded_value_change") {
    return `${story.player} traded value ${signal.direction === "up" ? "rises" : "falls"} ${Math.abs(signal.value).toFixed(1)}% over the prior 30 days`;
  }
  if (signal.metric === "market_breadth") {
    return `${Math.round(signal.value)}% of tracked ${story.player} cards are ${signal.direction === "up" ? "rising" : "falling"}`;
  }
  return `${story.player} cards record ${usd(signal.value)} in 30-day traded value`;
}

/**
 * Chooses the strongest verified reason to feature an index. Average-sale movement
 * only wins when card-level movement or market breadth supports the same direction.
 */
export function applyPlayerIndexFeature(story: MarketStory):MarketStory {
  if (story.storyKind !== "player_index" || !story.insight) return story;
  const insight = story.insight;
  const averageSaleChange = insight.averageSaleChange30d ?? 0;
  const salesChange = insight.salesChange30d ?? 0;
  const valueChange = insight.totalValueChange30d ?? 0;
  const trackedMovement = insight.trackedCardMovement30d ?? 0;
  const cardsTracked = Math.max(1,insight.cardsTracked ?? 0);
  const risingShare = (insight.risingCount ?? 0) / cardsTracked * 100;
  const fallingShare = (insight.fallingCount ?? 0) / cardsTracked * 100;
  const breadthDirection = risingShare >= fallingShare ? 1 : -1;
  const breadthShare = Math.max(risingShare,fallingShare);
  const breadthNet = risingShare - fallingShare;
  const liquidity = insight.scoreBreakdown?.liquidity ?? 0;
  const evidence = insight.scoreBreakdown?.evidence ?? 0;
  const breadthSupport = clamp(Math.abs(breadthNet) * 1.5);
  const signals:FeatureSignal[] = [];
  const averageConfirmed = Math.abs(averageSaleChange) >= 5 && (
    (Math.abs(trackedMovement) >= 1 && sameDirection(averageSaleChange,trackedMovement))
    || (Math.abs(breadthNet) >= 20 && sameDirection(averageSaleChange,breadthNet))
  );

  if (averageConfirmed) signals.push({
    metric:"average_sale_change",value:averageSaleChange,label:"AVERAGE SALE",
    direction:averageSaleChange > 0 ? "up" : "down",strength:clamp(Math.abs(averageSaleChange) / 40 * 100),
    reason:"Average-sale movement is confirmed by card-level direction.",
  });
  if (Math.abs(salesChange) >= 20) signals.push({
    metric:"sales_change",value:salesChange,label:"RECORDED SALES",
    direction:salesChange > 0 ? "up" : "down",strength:clamp(Math.abs(salesChange) / 80 * 100),
    reason:"Recorded sales changed materially versus the prior 30 days.",
  });
  if (Math.abs(valueChange) >= 20) signals.push({
    metric:"traded_value_change",value:valueChange,label:"TRADED VALUE",
    direction:valueChange > 0 ? "up" : "down",strength:clamp(Math.abs(valueChange) / 80 * 100),
    reason:"Total traded value changed materially versus the prior 30 days.",
  });
  if (Math.abs(breadthNet) >= 25 && breadthShare >= 55) signals.push({
    metric:"market_breadth",value:breadthShare,label:"TRACKED CARDS",
    direction:breadthDirection > 0 ? "up" : "down",strength:clamp(Math.abs(breadthNet) / 60 * 100),
    reason:"A clear majority of tracked cards are moving in the same direction.",
  });
  if ((insight.totalSales30d ?? 0) >= 100 && (insight.totalValue30d ?? 0) >= 10_000) signals.push({
    metric:"traded_value",value:insight.totalValue30d ?? 0,label:"30-DAY TRADED VALUE",direction:"neutral",
    strength:clamp(Math.log10((insight.totalValue30d ?? 0) + 1) / 7 * 100),
    reason:"Verified liquidity and traded value make this player market notable.",
  });

  const ranked = signals.map((signal) => ({
    signal,
    score:Math.round(signal.strength * .55 + liquidity * .20 + evidence * .15 + breadthSupport * .10),
  })).sort((first,second) => second.score - first.score);
  const selected = ranked[0] ?? {
    signal:{
      metric:"traded_value" as const,value:insight.totalValue30d ?? 0,label:"30-DAY TRADED VALUE",
      direction:"neutral" as const,strength:0,reason:"This is the strongest available verified player-market signal.",
    },
    score:Math.round(liquidity * .6 + evidence * .4),
  };
  return {
    ...story,
    headline:featureHeadline(story,selected.signal),
    insight:{
      ...insight,featureMetric:selected.signal.metric,featureValue:selected.signal.value,
      featureLabel:selected.signal.label,featureDirection:selected.signal.direction,
      featureScore:selected.score,selectionReason:selected.signal.reason,
    },
  };
}

function daysBetween(first: string,second: string) {
  const difference = Date.parse(first) - Date.parse(second);
  return Number.isFinite(difference) ? Math.floor(difference / 86_400_000) : Number.POSITIVE_INFINITY;
}

function materiallyChanged(story: MarketStory,recent: PlayerIndexRecentFeature) {
  const insight = story.insight;
  if (!insight) return false;
  return Math.abs((insight.averageSaleChange30d ?? 0) - recent.averageSaleChange30d) >= 5
    || Math.abs((insight.salesChange30d ?? 0) - recent.salesChange30d) >= 25
    || Math.abs((insight.totalValueChange30d ?? 0) - recent.totalValueChange30d) >= 25
    || Math.abs((insight.score ?? 0) - recent.score) >= 10;
}

export function selectFeaturedPlayerIndexes(
  stories: MarketStory[],
  recentFeatures: PlayerIndexRecentFeature[] = [],
  options: { target?:number;now?:string } = {},
) {
  const target = Math.max(1,Math.min(PLAYER_INDEX_DAILY_TARGET,options.target ?? PLAYER_INDEX_DAILY_TARGET));
  const now = options.now ?? new Date().toISOString();
  const recentByPlayer = new Map(recentFeatures.map((feature) => [normalized(feature.player),feature]));
  const candidates = stories.map(applyPlayerIndexFeature).filter((story) => {
    const featureScore = story.insight?.featureScore ?? 0;
    if (featureScore < 40 || !story.imageUrl) return false;
    const recent = recentByPlayer.get(normalized(story.player));
    if (!recent) return true;
    const age = daysBetween(now,recent.featuredOn);
    return age >= PLAYER_INDEX_COOLDOWN_DAYS || materiallyChanged(story,recent);
  });
  const availableSports = new Set(candidates.map((story) => normalized(story.sport))).size;
  const sportMaximum = availableSports >= 3 ? 2 : 3;
  const selected:MarketStory[] = [];
  const pool = [...candidates];
  const sportCounts = new Map<string,number>();
  const metricCounts = new Map<string,number>();

  while (pool.length && selected.length < target) {
    let bestIndex = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const story = pool[index];
      const sport = normalized(story.sport);
      if ((sportCounts.get(sport) ?? 0) >= sportMaximum) continue;
      const metric = story.insight?.featureMetric ?? "traded_value";
      const recent = recentByPlayer.get(normalized(story.player));
      const recentPenalty = recent ? 15 : 0;
      const adjusted = (story.insight?.featureScore ?? 0)
        - (sportCounts.get(sport) ?? 0) * 12
        - (metricCounts.get(metric) ?? 0) * 7
        - recentPenalty;
      if (adjusted <= bestScore) continue;
      bestIndex = index;
      bestScore = adjusted;
    }
    if (bestIndex < 0) break;
    const [story] = pool.splice(bestIndex,1);
    selected.push(story);
    const sport = normalized(story.sport);
    const metric = story.insight?.featureMetric ?? "traded_value";
    sportCounts.set(sport,(sportCounts.get(sport) ?? 0) + 1);
    metricCounts.set(metric,(metricCounts.get(metric) ?? 0) + 1);
  }
  return selected;
}
