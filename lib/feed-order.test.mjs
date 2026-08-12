import assert from "node:assert/strict";
import test from "node:test";
import { RECENT_CARD_COOLDOWN_MS, remixFeedStories, storyPlayerKeys } from "./feed-order.ts";

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

test("the opening pages prioritize unique players before repeat cards",() => {
  const kinds = ["high_sales_30d","grade_gap","rookie_watch","sales_surge"];
  const stories = Array.from({ length:30 },(_,index) =>
    market(String(index),`Player ${index % 15}`,"Baseball",kinds[index % kinds.length]),
  );

  for (let run = 0; run < 25; run += 1) {
    const opening = remixFeedStories(stories).slice(0,12);
    assert.equal(new Set(opening.flatMap(storyPlayerKeys)).size,12);
  }
});

test("matchup players count toward repetition even when they are not the lead player",() => {
  const matchup = market("matchup","Player 0","Basketball","market_matchup");
  matchup.insight = { items:[
    { id:"matchup-0",player:"Player 0",sport:"Basketball",cardTitle:"Card 0",imageUrl:"https://example.com/0.jpg",grade:"PSA 10",currentValue:10,change30d:1,sales30d:20 },
    { id:"matchup-1",player:"Player 1",sport:"Basketball",cardTitle:"Card 1",imageUrl:"https://example.com/1.jpg",grade:"PSA 10",currentValue:11,change30d:2,sales30d:19 },
  ] };
  const stories = [matchup,...Array.from({ length:14 },(_,index) =>
    market(`solo-${index}`,`Player ${index}`,"Basketball",index % 2 ? "grade_gap" : "rookie_watch"),
  )];

  for (let run = 0; run < 25; run += 1) {
    const opening = remixFeedStories(stories).slice(0,10);
    const seen = new Set();
    for (const story of opening) {
      for (const player of storyPlayerKeys(story)) {
        assert.equal(seen.has(player),false,`${player} repeated in the opening sequence`);
        seen.add(player);
      }
    }
  }
});
