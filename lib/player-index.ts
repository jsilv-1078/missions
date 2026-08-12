import type { MarketInsightItem, MarketStory } from "./types";

export const PLAYER_INDEX_PILOTS = [
  { player:"Kobe Bryant",sport:"Basketball" },
  { player:"Paul Skenes",sport:"Baseball" },
  { player:"Willie Mays",sport:"Baseball" },
  { player:"Tom Brady",sport:"Football" },
] as const;

export type PlayerSalesBucket = {
  start: string;
  end: string;
  count: number;
  totalAmount: number;
  averageSale: number;
  partial?: boolean;
};

export type PlayerIndexCard = MarketInsightItem;

type BuildPlayerIndexInput = {
  player: string;
  sport: string;
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
  const ordered = input.buckets.filter(validBucket).sort((first,second) => Date.parse(first.start) - Date.parse(second.start));
  const currentBuckets = ordered.slice(-30);
  const priorBuckets = ordered.slice(-60,-30);
  const current = bucketTotals(currentBuckets);
  const prior = bucketTotals(priorBuckets);
  const cards = [...new Map(input.cards.map((card) => [card.id,card])).values()]
    .filter((card) => normalized(card.player) === normalized(input.player)
      && Number.isFinite(card.currentValue) && card.currentValue > 0
      && Number.isFinite(card.sales30d) && card.sales30d > 0
      && Number.isFinite(card.change30d))
    .sort((first,second) => second.sales30d - first.sales30d);

  if (currentBuckets.length < MIN_CURRENT_DAYS || priorBuckets.length < MIN_PRIOR_DAYS) return null;
  if (current.count < MIN_CURRENT_SALES || prior.count < MIN_CURRENT_SALES) return null;
  if (cards.length < MIN_TRACKED_CARDS || current.totalAmount <= 0 || prior.totalAmount <= 0) return null;

  const averageSaleChange30d = percentageChange(current.averageSale,prior.averageSale);
  const salesChange30d = percentageChange(current.count,prior.count);
  const totalValueChange30d = percentageChange(current.totalAmount,prior.totalAmount);
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
    imageUrl:representativeCards[0].imageUrl,grade:"MULTI-GRADE",currentValue:current.totalAmount,
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
