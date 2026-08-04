import { beginSync, deleteMarketStoriesExcept, finishSync, upsertMarketStory } from "./db";
import type { MarketStory } from "./types";

type CardSearchItem = {
  card_id: string;
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  image: string;
  category: string;
  gain?: number;
  gain_30day?: number;
  "7 Day Sales"?: number;
  "30 Day Sales"?: number;
  prices?: Array<{ grade: string; price: string }>;
};

type Candidate = CardSearchItem & { storyKind: MarketStory["storyKind"] };

const API_BASE = "https://api.cardhedger.com";
const CATEGORIES = ["Baseball", "Basketball", "Football"];
const RESULTS_PER_BUCKET = 5;
const MAX_PUBLISHED_STORIES = 30;
const ENRICH_CONCURRENCY = 4;
const MIN_30_DAY_SALES = 5;
const MAX_ABS_CHANGE_7D = 200;
const MAX_ABS_CHANGE_30D = 300;
const MIN_FMV_USD = 0.5;
const MAX_FMV_USD = 1_000_000;
const MAX_PRICE_FACTOR = 5;
const MAX_FRESHNESS_DAYS = 30;
const TRUSTED_CONFIDENCE = new Set(["A","B"]);

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

function pickGrade(card: CardSearchItem) {
  const prices = card.prices ?? [];
  return prices.find((item) => item.grade === "PSA 10")
    ?? prices.find((item) => item.grade === "PSA 9")
    ?? prices.find((item) => item.grade === "Raw")
    ?? prices[0];
}

function headline(card: Candidate, change30d: number) {
  if (card.storyKind === "decline") return card.player + " card falls " + Math.abs(change30d).toFixed(1) + "% over 30 days";
  if (card.storyKind === "volume") return card.player + " card draws heavy collector activity";
  return card.player + " card gains " + change30d.toFixed(1) + "% over 30 days";
}

function summary(card: Candidate, sales30d: number) {
  const descriptor = [card.set, card.variant, card.number ? "#" + card.number : ""].filter(Boolean).join(" · ");
  return descriptor + " with " + sales30d.toLocaleString() + " recorded sales over the last 30 days.";
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
  return possible.slice(0,5).map((item) => {
    const row = item as Record<string, unknown>;
    return {
      date:String(row.closing_date ?? row.sale_date ?? row.date ?? ""),
      price:Number(row.price ?? row.sale_price ?? 0),
      venue:row.venue || row.price_source ? String(row.venue ?? row.price_source) : undefined,
    };
  }).filter((item) => item.price > 0);
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
  return { story:null, reason, cardId:card.card_id } as const;
}

async function enrichCandidate(card: Candidate) {
  const selected = pickGrade(card);
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  if (!selected) return rejection(card,"missing usable grade");
  if (!Number.isFinite(sales30d) || sales30d < MIN_30_DAY_SALES) return rejection(card,"insufficient 30-day sales");

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

  const updatedAt = new Date().toISOString();
  const fallbackChart = [fallbackPrice,currentValue].filter((item,index,array) => validPrice(item) && withinPriceFactor(item,currentValue) && array.indexOf(item) === index);
  const chart = safeHistory.length > 1
    ? safeHistory.map((item) => item.price)
    : fallbackChart.length > 1 ? fallbackChart : [currentValue,currentValue];

  return { story:{
    id:"market-" + card.card_id, type:"market", storyKind:card.storyKind,
    player:card.player || "Unknown player", sport:card.category || "Sports Cards",
    headline:headline(card,change30d), summary:summary(card,sales30d),
    cardId:card.card_id, cardTitle:card.description, imageUrl,
    grade, currentValue, change7d, change30d, sales7d:Number(card["7 Day Sales"] ?? 0), sales30d,
    confidenceGrade, freshnessDays, chart, comps, updatedAt, demo:false,
  } satisfies MarketStory, reason:null, cardId:card.card_id } as const;
}

async function discoverCandidates() {
  const requests: Array<{ storyKind:MarketStory["storyKind"]; request:Promise<{ cards?: CardSearchItem[] }> }> = [];
  for (const category of CATEGORIES) {
    requests.push({ storyKind:"gain", request:cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"gain_30day", sort_order:"desc", page:1, page_size:RESULTS_PER_BUCKET }) });
    requests.push({ storyKind:"decline", request:cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"gain_30day", sort_order:"asc", page:1, page_size:RESULTS_PER_BUCKET }) });
    requests.push({ storyKind:"volume", request:cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"sales_30day", sort_order:"desc", page:1, page_size:RESULTS_PER_BUCKET }) });
  }
  const responses = await Promise.all(requests.map((item) => item.request));
  const candidates: Candidate[] = [];
  for (let rank = 0; rank < RESULTS_PER_BUCKET; rank += 1) {
    for (let index = 0; index < responses.length; index += 1) {
      const card = responses[index]?.cards?.[rank];
      if (card) candidates.push({ ...card, storyKind:requests[index].storyKind });
    }
  }
  return [...new Map(candidates.map((card) => [card.card_id,card])).values()];
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
    const stories = enriched.flatMap((item) => item.story ? [item.story] : []).slice(0,MAX_PUBLISHED_STORIES);
    const rejected = enriched.filter((item) => !item.story);
    for (const story of stories) await upsertMarketStory(story);
    const deleted = stories.length >= 5 ? await deleteMarketStoriesExcept(stories.map((story) => story.cardId)) : 0;
    const reasonCounts = rejected.reduce<Record<string,number>>((counts,item) => {
      const reason = item.reason ?? "unknown quality rejection";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    },{});
    console.info("[cardhedge] quality review",{ seen:candidates.length,published:stories.length,rejected:rejected.length,deleted,reasonCounts });
    const message = "Card Hedge sync completed: " + stories.length + " published, " + rejected.length + " rejected, " + deleted + " stale removed";
    await finishSync(runId,"success",candidates.length,stories.length,message);
    return { status:"success", seen:candidates.length, written:stories.length, rejected:rejected.length, deleted, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Card Hedge error";
    await finishSync(runId,"failed",0,0,message);
    throw error;
  }
}
