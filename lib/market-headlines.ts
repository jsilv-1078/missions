import type { MarketStory } from "./types";

type HeadlineInput = {
  cardId:string;
  player:string;
  storyKind:MarketStory["storyKind"];
  change30d:number;
  sales30d:number;
};

function stableChoice(seed: string, options: string[]) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(31,hash) + seed.charCodeAt(index) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

export function marketHeadline({ cardId,player,storyKind,change30d,sales30d }: HeadlineInput) {
  const change = Math.abs(change30d).toFixed(1);
  const sales = Math.max(0,Math.round(sales30d)).toLocaleString("en-US");
  const seed = cardId + ":" + storyKind;

  if (storyKind === "volume") return stableChoice(seed,[
    player + " card records " + sales + " sales in 30 days",
    player + " card ranks among the market’s most active",
    "Collectors keep trading this " + player + " card",
    "Trading stays brisk for this " + player + " card",
    player + " card keeps changing hands",
    player + " card stands out for sales volume",
    sales + " monthly sales put " + player + " in focus",
    "Market activity builds around this " + player + " card",
  ]);

  if (storyKind === "decline" || change30d < 0) return stableChoice(seed,[
    player + " card slips " + change + "% over 30 days",
    "Thirty-day price moves lower for " + player,
    player + " card cools with a " + change + "% decline",
    "Current FMV falls " + change + "% for " + player,
    player + " card trends lower this month",
    "Market price retreats for this " + player + " card",
  ]);

  return stableChoice(seed,[
    player + " card climbs " + change + "% over 30 days",
    player + " card gains momentum with a " + change + "% rise",
    "Thirty-day price moves higher for " + player,
    "Current FMV rises " + change + "% for " + player,
    player + " card trends higher this month",
    "Market price advances for this " + player + " card",
  ]);
}
