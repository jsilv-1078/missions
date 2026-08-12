import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerIndexStory, PLAYER_INDEX_PILOTS } from "./player-index.ts";

function day(offset) {
  const date = new Date(Date.UTC(2026,5,1 + offset));
  return date.toISOString().slice(0,10);
}

function buckets() {
  return Array.from({ length:60 },(_,index) => {
    const current = index >= 30;
    const count = current ? 20 : 10;
    const averageSale = current ? 100 : 90;
    return {
      start:day(index),end:day(index),count,averageSale,totalAmount:count * averageSale,partial:index === 59,
    };
  });
}

function cards(count = 6) {
  return Array.from({ length:count },(_,index) => ({
    id:`card-${index}`,player:"Tom Brady",sport:"Football",cardTitle:`Tom Brady card ${index}`,
    imageUrl:`https://example.com/${index}.jpg`,grade:index % 2 ? "PSA 9" : "PSA 10",
    currentValue:100 + index * 25,change30d:index - 2,sales30d:30 - index,
  }));
}

test("the four requested pilot players remain explicit",() => {
  assert.deepEqual(PLAYER_INDEX_PILOTS.map((pilot) => pilot.player),[
    "Kobe Bryant","Paul Skenes","Willie Mays","Tom Brady",
  ]);
});

test("player index uses exact 30-day transaction totals and prior-period comparisons",() => {
  const story = buildPlayerIndexStory({
    player:"Tom Brady",sport:"Football",buckets:buckets(),cards:cards(),catalogMatches:742,
    updatedAt:"2026-07-30T12:00:00.000Z",
  });

  assert.ok(story);
  assert.equal(story.storyKind,"player_index");
  assert.equal(story.sales30d,600);
  assert.equal(story.insight.totalValue30d,60_000);
  assert.equal(story.insight.averageSale30d,100);
  assert.equal(story.insight.priorTotalSales30d,300);
  assert.equal(story.insight.priorTotalValue30d,27_000);
  assert.equal(Number(story.insight.averageSaleChange30d.toFixed(1)),11.1);
  assert.equal(Number(story.insight.salesChange30d.toFixed(1)),100);
  assert.equal(story.insight.cardsTracked,6);
  assert.equal(story.insight.items.length,3);
  assert.ok(story.insight.score >= 0 && story.insight.score <= 100);
  assert.match(story.headline,/Tom Brady average sale rises 11\.1% across 600 sales/);
});

test("player index suppresses low-evidence players",() => {
  const story = buildPlayerIndexStory({
    player:"Tom Brady",sport:"Football",buckets:buckets().slice(-20),cards:cards(4),catalogMatches:4,
  });
  assert.equal(story,null);
});
