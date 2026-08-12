import {
  beginSync,deleteMarketStoriesExcept,deletePlayerIndexesExcept,finishSync,updateSyncProgress,
  getRecentPlayerIndexFeatures,listPlayerIndexCandidates,recordPlayerIndexFeatures,
  upsertMarketStory,upsertPlayerIndexStory,type PlayerIndexMarketCandidate,
} from "./db";
import { marketHeadline } from "./market-headlines";
import {
  buildPlayerIndexStory,PLAYER_INDEX_COOLDOWN_DAYS,PLAYER_INDEX_DAILY_MINIMUM,PLAYER_INDEX_DAILY_TARGET,
  selectFeaturedPlayerIndexes,summarizePlayerSales,type PlayerIndexCard,type PlayerIndexRecentFeature,
  type PlayerSalesBucket,
} from "./player-index";
import { resolvePlayerPortrait } from "./player-portraits";
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
  prices?: Array<{ grade: string; price: string | number }>;
};

type DiscoveryKind = "high_sales_30d" | "biggest_gain" | "biggest_loss" | "rookie_watch" | "vintage_mover" | "grade_premium";
type Candidate = CardSearchItem & { discoveryKinds: DiscoveryKind[] };
type GradeSelection = { grade:string;price:number;fmvPayload?:Record<string,unknown> };
type PlayerSalesStatsResult = {
  player:string;
  buckets?:Array<{
    start:string;end:string;count:number;total_amount:number;average_sale:number;partial?:boolean;
  }>;
};
type PlayerSalesStatsResponse = { results?:PlayerSalesStatsResult[] };
type PlayerCardSearchResponse = { cards?:CardSearchItem[];count?:number;pages?:number };

type MarketFacts = Omit<MarketStory,"id" | "type" | "storyKind" | "headline" | "summary" | "demo"> & {
  eligibleKinds: MarketStoryKind[];
};

const API_BASE = "https://api.cardhedger.com";
const CATEGORIES = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Pokemon"];
const VINTAGE_SEARCH_YEARS = [
  "1979","1978","1977","1975","1973","1972","1971","1970",
  "1969","1968","1965","1963","1961","1960","1959","1957",
  "1956","1955","1954","1952","1951","1948","1933","1909",
];
const RESULTS_PER_BUCKET = 24;
const GRADE_PREMIUM_POOL_SIZE = 36;
const GRADE_PREMIUM_CANDIDATES_PER_CATEGORY = 8;
const TARGET_GRADE_PREMIUM_STORIES = 18;
const VINTAGE_RESULTS_PER_YEAR = 25;
const MAX_VINTAGE_CANDIDATES = 24;
const SEARCH_CONCURRENCY = 6;
const CATEGORY_TARGETS = {
  Football:18,
  Baseball:18,
  Basketball:18,
  Hockey:8,
  Soccer:8,
  "Pokémon":12,
  Vintage:10,
} as const;
type TargetCategory = keyof typeof CATEGORY_TARGETS;
const MAX_PUBLISHED_STORIES = Object.values(CATEGORY_TARGETS).reduce((sum,target) => sum + target,0);
const MAX_DISCOVERY_CARDS_PER_PLAYER = 2;
const MAX_PUBLISHED_STORIES_PER_PLAYER = 2;
const ENRICH_CONCURRENCY = 8;
const PLAYER_INDEX_CANDIDATE_LIMIT = 36;
const PLAYER_INDEX_FINALIST_LIMIT = 16;
const PLAYER_INDEX_SEARCH_CONCURRENCY = 4;
const PLAYER_INDEX_STATS_BATCH_SIZE = 2;
const PLAYER_INDEX_STATS_CONCURRENCY = 4;
const MIN_30_DAY_SALES = 5;
const MIN_VINTAGE_30_DAY_SALES = 3;
const MAX_ABS_CHANGE_7D = 200;
const MAX_ABS_CHANGE_30D = 300;
const MIN_FMV_USD = 0.5;
const MAX_FMV_USD = 1_000_000;
const MAX_PRICE_FACTOR = 5;
const MAX_FRESHNESS_DAYS = 30;
const MIN_MEANINGFUL_CHANGE = 1;
const MIN_GRADE_GAP_MULTIPLE = 1.25;
const MAX_GRADE_GAP_MULTIPLE = 25;
const MIN_SURGE_MULTIPLE = 1.5;
const MAX_SURGE_MULTIPLE = 10;
const MIN_SURGE_7_DAY_SALES = 4;
const TRUSTED_CONFIDENCE = new Set(["A","B"]);
const STORY_KINDS:MarketStoryKind[] = [
  "high_sales_30d","vintage_mover","biggest_gain","biggest_loss","recent_sale","sales_surge","rookie_watch",
];
const MODERN_STORY_KINDS:MarketStoryKind[] = [...STORY_KINDS.filter((kind) => kind !== "vintage_mover"),"grade_gap"];
const STORY_KIND_TARGETS:Partial<Record<MarketStoryKind,number>> = {
  grade_gap:TARGET_GRADE_PREMIUM_STORIES,
  high_sales_30d:10,
  biggest_gain:8,
  biggest_loss:8,
  recent_sale:6,
  sales_surge:8,
  rookie_watch:12,
  vintage_mover:10,
};

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
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json() as Record<string,unknown>;
      const value = payload.detail ?? payload.error ?? payload.message;
      const messages = Array.isArray(value)
        ? value.map((item) => {
          if (!item || typeof item !== "object") return String(item);
          const issue = item as Record<string,unknown>;
          const location = Array.isArray(issue.loc) ? issue.loc.join(".") : "request";
          return `${location}: ${String(issue.msg ?? issue.message ?? "invalid value")}`;
        })
        : [typeof value === "string" ? value : ""];
      detail = messages.filter(Boolean).join("; ").replace(/\s+/g," ").slice(0,500);
    } catch {
      // Status and endpoint still provide a safe diagnostic if the provider body is not JSON.
    }
    throw new Error("Market data provider " + path + " returned " + response.status + (detail ? ": " + detail : ""));
  }
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

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function yearFrom(value: string) {
  const match = String(value ?? "").match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

function cardYear(card: CardSearchItem) {
  return yearFrom(card.set) || yearFrom(card.description);
}

function isVintageCard(card: CardSearchItem) {
  const year = cardYear(card);
  return year >= 1800 && year < 1980;
}

function hasVintageSalesVolume(card: CardSearchItem) {
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  return Number.isFinite(sales30d) && sales30d >= MIN_VINTAGE_30_DAY_SALES;
}

function quickDiscoveryEligible(card: CardSearchItem, discoveryKind: DiscoveryKind) {
  const vintage = isVintageCard(card);
  if (discoveryKind === "vintage_mover" && !vintage) return false;
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  const sales7d = Number(card["7 Day Sales"] ?? 0);
  const minimumSales = vintage ? MIN_VINTAGE_30_DAY_SALES : MIN_30_DAY_SALES;
  if (!Number.isFinite(sales30d) || sales30d < minimumSales) return false;
  if (!Number.isFinite(sales7d) || sales7d < 0 || sales7d > sales30d) return false;
  if (!normalizedImage(card.image)) return false;
  if (!parseGradePrices(card).some((item) => validPrice(item.price))) return false;

  const change7d = Number(card.gain ?? 0);
  const change30d = Number(card.gain_30day ?? card.gain ?? 0);
  if (!Number.isFinite(change7d) || !Number.isFinite(change30d)) return false;
  if (!vintage && (Math.abs(change7d) > MAX_ABS_CHANGE_7D || Math.abs(change30d) > MAX_ABS_CHANGE_30D)) return false;
  if (discoveryKind === "biggest_gain" && change30d < MIN_MEANINGFUL_CHANGE) return false;
  if (discoveryKind === "biggest_loss" && change30d > -MIN_MEANINGFUL_CHANGE) return false;
  if (discoveryKind === "vintage_mover" && Math.abs(change30d) < MIN_MEANINGFUL_CHANGE) return false;
  if (discoveryKind === "grade_premium" && gradeGap(parseGradePrices(card)).prices.length < 2) return false;
  return true;
}

function pickGrade(card: CardSearchItem):GradeSelection | undefined {
  const prices = card.prices ?? [];
  const selected = prices.find((item) => item.grade === "PSA 10")
    ?? prices.find((item) => item.grade === "PSA 9")
    ?? prices.find((item) => item.grade === "Raw")
    ?? prices[0];
  return selected ? { grade:selected.grade,price:Number(selected.price ?? 0) } : undefined;
}

function playerIndexCard(card: CardSearchItem,player: string):PlayerIndexCard | null {
  if (normalized(card.player) !== normalized(player)) return null;
  const imageUrl = normalizedImage(card.image);
  const selected = pickGrade(card);
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  const change30d = Number(card.gain_30day ?? card.gain ?? 0);
  if (!imageUrl || !selected || !validPrice(selected.price)) return null;
  if (!Number.isFinite(sales30d) || sales30d <= 0) return null;
  if (!Number.isFinite(change30d) || Math.abs(change30d) > MAX_ABS_CHANGE_30D) return null;
  return {
    id:card.card_id,player,sport:displayCategory(card.category),cardTitle:card.description,imageUrl,
    grade:selected.grade,currentValue:selected.price,change30d,sales30d,
  };
}

function playerSalesBuckets(value: PlayerSalesStatsResult) {
  return (value?.buckets ?? []).flatMap((bucket):PlayerSalesBucket[] => {
    const count = Number(bucket.count ?? 0);
    const totalAmount = Number(bucket.total_amount ?? 0);
    const averageSale = Number(bucket.average_sale ?? (count > 0 ? totalAmount / count : 0));
    if (!bucket.start || !bucket.end || !Number.isFinite(count) || !Number.isFinite(totalAmount)) return [];
    return [{ start:bucket.start,end:bucket.end,count,totalAmount,averageSale,partial:Boolean(bucket.partial) }];
  });
}

function recentFeatureAgeDays(feature: PlayerIndexRecentFeature,now: string) {
  const age = Date.parse(now) - Date.parse(feature.featuredOn);
  return Number.isFinite(age) ? Math.floor(age / 86_400_000) : Number.POSITIVE_INFINITY;
}

function playerIndexCandidateScore(
  candidate: PlayerIndexMarketCandidate,
  buckets: PlayerSalesBucket[],
  recent: PlayerIndexRecentFeature | undefined,
  now: string,
) {
  const summary = summarizePlayerSales(buckets);
  if (!summary) return Number.NEGATIVE_INFINITY;
  if (recent && recentFeatureAgeDays(recent,now) < PLAYER_INDEX_COOLDOWN_DAYS) {
    const changed = Math.abs(summary.averageSaleChange30d - recent.averageSaleChange30d) >= 5
      || Math.abs(summary.salesChange30d - recent.salesChange30d) >= 25
      || Math.abs(summary.totalValueChange30d - recent.totalValueChange30d) >= 25;
    if (!changed) return Number.NEGATIVE_INFINITY;
  }
  const liquidity = Math.log10(summary.current.count + 1) * 18;
  const averageSignal = Math.min(Math.abs(summary.averageSaleChange30d),60) * .9;
  const salesSignal = Math.min(Math.abs(summary.salesChange30d),100) * .45;
  const valueSignal = Math.min(Math.abs(summary.totalValueChange30d),100) * .35;
  const cardSignal = Math.min(Math.abs(candidate.weightedChange30d),50) * .4
    + Math.min(Math.abs(candidate.strongestChange30d),100) * .1;
  return liquidity + averageSignal + salesSignal + valueSignal + cardSignal;
}

export async function syncPlayerIndexes() {
  const now = new Date().toISOString();
  const errors:string[] = [];
  const rejections:string[] = [];
  try {
    const [candidates,recentFeatures] = await Promise.all([
      listPlayerIndexCandidates(PLAYER_INDEX_CANDIDATE_LIMIT),
      getRecentPlayerIndexFeatures(PLAYER_INDEX_COOLDOWN_DAYS),
    ]);
    if (!candidates.length) {
      return {
        requested:PLAYER_INDEX_DAILY_TARGET,candidateCount:0,finalistCount:0,built:0,written:0,
        publishedPlayers:[] as string[],errors:["No verified player candidates were available after market sync"],rejections,
      };
    }
    const statsBatches = Array.from(
      { length:Math.ceil(candidates.length / PLAYER_INDEX_STATS_BATCH_SIZE) },
      (_,batchIndex) => candidates.slice(
        batchIndex * PLAYER_INDEX_STATS_BATCH_SIZE,
        (batchIndex + 1) * PLAYER_INDEX_STATS_BATCH_SIZE,
      ),
    );
    const statsPayloads = await mapWithConcurrency(
      statsBatches,PLAYER_INDEX_STATS_CONCURRENCY,(batch) =>
        cardHedgeFetch<PlayerSalesStatsResponse>("/v1/cards/sales-stats-by-player",{
          players:batch.map((candidate) => candidate.player),interval:"day",periods:60,include_current:false,
        }),
    );
    const statsByPlayer = new Map(statsPayloads.flatMap((payload) => payload.results ?? [])
      .map((result) => [normalized(result.player),result]));
    const recentByPlayer = new Map(recentFeatures.map((feature) => [normalized(feature.player),feature]));
    const finalists = candidates.flatMap((candidate) => {
      const stats = statsByPlayer.get(normalized(candidate.player));
      if (!stats) {
        rejections.push(`${candidate.player}: no 60-day player statistics returned`);
        return [];
      }
      const buckets = playerSalesBuckets(stats);
      const score = playerIndexCandidateScore(candidate,buckets,recentByPlayer.get(normalized(candidate.player)),now);
      if (!Number.isFinite(score)) {
        rejections.push(`${candidate.player}: held by the three-day rotation or insufficient sales coverage`);
        return [];
      }
      return [{ candidate,buckets,score }];
    }).sort((first,second) => second.score - first.score).slice(0,PLAYER_INDEX_FINALIST_LIMIT);

    const built = await mapWithConcurrency(finalists,PLAYER_INDEX_SEARCH_CONCURRENCY,async (finalist) => {
      const { candidate,buckets } = finalist;
      const [portraitResult,searchResult] = await Promise.allSettled([
        resolvePlayerPortrait(candidate.player,candidate.sport),
        cardHedgeFetch<PlayerCardSearchResponse>("/v1/cards/search-cards-wsort",{
          player:candidate.player,category:candidate.sport,page:1,page_size:100,
          sort_by:"sales_30day",sort_order:"desc",
        }),
      ]);
      if (portraitResult.status === "rejected") {
        errors.push(`${candidate.player}: ${portraitResult.reason instanceof Error ? portraitResult.reason.message : "portrait request failed"}`);
      }
      if (searchResult.status === "rejected") {
        errors.push(`${candidate.player}: ${searchResult.reason instanceof Error ? searchResult.reason.message : "card search failed"}`);
      }
      const portrait = portraitResult.status === "fulfilled" ? portraitResult.value : null;
      const search = searchResult.status === "fulfilled" ? searchResult.value : { cards:[],count:0,pages:0 };
      if (!portrait) {
        rejections.push(`${candidate.player}: no exact approved player portrait`);
        return null;
      }
      const cards = (search.cards ?? []).flatMap((card) => {
        const parsed = playerIndexCard(card,candidate.player);
        return parsed ? [parsed] : [];
      });
      const story = buildPlayerIndexStory({
        player:candidate.player,sport:candidate.sport,playerImageUrl:portrait.imageUrl,buckets,cards,
        catalogMatches:Number(search.count ?? search.cards?.length ?? 0),updatedAt:now,
      });
      if (!story) rejections.push(`${candidate.player}: insufficient active-card breadth after quality checks`);
      return story;
    });
    const qualifiedStories = built.filter((story):story is MarketStory => Boolean(story));
    const selected = selectFeaturedPlayerIndexes(qualifiedStories,recentFeatures,{ target:PLAYER_INDEX_DAILY_TARGET,now });
    if (selected.length < PLAYER_INDEX_DAILY_MINIMUM) {
      errors.push(`Only ${selected.length} qualified rotating indexes were available; keeping the prior active lineup`);
      return {
        requested:PLAYER_INDEX_DAILY_TARGET,candidateCount:candidates.length,finalistCount:finalists.length,
        built:qualifiedStories.length,written:0,publishedPlayers:[] as string[],errors,rejections,
      };
    }
    for (const story of selected) await upsertPlayerIndexStory(story,false);
    await deletePlayerIndexesExcept(selected.map((story) => story.player));
    await recordPlayerIndexFeatures(selected);
    return {
      requested:PLAYER_INDEX_DAILY_TARGET,candidateCount:candidates.length,finalistCount:finalists.length,
      built:qualifiedStories.length,written:selected.length,publishedPlayers:selected.map((story) => story.player),
      errors,rejections,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "player sales request failed");
    return {
      requested:PLAYER_INDEX_DAILY_TARGET,candidateCount:0,finalistCount:0,built:0,written:0,
      publishedPlayers:[] as string[],errors,rejections,
    };
  }
}

function gradeValue(label: string) {
  const match = label.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? Number(match[1]) : -1;
}

function vintageGradePriority(label: string) {
  const upper = label.toUpperCase();
  const value = gradeValue(upper);
  const provider = upper.startsWith("PSA ") ? 0
    : upper.startsWith("SGC ") ? 2
    : upper.startsWith("BGS ") ? 4
    : upper.startsWith("CGC ") ? 6
    : 8;
  if (value > 0 && value <= 8) return (8 - value) * 10 + provider;
  if (value > 8) return 120 + (10 - value) * 10 + provider;
  if (upper === "RAW") return 240;
  return 300;
}

function vintageGradeCandidates(card: CardSearchItem):GradeSelection[] {
  return parseGradePrices(card)
    .map((item) => ({ grade:item.grade,price:item.price }))
    .sort((a,b) => vintageGradePriority(a.grade) - vintageGradePriority(b.grade));
}

async function pickVintageGrade(card: Candidate):Promise<GradeSelection | undefined> {
  const candidates = vintageGradeCandidates(card);
  if (!candidates.length) return undefined;
  try {
    const payload = await cardHedgeFetch<{ results?:Array<Record<string,unknown>> }>("/v1/cards/card-fmv-batch",{
      items:candidates.map((item) => ({ card_id:card.card_id,grade:item.grade })),
    });
    const results = payload.results ?? [];
    for (const candidate of candidates) {
      const fmv = results.find((item) => String(item.grade ?? item.grade_label ?? "").toUpperCase() === candidate.grade.toUpperCase());
      if (!fmv) continue;
      const currentValue = Number(fmv.price ?? 0);
      const confidenceGrade = String(fmv.confidence_grade ?? "N/A").toUpperCase();
      const freshnessDays = Number(fmv.freshness_days ?? Number.POSITIVE_INFINITY);
      if (!validPrice(currentValue) || !TRUSTED_CONFIDENCE.has(confidenceGrade)) continue;
      if (!Number.isFinite(freshnessDays) || freshnessDays > MAX_FRESHNESS_DAYS) continue;
      if (validPrice(candidate.price) && !withinPriceFactor(currentValue,candidate.price)) continue;
      return { ...candidate,fmvPayload:fmv };
    }
    return undefined;
  } catch (error) {
    console.warn("[cardhedge] vintage grade batch lookup failed",{
      cardId:card.card_id,error:error instanceof Error ? error.message : "Unknown error",
    });
    return candidates[0];
  }
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
  const ladder = ["PSA 10","PSA 9","RAW"].flatMap((grade) => {
    const price = byGrade.get(grade);
    return price ? [price] : [];
  });
  if (ladder.length < 2) return { prices:[] as MarketGradePrice[],multiple:0 };
  const pricesDescendByGrade = ladder.every((item,index) => index === 0 || ladder[index - 1].price > item.price);
  if (!pricesDescendByGrade) return { prices:[] as MarketGradePrice[],multiple:0 };
  const multiple = ladder[0].price / ladder[ladder.length - 1].price;
  if (multiple >= MIN_GRADE_GAP_MULTIPLE && multiple <= MAX_GRADE_GAP_MULTIPLE) {
    return { prices:ladder,multiple };
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
  const year = cardYear(card);
  const isVintage = year >= 1800 && year < 1980;
  const vintageOnly = card.discoveryKinds.length === 1 && card.discoveryKinds[0] === "vintage_mover";
  if (vintageOnly && !isVintage) return rejection(card,"vintage search did not resolve to a vintage card");
  const sales30d = Number(card["30 Day Sales"] ?? 0);
  const sales7d = Number(card["7 Day Sales"] ?? 0);
  const minimumSales30d = isVintage ? MIN_VINTAGE_30_DAY_SALES : MIN_30_DAY_SALES;
  if (!Number.isFinite(sales30d) || sales30d < minimumSales30d) {
    return rejection(card,isVintage ? "insufficient vintage 30-day sales" : "insufficient 30-day sales");
  }
  if (!Number.isFinite(sales7d) || sales7d < 0 || sales7d > sales30d) return rejection(card,"inconsistent sales totals");

  const imageUrl = normalizedImage(card.image);
  if (!imageUrl) return rejection(card,"missing valid card image");

  const sourceChange7d = Number(card.gain ?? 0);
  const sourceChange30d = Number(card.gain_30day ?? card.gain ?? 0);
  if (!Number.isFinite(sourceChange7d)) return rejection(card,"invalid 7-day percentage change");
  if (!Number.isFinite(sourceChange30d)) return rejection(card,"invalid 30-day percentage change");
  if (!isVintage && Math.abs(sourceChange7d) > MAX_ABS_CHANGE_7D) return rejection(card,"extreme 7-day percentage change");
  if (!isVintage && Math.abs(sourceChange30d) > MAX_ABS_CHANGE_30D) return rejection(card,"extreme 30-day percentage change");

  const selected = isVintage ? await pickVintageGrade(card) : pickGrade(card);
  if (!selected) return rejection(card,isVintage ? "no trusted vintage grade valuation" : "missing usable grade");

  const grade = selected.grade;
  const [fmvResult, compsResult] = await Promise.allSettled([
    selected.fmvPayload ? Promise.resolve(selected.fmvPayload) : cardHedgeFetch<Record<string, unknown>>("/v1/cards/card-fmv", { card_id:card.card_id, grade }),
    cardHedgeFetch<Record<string, unknown>>("/v1/cards/comps", { card_id:card.card_id, count:10, grade, include_raw_prices:true, time_weighted:true }),
  ]);

  const fmvPayload = fmvResult.status === "fulfilled" ? fmvResult.value : {};
  const fmv = (fmvPayload.fmv ?? fmvPayload) as Record<string, unknown>;
  const fallbackPrice = selected.price;
  const currentValue = Number(fmv.price ?? fallbackPrice);
  if (!validPrice(currentValue)) return rejection(card,"extreme or invalid FMV");
  if (validPrice(fallbackPrice) && !withinPriceFactor(currentValue,fallbackPrice)) return rejection(card,"FMV conflicts with listed price");

  const confidenceGrade = String(fmv.confidence_grade ?? "N/A").toUpperCase();
  if (!TRUSTED_CONFIDENCE.has(confidenceGrade)) return rejection(card,"FMV confidence below B");
  const freshnessDays = Number(fmv.freshness_days ?? Number.POSITIVE_INFINITY);
  if (!Number.isFinite(freshnessDays) || freshnessDays > MAX_FRESHNESS_DAYS) return rejection(card,"stale FMV");

  const rawComps = compsResult.status === "fulfilled" ? parseComps(compsResult.value) : [];
  const compPrices = rawComps.map((item) => item.price).filter(validPrice);
  if (compPrices.length >= 3 && !withinPriceFactor(currentValue,median(compPrices))) return rejection(card,"FMV conflicts with comparable sales");

  const change7d = sourceChange7d;
  const change30d = sourceChange30d;
  if (Math.abs(change7d) > MAX_ABS_CHANGE_7D) return rejection(card,"extreme 7-day percentage change");
  if (Math.abs(change30d) > MAX_ABS_CHANGE_30D) return rejection(card,"extreme 30-day percentage change");
  if (vintageOnly && Math.abs(change30d) < MIN_MEANINGFUL_CHANGE) return rejection(card,"no meaningful vintage price move");
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
  if (gap.prices.length >= 2) eligibleKinds.push("grade_gap");
  if (sales7d >= MIN_SURGE_7_DAY_SALES && salesPaceMultiple >= MIN_SURGE_MULTIPLE && salesPaceMultiple <= MAX_SURGE_MULTIPLE) {
    eligibleKinds.push("sales_surge");
  }
  if (Boolean(card.rookie)) eligibleKinds.push("rookie_watch");
  if (isVintage && Math.abs(change30d) >= MIN_MEANINGFUL_CHANGE) {
    eligibleKinds.push("vintage_mover");
  }
  if (!eligibleKinds.length) return rejection(card,"no eligible market story format");

  const updatedAt = new Date().toISOString();
  const chart = [currentValue,currentValue];

  return { facts:{
    player:card.player || "Unknown player", sport:displayCategory(card.category || "Sports Cards"),
    cardId:card.card_id, cardTitle:card.description, imageUrl, grade, currentValue, change7d, change30d,
    sales7d, sales30d, confidenceGrade, freshnessDays, chart, comps, rookie:Boolean(card.rookie), cardYear:year,
    gradePrices:gap.prices, gradeGapMultiple:gap.multiple,
    salesPaceMultiple:Number.isFinite(salesPaceMultiple) ? salesPaceMultiple : 0,
    previous23DaySales, recentSale, updatedAt, eligibleKinds,
  } satisfies MarketFacts, reason:null, cardId:card.card_id } as const;
}

type DiscoveryRequest = { category:string; discoveryKind:DiscoveryKind; path:string; body:Record<string,unknown> };

async function runDiscoveryRequests(requests: DiscoveryRequest[]) {
  return mapWithConcurrency(requests,SEARCH_CONCURRENCY,async (item) => {
    try {
      return await cardHedgeFetch<{ cards?:CardSearchItem[] }>(item.path,item.body);
    } catch (error) {
      console.warn(JSON.stringify({
        level:"warn",message:"Market candidate search failed",category:item.category,
        storyKind:item.discoveryKind,error:error instanceof Error ? error.message : "Unknown error",
      }));
      return { cards:[] };
    }
  });
}

async function discoverCandidates() {
  const modernRequests: DiscoveryRequest[] = [];
  for (const category of CATEGORIES) {
    modernRequests.push({ category,discoveryKind:"biggest_gain",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"gain_30day",sort_order:"desc",page:1,page_size:RESULTS_PER_BUCKET } });
    modernRequests.push({ category,discoveryKind:"biggest_loss",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"gain_30day",sort_order:"asc",page:1,page_size:RESULTS_PER_BUCKET } });
    modernRequests.push({ category,discoveryKind:"high_sales_30d",path:"/v1/cards/search-cards-wsort",body:{ category,sort_by:"sales_30day",sort_order:"desc",page:1,page_size:GRADE_PREMIUM_POOL_SIZE } });
    modernRequests.push({ category,discoveryKind:"rookie_watch",path:"/v1/cards/card-search",body:{ category,rookie:"yes",page:1,page_size:RESULTS_PER_BUCKET } });
  }
  const vintageRequests:DiscoveryRequest[] = VINTAGE_SEARCH_YEARS.map((year) => ({
    category:"Vintage " + year,discoveryKind:"vintage_mover",path:"/v1/cards/search-cards-wsort",
    body:{ search:year,sort_by:"sales_30day",sort_order:"desc",page:1,page_size:VINTAGE_RESULTS_PER_YEAR },
  }));
  const [modernResponses,vintageResponses] = await Promise.all([
    runDiscoveryRequests(modernRequests),runDiscoveryRequests(vintageRequests),
  ]);
  const candidates = new Map<string,Candidate>();
  const modernCategoryCounts = new Map<string,number>();
  const playerCandidateCounts = new Map<string,number>();
  const addCandidate = (card:CardSearchItem,discoveryKind:DiscoveryKind,category: string, enforceCategoryLimit = true) => {
    if (!quickDiscoveryEligible(card,discoveryKind)) return false;
    const existing = candidates.get(card.card_id);
    if (existing) {
      if (!existing.discoveryKinds.includes(discoveryKind)) existing.discoveryKinds.push(discoveryKind);
      return true;
    }
    const display = displayCategory(category);
    if (enforceCategoryLimit) {
      const target = CATEGORY_TARGETS[display as TargetCategory];
      if (!target) return false;
      const categoryLimit = target * 2;
      if ((modernCategoryCounts.get(display) ?? 0) >= categoryLimit) return false;
    }
    const player = normalized(card.player || card.description || card.card_id);
    const playerCountKey = `${display}|${player}`;
    if ((playerCandidateCounts.get(playerCountKey) ?? 0) >= MAX_DISCOVERY_CARDS_PER_PLAYER) return false;
    candidates.set(card.card_id,{ ...card,discoveryKinds:[discoveryKind] });
    modernCategoryCounts.set(display,(modernCategoryCounts.get(display) ?? 0) + 1);
    playerCandidateCounts.set(playerCountKey,(playerCandidateCounts.get(playerCountKey) ?? 0) + 1);
    return true;
  };

  const selectedGradePremiumIds = new Set<string>();
  for (let index = 0; index < modernResponses.length; index += 1) {
    if (modernRequests[index].discoveryKind !== "high_sales_30d") continue;
    const category = displayCategory(modernRequests[index].category) as TargetCategory;
    const premiumLimit = Math.min(
      GRADE_PREMIUM_CANDIDATES_PER_CATEGORY,
      Math.max(3,Math.ceil(CATEGORY_TARGETS[category] / 3)),
    );
    const premiumCards = (modernResponses[index].cards ?? [])
      .filter((card) => quickDiscoveryEligible(card,"grade_premium"))
      .map((card) => ({ card,gap:gradeGap(parseGradePrices(card)) }))
      .filter((item) => item.gap.prices.length >= 2)
      .sort((a,b) => b.gap.prices.length - a.gap.prices.length || Number(b.card["30 Day Sales"] ?? 0) - Number(a.card["30 Day Sales"] ?? 0));
    let categoryCount = 0;
    for (const { card } of premiumCards) {
      if (selectedGradePremiumIds.has(card.card_id)) continue;
      if (!addCandidate(card,"grade_premium",modernRequests[index].category)) continue;
      selectedGradePremiumIds.add(card.card_id);
      categoryCount += 1;
      if (categoryCount === premiumLimit) break;
    }
  }

  for (let rank = 0; rank < RESULTS_PER_BUCKET; rank += 1) {
    for (let index = 0; index < modernResponses.length; index += 1) {
      const card = modernResponses[index]?.cards?.[rank];
      if (!card) continue;
      addCandidate(card,modernRequests[index].discoveryKind,modernRequests[index].category);
    }
  }

  const eligibleVintageResponses = vintageResponses.map((response) => (response.cards ?? [])
    .filter((card) => isVintageCard(card) && hasVintageSalesVolume(card) && quickDiscoveryEligible(card,"vintage_mover")));
  const verifiedVintageIds = new Set(eligibleVintageResponses.flatMap((cards) => cards.map((card) => card.card_id)));
  const selectedVintageIds = new Set<string>();
  for (let rank = 0; rank < VINTAGE_RESULTS_PER_YEAR && selectedVintageIds.size < MAX_VINTAGE_CANDIDATES; rank += 1) {
    for (const cards of eligibleVintageResponses) {
      const card = cards[rank];
      if (!card || selectedVintageIds.has(card.card_id)) continue;
      if (!addCandidate(card,"vintage_mover","Vintage",false)) continue;
      selectedVintageIds.add(card.card_id);
      if (selectedVintageIds.size === MAX_VINTAGE_CANDIDATES) break;
    }
  }
  const rawVintageCards = vintageResponses.reduce((count,response) => count + (response.cards?.length ?? 0),0);
  return {
    candidates:[...candidates.values()],
    stats:{
      vintageYearQueries:VINTAGE_SEARCH_YEARS.length,
      rawVintageCards,verifiedVintageCards:verifiedVintageIds.size,
      selectedVintageCards:selectedVintageIds.size,
      selectedGradePremiumCards:selectedGradePremiumIds.size,
      modernCardsSelected:[...modernCategoryCounts.entries()].reduce((result,[category,count]) => ({ ...result,[category]:count }),{}),
      candidateSearchDepth:RESULTS_PER_BUCKET,
    },
  };
}

function storyScore(facts: MarketFacts, kind: MarketStoryKind) {
  if (kind === "high_sales_30d" || kind === "rookie_watch") return facts.sales30d;
  if (kind === "biggest_gain") return facts.change30d;
  if (kind === "biggest_loss") return Math.abs(facts.change30d);
  if (kind === "vintage_mover") return Math.abs(facts.change30d);
  if (kind === "recent_sale") return facts.recentSale ? Date.parse(facts.recentSale.date) : 0;
  if (kind === "grade_gap") return facts.gradeGapMultiple;
  return facts.salesPaceMultiple;
}

function targetCategory(facts: Pick<MarketFacts,"cardYear" | "sport">):TargetCategory | null {
  if (facts.cardYear >= 1800 && facts.cardYear < 1980) return "Vintage";
  if (facts.sport === "Pokemon" || facts.sport === "Pokémon") return "Pokémon";
  return Object.prototype.hasOwnProperty.call(CATEGORY_TARGETS,facts.sport)
    ? facts.sport as TargetCategory
    : null;
}

function usd(value: number) {
  return value.toLocaleString("en-US",{ style:"currency",currency:"USD",maximumFractionDigits:0 });
}

function saleVsFmv(salePrice: number, currentValue: number) {
  if (!validPrice(salePrice) || !validPrice(currentValue)) return 0;
  return (salePrice / currentValue - 1) * 100;
}

function paceDirection(multiple: number) {
  const change = (multiple - 1) * 100;
  if (!Number.isFinite(change) || Math.abs(change) < 1) return "roughly even with";
  return Math.abs(change).toFixed(0) + "% " + (change > 0 ? "faster than" : "slower than");
}

function summaryFor(facts: MarketFacts, kind: MarketStoryKind) {
  const descriptor = facts.cardTitle + " · " + facts.grade + ". ";
  if (kind === "high_sales_30d") {
    const recentShare = facts.sales30d ? Math.round(facts.sales7d / facts.sales30d * 100) : 0;
    return descriptor + facts.sales30d.toLocaleString() + " recorded 30-day sales, with " + recentShare + "% occurring in the latest seven days. The recent daily pace is " + paceDirection(facts.salesPaceMultiple) + " the preceding 23 days.";
  }
  if (kind === "biggest_gain" || kind === "biggest_loss") {
    const multiplier = 1 + facts.change30d / 100;
    const prior = multiplier > 0 ? facts.currentValue / multiplier : 0;
    const dollarMove = validPrice(prior) ? Math.abs(facts.currentValue - prior) : 0;
    return descriptor + "Estimated value moved " + (facts.change30d < 0 ? "down " : "up ") + Math.abs(facts.change30d).toFixed(1) + "% over 30 days"
      + (dollarMove ? ", a change of about " + usd(dollarMove) : "") + ", across " + facts.sales30d.toLocaleString() + " recorded sales.";
  }
  if (kind === "vintage_mover") return descriptor + "This " + facts.cardYear + " card moved " + (facts.change30d < 0 ? "down " : "up ") + Math.abs(facts.change30d).toFixed(1) + "% over 30 days across " + facts.sales30d.toLocaleString() + " recorded sales.";
  if (kind === "recent_sale" && facts.recentSale) {
    const difference = saleVsFmv(facts.recentSale.price,facts.currentValue);
    const comparison = Math.abs(difference) < 0.05
      ? "in line with"
      : Math.abs(difference).toFixed(1) + "% " + (difference < 0 ? "below" : "above");
    return descriptor + "The latest comparable sale closed at " + usd(facts.recentSale.price) + ", " + comparison + " the current " + usd(facts.currentValue) + " estimated value" + (facts.recentSale.venue ? " via " + facts.recentSale.venue + "." : ".");
  }
  if (kind === "grade_gap") {
    const low = facts.gradePrices[facts.gradePrices.length - 1];
    const ladder = facts.gradePrices.map((item) => item.grade + " " + item.price.toLocaleString("en-US",{ style:"currency",currency:"USD",maximumFractionDigits:0 })).join(" · ");
    const premium = facts.gradePrices[0].price - low.price;
    return descriptor + ladder + ". " + facts.gradePrices[0].grade + " is priced " + usd(premium) + " above " + low.grade + ", a " + facts.gradeGapMultiple.toFixed(1) + "× multiple.";
  }
  if (kind === "sales_surge") return descriptor + "The last seven days produced " + facts.sales7d.toLocaleString() + " sales and are running at " + facts.salesPaceMultiple.toFixed(1) + "× the daily pace of the preceding 23 days.";
  return descriptor + "This rookie card has " + facts.sales30d.toLocaleString() + " recorded 30-day sales. Its seven-day pace is " + paceDirection(facts.salesPaceMultiple) + " the preceding 23 days, while estimated value is " + (facts.change30d < 0 ? "down " : "up ") + Math.abs(facts.change30d).toFixed(1) + "% over 30 days.";
}

function buildStory(facts: MarketFacts, storyKind: MarketStoryKind):MarketStory {
  const { eligibleKinds:_,...storyFacts } = facts;
  return {
    ...storyFacts, id:"market-" + facts.cardId, type:"market", storyKind,
    headline:marketHeadline({
      cardId:facts.cardId,player:facts.player,storyKind,change30d:facts.change30d,sales30d:facts.sales30d,
      cardYear:facts.cardYear,
      gradePrices:facts.gradePrices,gradeGapMultiple:facts.gradeGapMultiple,
      salesPaceMultiple:facts.salesPaceMultiple,recentSale:facts.recentSale,
    }),
    summary:summaryFor(facts,storyKind),demo:false,
  };
}

function selectStories(factsList: MarketFacts[]) {
  const chosenIds = new Set<string>();
  const categories = Object.keys(CATEGORY_TARGETS) as TargetCategory[];
  const selectedByCategory = new Map<TargetCategory,MarketStory[]>(categories.map((category) => [category,[]]));
  const selectedByKind = new Map<MarketStoryKind,number>();
  const selectedByPlayer = new Map<string,number>();
  const selectForKind = (category:TargetCategory,kind:MarketStoryKind) => {
    const selected = selectedByCategory.get(category) ?? [];
    if (selected.length >= CATEGORY_TARGETS[category]) return false;
    const options = factsList
      .filter((facts) => {
        const player = normalized(facts.player);
        return !chosenIds.has(facts.cardId)
          && targetCategory(facts) === category
          && facts.eligibleKinds.includes(kind)
          && (selectedByPlayer.get(player) ?? 0) < MAX_PUBLISHED_STORIES_PER_PLAYER;
      })
      .sort((a,b) => {
        const playerDifference = (selectedByPlayer.get(normalized(a.player)) ?? 0)
          - (selectedByPlayer.get(normalized(b.player)) ?? 0);
        return playerDifference || storyScore(b,kind) - storyScore(a,kind);
      });
    const facts = options[0];
    if (!facts) return false;
    chosenIds.add(facts.cardId);
    selected.push(buildStory(facts,kind));
    selectedByCategory.set(category,selected);
    selectedByKind.set(kind,(selectedByKind.get(kind) ?? 0) + 1);
    const player = normalized(facts.player);
    selectedByPlayer.set(player,(selectedByPlayer.get(player) ?? 0) + 1);
    return true;
  };

  const kindOrder = Object.keys(STORY_KIND_TARGETS) as MarketStoryKind[];
  for (const kind of kindOrder) {
    const target = STORY_KIND_TARGETS[kind] ?? 0;
    const eligibleCategories = kind === "vintage_mover"
      ? ["Vintage" as const]
      : categories.filter((category) => category !== "Vintage");
    let added = true;
    while ((selectedByKind.get(kind) ?? 0) < target && added) {
      added = false;
      const byNeed = [...eligibleCategories].sort((first,second) => {
        const firstFill = (selectedByCategory.get(first)?.length ?? 0) / CATEGORY_TARGETS[first];
        const secondFill = (selectedByCategory.get(second)?.length ?? 0) / CATEGORY_TARGETS[second];
        return firstFill - secondFill;
      });
      for (const category of byNeed) {
        if ((selectedByKind.get(kind) ?? 0) >= target) break;
        if (selectForKind(category,kind)) added = true;
      }
    }
  }

  for (const category of categories) {
    const kinds = category === "Vintage" ? ["vintage_mover" as const] : MODERN_STORY_KINDS;
    let added = true;
    while ((selectedByCategory.get(category)?.length ?? 0) < CATEGORY_TARGETS[category] && added) {
      added = false;
      const byNeed = [...kinds].sort((first,second) => {
        const firstTarget = STORY_KIND_TARGETS[first] ?? 1;
        const secondTarget = STORY_KIND_TARGETS[second] ?? 1;
        return (selectedByKind.get(first) ?? 0) / firstTarget - (selectedByKind.get(second) ?? 0) / secondTarget;
      });
      for (const kind of byNeed) {
        if (!selectForKind(category,kind)) continue;
        added = true;
        break;
      }
    }
  }

  const stories:MarketStory[] = [];
  let row = 0;
  while (stories.length < MAX_PUBLISHED_STORIES) {
    let added = false;
    for (const category of categories) {
      const story = selectedByCategory.get(category)?.[row];
      if (!story) continue;
      stories.push(story);
      added = true;
    }
    if (!added) break;
    row += 1;
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

async function reportSyncStage(
  runId:number,stage:string,message:string,seen = 0,written = 0,details:Record<string,unknown> = {},
) {
  console.info(JSON.stringify({ level:"info",message,source:"cardhedge",runId,stage,seen,written,...details }));
  try {
    await updateSyncProgress(runId,message,seen,written);
  } catch (error) {
    console.warn(JSON.stringify({
      level:"warn",message:"Unable to persist market sync progress",source:"cardhedge",runId,stage,
      error:error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

export async function syncMarketData() {
  if (!cardHedgeConfigured()) return { status:"skipped", seen:0, written:0, message:"Waiting for CARDHEDGE_API_KEY" };
  const startedAt = Date.now();
  const runId = await beginSync("cardhedge","Searching for market candidates…");
  let seen = 0;
  let written = 0;
  try {
    await reportSyncStage(runId,"discovery","Searching for modern cards, grading premiums and verified vintage years…");
    const discovery = await discoverCandidates();
    const candidates = discovery.candidates;
    seen = candidates.length;
    await reportSyncStage(
      runId,"valuation",
      "Confirmed " + candidates.length + " candidates, including " + discovery.stats.selectedVintageCards + " vintage. Checking grades and valuations…",
      candidates.length,0,discovery.stats,
    );
    const enriched = await mapWithConcurrency(candidates,ENRICH_CONCURRENCY,enrichCandidate);
    const qualified = enriched.flatMap((item) => item.facts ? [item.facts] : []);
    const rejected = enriched.filter((item) => !item.facts);
    await reportSyncStage(
      runId,"selection",
      "Quality checks complete: " + qualified.length + " verified and " + rejected.length + " rejected. Selecting feed stories…",
      candidates.length,0,{ qualified:qualified.length,rejected:rejected.length },
    );
    const stories = selectStories(qualified);
    await reportSyncStage(
      runId,"publishing","Publishing " + stories.length + " verified market stories…",
      candidates.length,0,{ selected:stories.length },
    );
    for (const story of stories) await upsertMarketStory(story);
    written = stories.length;
    await reportSyncStage(
      runId,"cleanup","Published " + stories.length + " stories. Removing stale feed entries…",
      candidates.length,stories.length,
    );
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
    const categoryCounts = stories.reduce<Record<string,number>>((counts,story) => {
      const category = targetCategory(story) ?? "Other";
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    },{});
    const categoryShortfalls = (Object.keys(CATEGORY_TARGETS) as TargetCategory[]).reduce<Record<string,number>>((shortfalls,category) => {
      const shortfall = CATEGORY_TARGETS[category] - (categoryCounts[category] ?? 0);
      if (shortfall > 0) shortfalls[category] = shortfall;
      return shortfalls;
    },{});
    const vintageGradeCounts = stories.filter((story) => story.storyKind === "vintage_mover").reduce<Record<string,number>>((counts,story) => {
      counts[story.grade] = (counts[story.grade] ?? 0) + 1;
      return counts;
    },{});
    const playerStoryCounts = stories.reduce<Record<string,number>>((counts,story) => {
      counts[story.player] = (counts[story.player] ?? 0) + 1;
      return counts;
    },{});
    console.info(JSON.stringify({
      level:"info",message:"Market data quality review",source:"cardhedge",runId,stage:"complete",
      durationMs:Date.now() - startedAt,seen:candidates.length,published:stories.length,rejected:rejected.length,
      deleted,reasonCounts,typeCounts,categoryTargets:CATEGORY_TARGETS,categoryCounts,categoryShortfalls,
      vintageGradeCounts,uniquePlayers:Object.keys(playerStoryCounts).length,
      repeatedPlayers:Object.fromEntries(Object.entries(playerStoryCounts).filter(([,count]) => count > 1)),
      discovery:discovery.stats,
    }));
    const categorySummary = (Object.keys(CATEGORY_TARGETS) as TargetCategory[])
      .map((category) => category + " " + (categoryCounts[category] ?? 0) + "/" + CATEGORY_TARGETS[category])
      .join(" · ");
    const message = "Market sync completed: " + stories.length + " published, " + rejected.length + " rejected, "
      + deleted + " stale removed. Player Index selection follows in the daily rotation job. Mix: " + categorySummary;
    await finishSync(runId,"success",candidates.length,stories.length,message);
    return {
      status:"success",seen:candidates.length,written:stories.length,rejected:rejected.length,deleted,message,
      categoryTargets:CATEGORY_TARGETS,categoryCounts,categoryShortfalls,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown market sync error";
    console.error(JSON.stringify({
      level:"error",message:"Market sync failed",source:"cardhedge",runId,stage:"failed",
      durationMs:Date.now() - startedAt,seen,written,error:message,
    }));
    await finishSync(runId,"failed",seen,written,message);
    throw error;
  }
}
