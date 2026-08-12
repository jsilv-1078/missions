import type { MarketStory } from "./types";

// Kept local because this module is also loaded directly by Node's native TypeScript test runner.
const MAX_DIRECTIONAL_VALUE_AGE_DAYS = 7;

function valueDirectionIsCurrent(freshnessDays: number) {
  return Number.isFinite(freshnessDays)
    && freshnessDays >= 0
    && freshnessDays <= MAX_DIRECTIONAL_VALUE_AGE_DAYS;
}

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
  freshnessDays?:number;
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
  salesPaceMultiple = 0,recentSale,freshnessDays = 0,variant,
}: HeadlineInput) {
  const change = Math.abs(change30d).toFixed(1);
  const sales = Math.max(0,Math.round(sales30d)).toLocaleString("en-US");
  const seed = cardId + ":" + storyKind;
  const currentDirection = valueDirectionIsCurrent(freshnessDays);

  const activityHeadline = () => stableChoice(seed,[
    player + " card records " + sales + " sales across grades in 30 days",
    sales + " card-wide sales put " + player + " in focus",
    "Collectors record " + sales + " all-grade sales for this " + player + " card",
    player + " card activity reaches " + sales + " sales in 30 days",
  ],variant);

  if (storyKind === "high_sales_30d") {
    if (currentDirection && change30d > 0.05) return stableChoice(seed,[
      player + " card value rises " + change + "% amid " + sales + " monthly sales",
      "Active trading accompanies a " + change + "% card-value gain for " + player,
      "Collectors trade " + player + " " + sales + " times as card value climbs",
      "High volume, higher card value: " + player + " gains " + change + "%",
      player + " card value moves " + change + "% higher during busy trading",
      sales + " sales come with a " + change + "% card-value rise for " + player,
      "Trading stays brisk as " + player + " card value climbs " + change + "%",
      player + " posts heavy volume and a " + change + "% card-value gain",
    ],variant);

    if (currentDirection && change30d < -0.05) return stableChoice(seed,[
      player + " card value falls " + change + "% amid " + sales + " monthly sales",
      "Active trading accompanies a " + change + "% card-value decline for " + player,
      "Collectors trade " + player + " " + sales + " times as card value slips",
      "High volume, lower card value: " + player + " drops " + change + "%",
      player + " card value moves " + change + "% lower during busy trading",
      sales + " sales come with a " + change + "% card-value decline for " + player,
      "Trading stays brisk as " + player + " card value falls " + change + "%",
      player + " posts heavy volume but loses " + change + "% in card value",
    ],variant);

    return activityHeadline();
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

  if (storyKind === "rookie_watch") {
    if (currentDirection && change30d > 0.05) return stableChoice(seed,[
      "Rookie watch: " + player + " card value gains " + change + "%",
      player + " rookie card value climbs " + change + "% with " + sales + " sales",
      player + " RC stays active as card value moves " + change + "% higher",
      sales + " monthly sales accompany a " + change + "% rookie gain",
      "Collectors trade " + player + " as the rookie rises " + change + "%",
      player + " rookie card advances " + change + "% over 30 days",
    ],variant);

    if (currentDirection && change30d < -0.05) return stableChoice(seed,[
      "Rookie watch: " + player + " card value falls " + change + "%",
      player + " rookie card value slips " + change + "% despite " + sales + " sales",
      player + " RC stays active as card value moves " + change + "% lower",
      sales + " monthly sales accompany a " + change + "% rookie decline",
      "Collectors trade " + player + " as the rookie falls " + change + "%",
      player + " rookie card retreats " + change + "% over 30 days",
    ],variant);

    return stableChoice(seed,[
      "Rookie watch: " + player + " logs " + sales + " sales across grades",
      player + " rookie card records " + sales + " all-grade sales",
      sales + " card-wide sales put " + player + " rookie activity in focus",
      "Collectors record " + sales + " sales for this " + player + " rookie card",
    ],variant);
  }

  if (storyKind === "vintage_mover") {
    if (!currentDirection) return stableChoice(seed,[
      cardYear + " " + player + " card records " + sales + " sales across grades",
      "Vintage activity: " + sales + " card-wide sales for " + player,
      player + "’s " + cardYear + " card draws " + sales + " all-grade sales",
      "Collectors record " + sales + " sales for this vintage " + player + " card",
    ],variant);
    const year = cardYear > 0 ? String(cardYear) : "Vintage";
    const direction = change30d < 0 ? "down" : "up";
    return stableChoice(seed,[
      year + " " + player + " card moves " + direction + " " + change + "%",
      "Vintage watch: " + player + " shifts " + change + "%",
      player + "’s " + year + " card makes a vintage move",
      "A vintage card shifts for " + player,
      year + " " + player + " card changes " + change + "%",
      "Collectors track a new move in this " + player + " vintage card",
    ],variant);
  }

  if (!currentDirection && (storyKind === "biggest_gain" || storyKind === "biggest_loss")) {
    return activityHeadline();
  }

  if (storyKind === "biggest_loss" || change30d < 0) return stableChoice(seed,[
    player + " card slips " + change + "% over 30 days",
    "Thirty-day card value moves lower for " + player,
    player + " card cools with a " + change + "% decline",
    "Tracked card value falls " + change + "% for " + player,
    player + " card value trends lower this month",
    "This " + player + " card retreats in tracked value",
  ],variant);

  return stableChoice(seed,[
    player + " card climbs " + change + "% over 30 days",
    player + " card gains momentum with a " + change + "% rise",
    "Thirty-day card value moves higher for " + player,
    "Tracked card value rises " + change + "% for " + player,
    player + " card value trends higher this month",
    "This " + player + " card advances in tracked value",
  ],variant);
}
