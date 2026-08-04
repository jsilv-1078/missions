import type { MarketInsightItem, MarketStory } from "./types";

const DIRECTION_THRESHOLD = 0.05;

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

function dailyBrief(markets: MarketStory[]) {
  if (!markets.length) return [];
  const rising = markets.filter((story) => direction(story.change30d) === "rising");
  const falling = markets.filter((story) => direction(story.change30d) === "falling");
  const flat = markets.length - rising.length - falling.length;
  const totalSales = markets.reduce((sum,story) => sum + story.sales30d,0);
  const mostTraded = [...markets].sort((a,b) => b.sales30d - a.sales30d)[0];
  const topGainer = [...markets].sort((a,b) => b.change30d - a.change30d)[0];
  const largestDecline = [...markets].sort((a,b) => a.change30d - b.change30d)[0];
  const leaders = [topGainer,largestDecline,mostTraded].filter((story,index,list) =>
    list.findIndex((candidate) => candidate.cardId === story.cardId) === index,
  );
  const headline = rising.length > falling.length
    ? `Pulse market leans higher: ${rising.length} of ${markets.length} tracked cards rising`
    : falling.length > rising.length
      ? `Pulse market leans lower: ${falling.length} of ${markets.length} tracked cards falling`
      : `Pulse market is split: ${rising.length} rising and ${falling.length} falling`;
  const dateKey = new Date().toISOString().slice(0,10);
  return [{
    ...mostTraded,
    id:`auto-daily-brief-${dateKey}`,
    cardId:`auto-daily-brief-${dateKey}`,
    storyKind:"daily_market_brief" as const,
    player:"Pulse Market",
    headline,
    cardTitle:`${markets.length} real card markets · ${totalSales.toLocaleString()} recorded 30-day sales`,
    summary:`This brief summarizes the ${markets.length} verified Card Hedge card markets currently shown in Pulse. It measures market breadth and recorded sales within this tracked set, not the entire collectibles market.`,
    insight:{
      cardsTracked:markets.length,
      risingCount:rising.length,
      fallingCount:falling.length,
      flatCount:flat,
      totalSales30d:totalSales,
      items:leaders.map(item),
    },
  }];
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
    .slice(0,3)
    .map((stories) => {
      const ranked = [...stories].sort((a,b) => b.sales30d - a.sales30d).slice(0,3);
      const totalSales = stories.reduce((sum,story) => sum + story.sales30d,0);
      const totalWeight = stories.reduce((sum,story) => sum + Math.max(1,story.sales30d),0);
      const averageChange = stories.reduce((sum,story) => sum + story.change30d * Math.max(1,story.sales30d),0) / totalWeight;
      const primary = ranked[0];
      return {
        ...primary,
        id:`auto-player-${slug(primary.player)}`,
        cardId:`auto-player-${slug(primary.player)}`,
        storyKind:"player_snapshot" as const,
        headline:`${primary.player} market: ${stories.length} cards, ${totalSales.toLocaleString()} sales and ${signedPercent(averageChange)}`,
        cardTitle:`${stories.length} tracked card markets · 30-day weighted direction`,
        summary:`This snapshot combines ${stories.length} verified ${primary.player} card markets. The direction is weighted by each card's recorded 30-day sales so more actively traded cards carry more influence.`,
        insight:{
          cardsTracked:stories.length,
          totalSales30d:totalSales,
          averageChange30d:averageChange,
          items:ranked.map(item),
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
    if (selected.length >= 4) break;
    if (!selected.some((candidate) => candidate.cardId === story.cardId)) selected.push(story);
  }
  return selected.slice(0,4).map((story) => {
    const active = story.sales30d >= medianSales;
    const marketDirection = direction(story.change30d);
    const label = `${active ? "ACTIVE" : "QUIET"} + ${marketDirection.toUpperCase()}`;
    return {
      ...story,
      id:`auto-signal-${story.cardId}`,
      cardId:`auto-signal-${story.cardId}`,
      storyKind:"price_volume" as const,
      headline:`${active ? "Active" : "Quieter"} trading and a ${signedPercent(story.change30d)} move put ${story.player} in focus`,
      summary:`Price direction and liquidity are shown together: this card's ${story.sales30d} recorded 30-day sales rank in the ${volumePercentile(markets,story)}th percentile of the verified markets currently tracked in Pulse.`,
      insight:{
        label,
        volumePercentile:volumePercentile(markets,story),
        items:[item(story)],
      },
    };
  });
}

function marketMatchups(markets: MarketStory[]) {
  const groups = new Map<string,MarketStory[]>();
  for (const story of markets) {
    const key = normalized(story.sport);
    if (!key) continue;
    groups.set(key,[...(groups.get(key) ?? []),story]);
  }
  return [...groups.values()]
    .filter((stories) => stories.length >= 2)
    .sort((a,b) => b.reduce((sum,story) => sum + story.sales30d,0) - a.reduce((sum,story) => sum + story.sales30d,0))
    .slice(0,3)
    .flatMap((stories) => {
      const lead = [...stories].sort((a,b) => b.sales30d - a.sales30d)[0];
      const alternatives = stories.filter((story) => story.cardId !== lead.cardId);
      const differentPlayer = alternatives.filter((story) => normalized(story.player) !== normalized(lead.player));
      const candidates = differentPlayer.length ? differentPlayer : alternatives;
      const challenger = [...candidates].sort((a,b) =>
        Math.abs(Math.log(Math.max(1,a.currentValue) / Math.max(1,lead.currentValue)))
        - Math.abs(Math.log(Math.max(1,b.currentValue) / Math.max(1,lead.currentValue))),
      )[0];
      if (!challenger) return [];
      return [{
        ...lead,
        id:`auto-matchup-${slug(lead.sport)}-${lead.cardId}-${challenger.cardId}`,
        cardId:`auto-matchup-${slug(lead.sport)}-${lead.cardId}-${challenger.cardId}`,
        storyKind:"market_matchup" as const,
        headline:`${lead.player} vs. ${challenger.player}: two ${lead.sport} card markets compared`,
        cardTitle:`FMV, grade, 30-day direction and sales side by side`,
        summary:`This matchup compares two verified ${lead.sport} card markets with real Card Hedge FMV, grade, recorded 30-day sales and price direction. It is a market comparison, not a recommendation to buy or sell.`,
        insight:{items:[item(lead),item(challenger)]},
      }];
    });
}

export function buildAutomatedMarketStories(markets: MarketStory[]) {
  const verified = markets.filter((story) => !story.demo && Number.isFinite(story.currentValue) && story.currentValue > 0);
  if (!verified.length) return [];
  return [
    ...dailyBrief(verified),
    ...playerSnapshots(verified),
    ...priceVolumeSignals(verified),
    ...marketMatchups(verified),
  ];
}
