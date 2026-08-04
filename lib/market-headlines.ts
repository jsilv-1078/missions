import type { MarketStory } from "./types";

type HeadlineInput = {
  cardId:string;
  player:string;
  storyKind:MarketStory["storyKind"];
  change30d:number;
  sales30d:number;
  gradePrices?:MarketStory["gradePrices"];
  gradeGapMultiple?:number;
  salesPaceMultiple?:number;
  recentSale?:MarketStory["recentSale"];
  variant?:number;
};

function stableChoice(seed: string, options: string[], variant?: number) {
  if (variant !== undefined) return options[Math.abs(variant) % options.length];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(31,hash) + seed.charCodeAt(index) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US",{ style:"currency",currency:"USD",maximumFractionDigits:0 }).format(value);
}

export function marketHeadline({
  cardId,player,storyKind,change30d,sales30d,gradePrices = [],gradeGapMultiple = 0,
  salesPaceMultiple = 0,recentSale,variant,
}: HeadlineInput) {
  const change = Math.abs(change30d).toFixed(1);
  const sales = Math.max(0,Math.round(sales30d)).toLocaleString("en-US");
  const seed = cardId + ":" + storyKind;

  if (storyKind === "high_sales_30d") return stableChoice(seed,[
    player + " card records " + sales + " sales in 30 days",
    player + " card ranks among the market’s most active",
    "Collectors keep trading this " + player + " card",
    "Trading stays brisk for this " + player + " card",
    player + " card keeps changing hands",
    player + " card stands out for sales volume",
    sales + " monthly sales put " + player + " in focus",
    "Market activity builds around this " + player + " card",
    player + " draws attention with " + sales + " monthly sales",
    "This " + player + " card is seeing an active market",
    player + " posts one of the feed’s stronger sales totals",
    "Sales volume keeps " + player + " on collectors’ radar",
    player + " card logs steady secondary-market action",
    "Collectors completed " + sales + " sales of this " + player + " card",
    player + " emerges as a frequently traded card",
    "A busy month puts this " + player + " card in focus",
    player + " card shows sustained trading activity",
    sales + " sales make this " + player + " card one to watch",
    "Trading volume separates this " + player + " card",
    player + " remains active across the card market",
    "This " + player + " card posts notable monthly volume",
    "Frequent sales keep " + player + " in the market conversation",
    player + " card sees consistent collector turnover",
    "The market stays busy around this " + player + " card",
  ],variant);

  if (storyKind === "recent_sale" && recentSale) return stableChoice(seed,[
    player + " card sells today for " + currency(recentSale.price),
    "Today’s sale: " + player + " closes at " + currency(recentSale.price),
    currency(recentSale.price) + " sale puts " + player + " in focus",
    "Fresh comp lands for this " + player + " card",
  ],variant);

  if (storyKind === "grade_gap") {
    const high = gradePrices[0]?.grade ?? "top grade";
    const low = gradePrices[1]?.grade ?? "lower grade";
    return stableChoice(seed,[
      high + " commands " + gradeGapMultiple.toFixed(1) + "× the " + low,
      player + " grade gap reaches " + gradeGapMultiple.toFixed(1) + "×",
      "The grading premium on " + player + " is hard to miss",
      high + " separates from " + low + " for " + player,
    ],variant);
  }

  if (storyKind === "sales_surge") return stableChoice(seed,[
    player + " sales pace accelerates " + salesPaceMultiple.toFixed(1) + "×",
    "Trading speed jumps for this " + player + " card",
    player + " card enters a faster sales cycle",
    "Collector turnover surges for " + player,
  ],variant);

  if (storyKind === "rookie_watch") return stableChoice(seed,[
    player + " rookie market draws collector attention",
    "Rookie watch: " + player + " stays active",
    player + " RC logs " + sales + " sales in 30 days",
    "Collectors keep this " + player + " rookie in view",
  ],variant);

  if (storyKind === "biggest_loss" || change30d < 0) return stableChoice(seed,[
    player + " card slips " + change + "% over 30 days",
    "Thirty-day price moves lower for " + player,
    player + " card cools with a " + change + "% decline",
    "Current FMV falls " + change + "% for " + player,
    player + " card trends lower this month",
    "Market price retreats for this " + player + " card",
  ],variant);

  return stableChoice(seed,[
    player + " card climbs " + change + "% over 30 days",
    player + " card gains momentum with a " + change + "% rise",
    "Thirty-day price moves higher for " + player,
    "Current FMV rises " + change + "% for " + player,
    player + " card trends higher this month",
    "Market price advances for this " + player + " card",
  ],variant);
}
