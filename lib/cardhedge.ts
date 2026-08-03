import { beginSync, finishSync, upsertMarketStory } from "./db";
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
  if (!value) return "/cm-prize-redemption.webp";
  if (value.startsWith("//")) return "https:" + value;
  return value;
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
      date:String(row.closing_date ?? row.date ?? ""),
      price:Number(row.price ?? row.sale_price ?? 0),
      venue:row.venue ? String(row.venue) : undefined,
    };
  }).filter((item) => item.price > 0);
}

async function enrichCandidate(card: Candidate): Promise<MarketStory | null> {
  const selected = pickGrade(card);
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  if (!selected || sales30d < 5) return null;

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
  if (!Number.isFinite(currentValue) || currentValue <= 0) return null;

  const updatedAt = new Date().toISOString();
  const change7d = Number(card.gain ?? 0);
  const change30d = Number(card.gain_30day ?? card.gain ?? 0);
  const confidenceGrade = String(fmv.confidence_grade ?? "N/A");
  const freshnessDays = Number(fmv.freshness_days ?? 0);
  const chart = history.length > 1 ? history.map((item) => item.price) : [fallbackPrice,currentValue].filter((item) => item > 0);
  const comps = compsResult.status === "fulfilled" ? parseComps(compsResult.value) : [];

  return {
    id:"market-" + card.card_id, type:"market", storyKind:card.storyKind,
    player:card.player || "Unknown player", sport:card.category || "Sports Cards",
    headline:headline(card,change30d), summary:summary(card,sales30d),
    cardId:card.card_id, cardTitle:card.description, imageUrl:normalizedImage(card.image),
    grade, currentValue, change7d, change30d, sales7d:Number(card["7 Day Sales"] ?? 0), sales30d,
    confidenceGrade, freshnessDays, chart, comps, updatedAt, demo:false,
  };
}

async function discoverCandidates() {
  const requests: Array<Promise<{ cards?: CardSearchItem[] }>> = [];
  for (const category of CATEGORIES) {
    requests.push(cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"gain_30day", sort_order:"desc", page:1, page_size:5 }));
    requests.push(cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"gain_30day", sort_order:"asc", page:1, page_size:5 }));
    requests.push(cardHedgeFetch("/v1/cards/search-cards-wsort", { category, sort_by:"sales_30day", sort_order:"desc", page:1, page_size:5 }));
  }
  const responses = await Promise.all(requests);
  const candidates: Candidate[] = [];
  let index = 0;
  for (const category of CATEGORIES) {
    const gain = responses[index++]?.cards?.[0];
    const decline = responses[index++]?.cards?.[0];
    const volume = responses[index++]?.cards?.[0];
    if (gain) candidates.push({ ...gain, storyKind:"gain" });
    if (decline) candidates.push({ ...decline, storyKind:"decline" });
    if (volume) candidates.push({ ...volume, storyKind:"volume" });
  }
  return [...new Map(candidates.map((card) => [card.card_id,card])).values()];
}

export async function syncMarketData() {
  if (!cardHedgeConfigured()) return { status:"skipped", seen:0, written:0, message:"Waiting for CARDHEDGE_API_KEY" };
  const runId = await beginSync("cardhedge");
  try {
    const candidates = await discoverCandidates();
    const enriched = await Promise.all(candidates.map(enrichCandidate));
    const stories = enriched.filter((story): story is MarketStory => Boolean(story));
    for (const story of stories) await upsertMarketStory(story);
    await finishSync(runId,"success",candidates.length,stories.length,"Card Hedge sync completed");
    return { status:"success", seen:candidates.length, written:stories.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Card Hedge error";
    await finishSync(runId,"failed",0,0,message);
    throw error;
  }
}
