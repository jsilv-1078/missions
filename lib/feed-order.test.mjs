import assert from "node:assert/strict";
import test from "node:test";
import { RECENT_CARD_COOLDOWN_MS, remixFeedStories } from "./feed-order.ts";

function market(id,player,sport,storyKind) {
  return {
    id,type:"market",storyKind,player,sport,headline:id,summary:id,cardId:id,cardTitle:id,
    imageUrl:"https://example.com/card.jpg",grade:"Raw",currentValue:10,change7d:1,change30d:2,
    sales7d:2,sales30d:10,confidenceGrade:"A",freshnessDays:0,chart:[],comps:[],rookie:false,
    cardYear:2024,gradePrices:[],gradeGapMultiple:0,salesPaceMultiple:1,previous23DaySales:8,
    updatedAt:"2026-08-12T00:00:00.000Z",demo:false,
  };
}

test("remix preserves every story and spaces avoidable immediate repeats",() => {
  const kinds = ["high_sales_30d","grade_gap","rookie_watch","sales_surge"];
  const sports = ["Baseball","Football","Basketball","Hockey"];
  const stories = Array.from({ length:24 },(_,index) =>
    market(String(index),`Player ${index % 12}`,sports[index % sports.length],kinds[index % kinds.length]),
  );

  for (let run = 0; run < 10; run += 1) {
    const ordered = remixFeedStories(stories);
    assert.equal(ordered.length,stories.length);
    assert.equal(new Set(ordered.map((story) => story.id)).size,stories.length);
    for (let index = 1; index < ordered.length; index += 1) {
      assert.notEqual(ordered[index].player,ordered[index - 1].player);
      assert.notEqual(ordered[index].storyKind,ordered[index - 1].storyKind);
    }
  }
});

test("a recently viewed card is held behind fresh cards",() => {
  const now = Date.parse("2026-08-12T00:00:00.000Z");
  const stories = [
    market("recent","Recent","Baseball","high_sales_30d"),
    market("fresh-1","Fresh 1","Football","grade_gap"),
    market("fresh-2","Fresh 2","Basketball","rookie_watch"),
    market("fresh-3","Fresh 3","Hockey","sales_surge"),
  ];
  const ordered = remixFeedStories(stories,undefined,{
    now,recentCardTimestamps:{ recent:now - RECENT_CARD_COOLDOWN_MS / 2 },
  });
  assert.equal(ordered.at(-1)?.id,"recent");
});
