import { beginSync, deleteMarketStoriesExcept, finishSync, upsertMarketStory } from "./db";
import { marketHeadline } from "./market-headlines";
import type { MarketGradePrice, MarketSale, MarketStory, MarketStoryKind } from "./types";

type CardSearchItem = {
  card_id: string;
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  image: string;
  category: string;
  rookie?: boolean;
  gain?: number;
  gain_30day?: number;
  "7 Day Sales"?: number;
  "30 Day Sales"?: number;
  prices?: Array<{ grade: string; price: string }>;
};

type DiscoveryKind = "high_sales_30d" | "biggest_gain" | "biggest_loss" | "rookie_watch";
type Candidate = CardSearchItem & { discoveryKinds: DiscoveryKind[] };

type MarketFacts = Omit<MarketStory,"id" | "type" | "storyKind" | "headline" | "summary" | "demo"> & {
  eligibleKinds: MarketStoryKind[];
};

const API_BASE = "https://api.cardhedger.com";
const CATEGORIES = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Pokemon"];
const RESULTS_PER_BUCKET = 3;
const SEARCH_CONCURRENCY = 6;
const MAX_PUBLISHED_STORIES = 30;
const ENRICH_CONCURRENCY = 4;
const MIN_30_DAY_SALES = 5;
const MAX_ABS_CHANGE_7D = 200;
const MAX_ABS_CHANGE_30D = 300;
const MIN_FMV_USD = 0.5;
const MAX_FMV_USD = 1_000_000;
const MAX_PRICE_FACTOR = 5;
const MAX_FRESHNESS_DAYS = 30;
const MIN_MEANINGFUL_CHANGE = 1;
const MIN_GRADE_GAP_MULTIPLE = 1.25;
const MAX_GRADE_GAP_MULTIPLE = 5;
const MIN_SURGE_MULTIPLE = 1.5;
const MAX_SURGE_MULTIPLE = 10;
const MIN_SURGE_7_DAY_SALES = 4;
const TRUSTED_CONFIDENCE = new Set(["A","B"]);
const STORY_KINDS:MarketStoryKind[] = [
  "high_sales_30d","biggest_gain","biggest_loss","recent_sale","grade_gap","sales_surge","rookie_watch",
];

export function cardHedgeConfigured() {
  return Boolean(process.env.CARDHEDGE_API_KEY);
}

async function cardHedgeFetch<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.CARDHEDGE_API_KEY;
  if (!key) throw new Error("CARDHEDGE_API_KEY is not configured");
  const response = await fetch(API_BASE + path, {
    method: body ? "POST" : "GET",
    headers: { "X-API-Key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Card Hedge " + path + " returned " + response.status);
  return response.json() as Promise<T>;
}

function normalizedImage(value: string) {
  const normalized = value?.startsWith("//") ? "https:" + value : value;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? normalized : null;
  } catch {
    return null;
  }
}

function displayCategory(value: string) {
  return value === "Pokemon" ? "Pokémon" : value;
}

function pickGrade(card: CardSearchItem) {
  const prices = card.prices ?? [];
  return prices.find((item) => item.grade === "PSA 10")
    ?? prices.find((item) => item.grade === "PSA 9")
    ?? prices.find((item) => item.grade === "Raw")
    ?? prices[0];
}

function parseHistory(payload: unknown) {
  const prices = (payload as { prices?: Array<Record<string, unknown>> })?.prices ?? [];
  return prices
    .map((item) => ({ date:String(item.closing_date ?? ""), price:Number(item.price ?? 0) }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(-30);
}

function parseComps(payload: unknown) {
  const source = payload as Record<string, unknown>;
  const possible = source.raw_prices ?? source.prices ?? source.sales ?? [];
  if (!Array.isArray(possible)) return [];
  return possible.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      date:String(row.closing_date ?? row.sale_date ?? row.date ?? ""),
      price:Number(row.price ?? row.sale_price ?? 0),
      venue:row.venue || row.price_source ? String(row.venue ?? row.price_source) : undefined,
    };
  }).filter((item) => validPrice(item.price) && Number.isFinite(Date.parse(item.date)))
    .sort((a,b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0,5);
}

function parseGradePrices(card: CardSearchItem):MarketGradePrice[] {
  const unique = new Map<string,MarketGradePrice>();
  for (const item of card.prices ?? []) {
    const grade = String(item.grade ?? "").trim();
    const price = Number(item.price ?? 0);
    if (grade && validPrice(price) && !unique.has(grade)) unique.set(grade,{ grade,price });
  }
  return [...unique.values()];
}

function gradeGap(prices: MarketGradePrice[]) {
  const byGrade = new Map(prices.map((item) => [item.grade.toUpperCase(),item]));
  const pairs = [["PSA 10","PSA 9"],["PSA 9","RAW"],["PSA 10","RAW"],["BGS 9.5","RAW"],["SGC 10","RAW"]];
  for (const [highKey,lowKey] of pairs) {
    const high = byGrade.get(highKey);
    const low = byGrade.get(lowKey);
    if (!high || !low || high.price <= low.price) continue;
    const multiple = high.price / low.price;
    if (multiple >= MIN_GRADE_GAP_MULTIPLE && multiple <= MAX_GRADE_GAP_MULTIPLE) {
      return { prices:[high,low],multiple };
    }
  }
  return { prices:[] as MarketGradePrice[],multiple:0 };
}

function saleIsToday(sale: MarketSale) {
  const timestamp = Date.parse(sale.date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a,b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function validPrice(value: number) {
  return Number.isFinite(value) && value >= MIN_FMV_USD && value <= MAX_FMV_USD;
}

function withinPriceFactor(value: number, reference: number) {
  if (!validPrice(value) || !validPrice(reference)) return false;
  const ratio = value / reference;
  return ratio >= 1 / MAX_PRICE_FACTOR && ratio <= MAX_PRICE_FACTOR;
}

function rejection(card: Candidate, reason: string) {
  return { facts:null, reason, cardId:card.card_id } as const;
}

async function enrichCandidate(card: Candidate) {
  const selected = pickGrade(card);
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  const sales7d = Number(card["7 Day Sales"] ?? 0);
  if (!selected) return rejection(card,"missing usable grade");
  if (!Number.isFinite(sales30d) || sales30d < MIN_30_DAY_SALES) return rejection(card,"insufficient 30-day sales");
  if (!Number.isFinite(sales7d) || sales7d < 0 || sales7d > sales30d) return rejection(card,"inconsistent sales totals");

  const imageUrl = normalizedImage(card.image);
  if (!imageUrl) return rejection(card,"missing valid card image");

  const change7d = Number(card.gain ?? 0);
  const change30d = Number(card.gain_30day ?? card.gain ?? 0);
  if (!Number.isFinite(change7d) || Math.abs(change7d) > MAX_ABS_CHANGE_7D) return rejection(card,"extreme 7-day percentage change");
  if (!Number.isFinite(change30d) || Math.abs(change30d) > MAX_ABS_CHANGE_30D) return rejection(card,"extreme 30-day percentage change");

  const grade = selected.grade;
  const [historyResult, fmvResult, compsResult] = await Promise.allSettled([
    cardHedgeFetch<{ prices?: Array<Record<string, unknown>> }>("/v1/cards/prices-by-card", { card_id:card.card_id, grade, days:30 }),
    cardHedgeFetch<Record<string, unknown>>("/v1/cards/card-fmv", { card_id:card.card_id, grade }),
    cardHedgeFetch<Record<string, unknown>>("/v1/cards/comps", { card_id:card.card_id, grade, include_raw_prices:true, time_weighted:true }),
  ]);

  const history = historyResult.status === "fulfilled" ? parseHistory(historyResult.value) : [];
  const fmvPayload = fmvResult.status === "fulfilled" ? fmvResult.value : {};
  const fmv = (fmvPayload.fmv ?? fmvPayload) as Record<string, unknown>;
  const fallbackPrice = Number(selected.price ?? 0);
  const currentValue = Number(fmv.price ?? fallbackPrice);
  if (!validPrice(currentValue)) return rejection(card,"extreme or invalid FMV");
  if (validPrice(fallbackPrice) && !withinPriceFactor(currentValue,fallbackPrice)) return rejection(card,"FMV conflicts with listed price");

  const confidenceGrade = String(fmv.confidence_grade ?? "N/A").toUpperCase();
  if (!TRUSTED_CONFIDENCE.has(confidenceGrade)) return rejection(card,"FMV confidence below B");
  const freshnessDays = Number(fmv.freshness_days ?? 0);
  if (!Number.isFinite(freshnessDays) || freshnessDays > MAX_FRESHNESS_DAYS) return rejection(card,"stale FMV");

  const historyPrices = history.map((item) => item.price).filter(validPrice);
  if (historyPrices.length >= 3 && !withinPriceFactor(currentValue,median(historyPrices))) return rejection(card,"FMV conflicts with price history");

  const rawComps = compsResult.status === "fulfilled" ? parseComps(compsResult.value) : [];
  const compPrices = rawComps.map((item) => item.price).filter(validPrice);
  if (compPrices.length >= 3 && !withinPriceFactor(currentValue,median(compPrices))) return rejection(card,"FMV conflicts with comparable sales");

  const safeHistory = history.filter((item) => withinPriceFactor(item.price,currentValue));
  const comps = rawComps.filter((item) => withinPriceFactor(item.price,currentValue));
  const recentSale = comps.find(saleIsToday);
  const allGradePrices = parseGradePrices(card);
  const gap = gradeGap(allGradePrices);
  const previous23DaySales = Math.max(0,sales30d - sales7d);
  const priorDailyPace = previous23DaySales / 23;
  const salesPaceMultiple = priorDailyPace > 0 ? (sales7d / 7) / priorDailyPace : 0;

  const eligibleKinds:MarketStoryKind[] = [];
  if (card.discoveryKinds.includes("high_sales_30d")) eligibleKinds.push("high_sales_30d");
  if (card.discoveryKinds.includes("biggest_gain") && change30d >= MIN_MEANINGFUL_CHANGE) eligibleKinds.push("biggest_gain");
  if (card.discoveryKinds.includes("biggest_loss") && change30d <= -MIN_MEANINGFUL_CHANGE) eligibleKinds.push("biggest_loss");
  if (recentSale) eligibleKinds.push("recent_sale");
  if (gap.prices.length === 2) eligibleKinds.push("grade_gap");
  if (sales7d >= MIN_SURGE_7_DAY_SALES && salesPaceMultiple >= MIN_SURGE_MULTIPLE && salesPaceMultiple <= MAX_SURGE_MULTIPLE) {
    eligibleKinds.push("sales_surge");
  }
  if (Boolean(card.rookie)) eligibleKinds.push("rookie_watch");
  if (!eligibleKinds.length) return rejection(card,"no eligible market story format");

  const updatedAt = new Date().toISOString();
  const fallbackChart = [fallbackPrice,currentValue].filter((item,index,array) => validPrice(item) && withinPriceFactor(item,currentValue) && array.indexOf(item) === index);
  const chart = safeHistory.length > 1
    ? safeHistory.map((item) => item.price)
    : fallbackChart.length > 1 ? fallbackChart : [currentValue,currentValue];

  return { facts:{
    player:card.player || "Unknown player", sport:displayCategory(card.category || "Sports Cards"),
    cardId:card.card_id, cardTitle:card.description, imageUrl, grade, currentValue, change7d, change30d,
    sales7d, sales30d, confidenceGrade, freshnessDays, chart, comps, rookie:Boolean(card.rookie),
    gradePrices:gap.prices, gradeGapMultiple:gap.multiple,
    salesPaceMultiple:Number.isFinite(salesPaceMultiple) ? salesPaceMultiple : 0,
    previous23DaySales, recentSale, updatedAt, eligibleKinds,
  } satisfies MarketFacts, reason:null, cardId:card.card_id } as const;
}

async function discoverCandidates() {
  const requests: Array<{ category:string; discoveryKind:DiscoveryKind; path:string; body:Record<string,unknown> }> = [];
  for (const category of CATEGORIES) {
    requests.push({ category,discoveryKind:"biggest_gain",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"gain_30day",sort_order:"desc",page:1,page_size:RESULTS_PER_BUCKET } });
    requests.push({ category,discoveryKind:"biggest_loss",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"gain_30day",sort_order:"asc",page:1,page_size:RESULTS_PER_BUCKET } });
    requests.push({ category,discoveryKind:"high_sales_30d",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"sales_30day",sort_order:"desc",page:1,page_size:RESULTS_PER_BUCKET } });
    requests.push({ category,discoveryKind:"rookie_watch",path:"/v1/cards/card-search",body:{ category,rookie:"yes",page:1,page_size:RESULTS_PER_BUCKET } });
  }
  const responses = await mapWithConcurrency(requests,SEARCH_CONCURRENCY,async (item) => {
    try {
      return await cardHedgeFetch<{ cards?:CardSearchItem[] }>(item.path,item.body);
    } catch (error) {
      console.warn("[cardhedge] category search failed",{ category:item.category,storyKind:item.discoveryKind,error:error instanceof Error ? error.message : "Unknown error" });
      return { cards:[] };
    }
  });
  const candidates = new Map<string,Candidate>();
  for (let rank = 0; rank < RESULTS_PER_BUCKET; rank += 1) {
    for (let index = 0; index < responses.length; index += 1) {
      const card = responses[index]?.cards?.[rank];
      if (!card) continue;
      const existing = candidates.get(card.card_id);
      if (existing) {
        if (!existing.discoveryKinds.includes(requests[index].discoveryKind)) existing.discoveryKinds.push(requests[index].discoveryKind);
      } else {
        candidates.set(card.card_id,{ ...card,discoveryKinds:[requests[index].discoveryKind] });
      }
    }
  }
  return [...candidates.values()];
}

function storyScore(facts: MarketFacts, kind: MarketStoryKind) {
  if (kind === "high_sales_30d" || kind === "rookie_watch") return facts.sales30d;
  if (kind === "biggest_gain") return facts.change30d;
  if (kind === "biggest_loss") return Math.abs(facts.change30d);
  if (kind === "recent_sale") return facts.recentSale ? Date.parse(facts.recentSale.date) : 0;
  if (kind === "grade_gap") return facts.gradeGapMultiple;
  return facts.salesPaceMultiple;
}

function summaryFor(facts: MarketFacts, kind: MarketStoryKind) {
  const descriptor = facts.cardTitle + " · " + facts.grade + ". ";
  if (kind === "high_sales_30d") return descriptor + facts.sales30d.toLocaleString() + " recorded sales over the last 30 days.";
  if (kind === "biggest_gain") return descriptor + "Current Card Hedge FMV is up " + Math.abs(facts.change30d).toFixed(1) + "% over 30 days.";
  if (kind === "biggest_loss") return descriptor + "Current Card Hedge FMV is down " + Math.abs(facts.change30d).toFixed(1) + "% over 30 days.";
  if (kind === "recent_sale" && facts.recentSale) return descriptor + "A comparable sale closed today at " + facts.recentSale.price.toLocaleString("en-US",{ style:"currency",currency:"USD" }) + (facts.recentSale.venue ? " via " + facts.recentSale.venue + "." : ".");
  if (kind === "grade_gap") return descriptor + facts.gradePrices[0].grade + " is priced at " + facts.gradeGapMultiple.toFixed(1) + "× " + facts.gradePrices[1].grade + " in the latest grade-level data.";
  if (kind === "sales_surge") return descriptor + "The last seven days are running at " + facts.salesPaceMultiple.toFixed(1) + "× the daily pace of the preceding 23 days.";
  return descriptor + "Card Hedge identifies this as a rookie card with " + facts.sales30d.toLocaleString() + " recorded sales over 30 days.";
}

function buildStory(facts: MarketFacts, storyKind: MarketStoryKind):MarketStory {
  const { eligibleKinds:_,...storyFacts } = facts;
  return {
    ...storyFacts, id:"market-" + facts.cardId, type:"market", storyKind,
    headline:marketHeadline({
      cardId:facts.cardId,player:facts.player,storyKind,change30d:facts.change30d,sales30d:facts.sales30d,
      gradePrices:facts.gradePrices,gradeGapMultiple:facts.gradeGapMultiple,
      salesPaceMultiple:facts.salesPaceMultiple,recentSale:facts.recentSale,
    }),
    summary:summaryFor(facts,storyKind),demo:false,
  };
}

function selectStories(factsList: MarketFacts[]) {
  const chosenIds = new Set<string>();
  const categoryCounts = new Map<string,number>();
  const stories:MarketStory[] = [];
  while (stories.length < MAX_PUBLISHED_STORIES) {
    let added = false;
    for (const kind of STORY_KINDS) {
      const options = factsList
        .filter((facts) => !chosenIds.has(facts.cardId) && facts.eligibleKinds.includes(kind))
        .sort((a,b) => {
          const categoryDifference = (categoryCounts.get(a.sport) ?? 0) - (categoryCounts.get(b.sport) ?? 0);
          return categoryDifference || storyScore(b,kind) - storyScore(a,kind);
        });
      const selected = options[0];
      if (!selected) continue;
      stories.push(buildStory(selected,kind));
      chosenIds.add(selected.cardId);
      categoryCounts.set(selected.sport,(categoryCounts.get(selected.sport) ?? 0) + 1);
      added = true;
      if (stories.length === MAX_PUBLISHED_STORIES) break;
    }
    if (!added) break;
  }
  return stories;
}

async function mapWithConcurrency<T,U>(items: T[], concurrency: number, mapper: (item:T) => Promise<U>) {
  const results = new Array<U>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length:Math.min(concurrency,items.length) },() => worker()));
  return results;
}

export async function syncMarketData() {
  if (!cardHedgeConfigured()) return { status:"skipped", seen:0, written:0, message:"Waiting for CARDHEDGE_API_KEY" };
  const runId = await beginSync("cardhedge");
  try {
    const candidates = await discoverCandidates();
    const enriched = await mapWithConcurrency(candidates,ENRICH_CONCURRENCY,enrichCandidate);
    const stories = selectStories(enriched.flatMap((item) => item.facts ? [item.facts] : []));
    const rejected = enriched.filter((item) => !item.facts);
    for (const story of stories) await upsertMarketStory(story);
    const deleted = stories.length >= 5 ? await deleteMarketStoriesExcept(stories.map((story) => story.cardId)) : 0;
    const reasonCounts = rejected.reduce<Record<string,number>>((counts,item) => {
      const reason = item.reason ?? "unknown quality rejection";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    },{});
    const typeCounts = stories.reduce<Record<string,number>>((counts,story) => {
      counts[story.storyKind] = (counts[story.storyKind] ?? 0) + 1;
      return counts;
    },{});
    console.info("[cardhedge] quality review",{ seen:candidates.length,published:stories.length,rejected:rejected.length,deleted,reasonCounts,typeCounts });
    const message = "Card Hedge sync completed: " + stories.length + " published, " + rejected.length + " rejected, " + deleted + " stale removed";
    await finishSync(runId,"success",candidates.length,stories.length,message);
    return { status:"success", seen:candidates.length, written:stories.length, rejected:rejected.length, deleted, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Card Hedge error";
    await finishSync(runId,"failed",0,0,message);
    throw error;
  }
}
