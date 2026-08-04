import type { MarketStory } from "./types";

type HeadlineInput = {
  cardId:string;
  player:string;
  storyKind:MarketStory["storyKind"];
  change30d:number;
  sales30d:number;
  cardYear?:number;
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
  cardId,player,storyKind,change30d,sales30d,cardYear = 0,gradePrices = [],gradeGapMultiple = 0,
  salesPaceMultiple = 0,recentSale,variant,
}: HeadlineInput) {
  const change = Math.abs(change30d).toFixed(1);
  const sales = Math.max(0,Math.round(sales30d)).toLocaleString("en-US");
  const seed = cardId + ":" + storyKind;

  if (storyKind === "high_sales_30d") {
    if (change30d > 0.05) return stableChoice(seed,[
      player + " rises " + change + "% amid " + sales + " monthly sales",
      "Active trading accompanies a " + change + "% gain for " + player,
      "Collectors trade " + player + " " + sales + " times as price climbs",
      "High volume, higher price: " + player + " gains " + change + "%",
      player + " moves " + change + "% higher in a busy market",
      sales + " sales come with a " + change + "% rise for " + player,
      "Trading stays brisk as " + player + " climbs " + change + "%",
      player + " posts heavy volume and a " + change + "% gain",
    ],variant);

    if (change30d < -0.05) return stableChoice(seed,[
      player + " falls " + change + "% amid " + sales + " monthly sales",
      "Active trading accompanies a " + change + "% decline for " + player,
      "Collectors trade " + player + " " + sales + " times as price slips",
      "High volume, lower price: " + player + " drops " + change + "%",
      player + " moves " + change + "% lower in a busy market",
      sales + " sales come with a " + change + "% decline for " + player,
      "Trading stays brisk as " + player + " falls " + change + "%",
      player + " posts heavy volume but loses " + change + "%",
    ],variant);

    return stableChoice(seed,[
      player + " stays flat amid " + sales + " monthly sales",
      "Active trading leaves " + player + " nearly unchanged",
      sales + " sales keep " + player + " busy while price holds",
      player + " posts heavy volume with little price movement",
    ],variant);
  }

  if (storyKind === "recent_sale" && recentSale) return stableChoice(seed,[
    player + " card sells today for " + currency(recentSale.price),
    "Today’s sale: " + player + " closes at " + currency(recentSale.price),
    currency(recentSale.price) + " sale puts " + player + " in focus",
    "Fresh comp lands for this " + player + " card",
  ],variant);

  if (storyKind === "grade_gap") {
    const high = gradePrices[0]?.grade ?? "top grade";
    const low = gradePrices[gradePrices.length - 1]?.grade ?? "lower grade";
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

  if (storyKind === "vintage_mover") {
    const year = cardYear > 0 ? String(cardYear) : "Pre-1980";
    const direction = change30d < 0 ? "down" : "up";
    return stableChoice(seed,[
      year + " " + player + " card moves " + direction + " " + change + "%",
      "Vintage watch: " + player + " shifts " + change + "%",
      player + "’s " + year + " card makes a vintage move",
      "Pre-1980 market shifts for " + player,
      year + " " + player + " issue changes " + change + "%",
      "Collectors track a new move in this " + player + " vintage card",
    ],variant);
  }

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
