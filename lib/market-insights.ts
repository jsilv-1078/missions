import type { MarketInsightItem, MarketStory } from "./types";

const DIRECTION_THRESHOLD = 0.05;
const MAX_PRICE_VOLUME_STORIES = 10;
const MAX_MATCHUP_STORIES = 5;
const MAX_MATCHUP_SALES_RATIO = 1.5;

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function slug(value: string) {
  return normalized(value).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "market";
}

function item(story: MarketStory): MarketInsightItem {
  return {
    id:story.cardId,
    player:story.player,
    sport:story.sport,
    cardTitle:story.cardTitle,
    imageUrl:story.imageUrl,
    grade:story.grade,
    currentValue:story.currentValue,
    change30d:story.change30d,
    sales30d:story.sales30d,
  };
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
}

function direction(value: number) {
  if (value > DIRECTION_THRESHOLD) return "rising";
  if (value < -DIRECTION_THRESHOLD) return "falling";
  return "flat";
}

function volumePercentile(markets: MarketStory[], target: MarketStory) {
  if (markets.length <= 1) return 100;
  const sorted = [...markets].sort((a,b) => a.sales30d - b.sales30d);
  const index = sorted.findIndex((story) => story.cardId === target.cardId);
  return Math.round((Math.max(0,index) / (sorted.length - 1)) * 100);
}

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function playerSnapshots(markets: MarketStory[]) {
  const groups = new Map<string,MarketStory[]>();
  for (const story of markets) {
    const key = normalized(story.player);
    if (!key || key === "unknown") continue;
    groups.set(key,[...(groups.get(key) ?? []),story]);
  }
  return [...groups.values()]
    .filter((stories) => stories.length >= 2)
    .sort((a,b) => b.reduce((sum,story) => sum + story.sales30d,0) - a.reduce((sum,story) => sum + story.sales30d,0))
    .slice(0,5)
    .map((stories) => {
      const selected = [...stories].sort((a,b) => b.sales30d - a.sales30d).slice(0,3);
      const totalSales = selected.reduce((sum,story) => sum + story.sales30d,0);
      const totalWeight = selected.reduce((sum,story) => sum + Math.max(1,story.sales30d),0);
      const averageChange = selected.reduce((sum,story) => sum + story.change30d * Math.max(1,story.sales30d),0) / totalWeight;
      const primary = selected[0];
      return {
        ...primary,
        id:`auto-player-${slug(primary.player)}`,
        cardId:`auto-player-${slug(primary.player)}`,
        storyKind:"player_snapshot" as const,
        headline:`${primary.player} market: ${selected.length} cards, ${totalSales.toLocaleString()} sales and ${signedPercent(averageChange)}`,
        cardTitle:`${selected.length} tracked card markets · 30-day weighted direction`,
        summary:`This snapshot combines ${selected.length} verified ${primary.player} card markets. The direction is weighted by each card's recorded 30-day sales so more actively traded cards carry more influence.`,
        insight:{
          cardsTracked:selected.length,
          totalSales30d:totalSales,
          averageChange30d:averageChange,
          items:selected.map(item),
        },
      };
    });
}

function priceVolumeSignals(markets: MarketStory[]) {
  if (!markets.length) return [];
  const bySales = [...markets].sort((a,b) => a.sales30d - b.sales30d);
  const medianSales = bySales[Math.floor(bySales.length / 2)]?.sales30d ?? 0;
  const ranked = [...markets].sort((a,b) => b.sales30d - a.sales30d || Math.abs(b.change30d) - Math.abs(a.change30d));
  const selected:MarketStory[] = [];
  for (const marketDirection of ["rising","falling","flat"]) {
    const match = ranked.find((story) => direction(story.change30d) === marketDirection);
    if (match && !selected.some((story) => story.cardId === match.cardId)) selected.push(match);
  }
  for (const story of ranked) {
    if (selected.length >= MAX_PRICE_VOLUME_STORIES) break;
    if (!selected.some((candidate) => candidate.cardId === story.cardId)) selected.push(story);
  }
  return selected.slice(0,MAX_PRICE_VOLUME_STORIES).map((story) => {
    const active = story.sales30d >= medianSales;
    const marketDirection = direction(story.change30d);
    const label = `${active ? "ACTIVE" : "QUIET"} + ${marketDirection.toUpperCase()}`;
    const percentile = volumePercentile(markets,story);
    return {
      ...story,
      id:`auto-signal-${story.cardId}`,
      cardId:`auto-signal-${story.cardId}`,
      storyKind:"price_volume" as const,
      headline:`${active ? "Active" : "Quieter"} trading and a ${signedPercent(story.change30d)} move put ${story.player} in focus`,
      summary:`Price direction and liquidity are shown together: this card's ${story.sales30d} recorded 30-day sales rank in the ${ordinal(percentile)} percentile of the verified markets currently tracked in Pulse.`,
      insight:{
        label,
        volumePercentile:percentile,
        items:[item(story)],
      },
    };
  });
}

function marketMatchups(markets: MarketStory[]) {
  const groups = new Map<string,MarketStory[]>();
  for (const story of markets) {
    const key = `${normalized(story.sport)}|${normalized(story.grade)}`;
    if (!story.sport.trim() || !story.grade.trim() || story.sales30d <= 0) continue;
    groups.set(key,[...(groups.get(key) ?? []),story]);
  }
  const candidates = [...groups.values()].flatMap((stories) => {
    const pairs:Array<{ lead:MarketStory;challenger:MarketStory;salesRatio:number;combinedSales:number }> = [];
    for (let first = 0; first < stories.length; first += 1) {
      for (let second = first + 1; second < stories.length; second += 1) {
        const lead = stories[first];
        const challenger = stories[second];
        if (normalized(lead.player) === normalized(challenger.player)) continue;
        const salesRatio = Math.max(lead.sales30d,challenger.sales30d) / Math.min(lead.sales30d,challenger.sales30d);
        if (salesRatio > MAX_MATCHUP_SALES_RATIO) continue;
        pairs.push({ lead,challenger,salesRatio,combinedSales:lead.sales30d + challenger.sales30d });
      }
    }
    return pairs;
  }).sort((a,b) => b.combinedSales - a.combinedSales || a.salesRatio - b.salesRatio);

  const usedCardIds = new Set<string>();
  const sportCounts = new Map<string,number>();
  const selected:MarketStory[] = [];
  for (const candidate of candidates) {
    if (selected.length >= MAX_MATCHUP_STORIES) break;
    if (usedCardIds.has(candidate.lead.cardId) || usedCardIds.has(candidate.challenger.cardId)) continue;
    const sportKey = normalized(candidate.lead.sport);
    if ((sportCounts.get(sportKey) ?? 0) >= 2) continue;
    usedCardIds.add(candidate.lead.cardId);
    usedCardIds.add(candidate.challenger.cardId);
    sportCounts.set(sportKey,(sportCounts.get(sportKey) ?? 0) + 1);
    const volumeGap = Math.round(Math.abs(candidate.lead.sales30d - candidate.challenger.sales30d) / Math.max(candidate.lead.sales30d,candidate.challenger.sales30d) * 100);
    selected.push({
      ...candidate.lead,
      id:`auto-matchup-${slug(candidate.lead.sport)}-${candidate.lead.cardId}-${candidate.challenger.cardId}`,
      cardId:`auto-matchup-${slug(candidate.lead.sport)}-${candidate.lead.cardId}-${candidate.challenger.cardId}`,
      storyKind:"market_matchup" as const,
      headline:`${candidate.lead.player} vs. ${candidate.challenger.player}`,
      cardTitle:`${candidate.lead.grade} · ${candidate.lead.sales30d.toLocaleString()} vs. ${candidate.challenger.sales30d.toLocaleString()} sales · ${volumeGap}% volume gap`,
      summary:`This matchup compares two verified ${candidate.lead.sport} cards in the same ${candidate.lead.grade} grade with similar recorded 30-day sales volume. It compares value and price direction; it is not a recommendation to buy or sell.`,
      insight:{items:[item(candidate.lead),item(candidate.challenger)]},
    });
  }
  return selected;
}

export function buildAutomatedMarketStories(markets: MarketStory[]) {
  const verified = markets.filter((story) => !story.demo && Number.isFinite(story.currentValue) && story.currentValue > 0);
  if (!verified.length) return [];
  const matchups = marketMatchups(verified);
  const matchupCardIds = new Set(matchups.flatMap((story) => story.insight?.items?.map((market) => market.id) ?? []));
  const standalone = verified.filter((story) => !matchupCardIds.has(story.cardId));
  return [
    ...playerSnapshots(standalone),
    ...priceVolumeSignals(standalone),
    ...matchups,
  ];
}
