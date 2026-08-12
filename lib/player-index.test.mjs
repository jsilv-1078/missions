import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPlayerIndexFeature,buildPlayerIndexStory,PLAYER_INDEX_PILOTS,selectFeaturedPlayerIndexes,
} from "./player-index.ts";

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

test("the four original players remain available as curated portrait seeds",() => {
  assert.deepEqual(PLAYER_INDEX_PILOTS.map((pilot) => pilot.player),[
    "Kobe Bryant","Paul Skenes","Willie Mays","Tom Brady",
  ]);
});

function playerStory(player,sport,index = 0) {
  const story = buildPlayerIndexStory({
    player,sport,playerImageUrl:`https://example.com/${player.replaceAll(" ","-")}.png`,buckets:buckets(),
    cards:cards().map((card,cardIndex) => ({
      ...card,id:`${player}-${cardIndex}`,player,sport,change30d:4 + index + cardIndex,
    })),catalogMatches:50,updatedAt:"2026-07-30T12:00:00.000Z",
  });
  assert.ok(story);
  story.insight.averageSaleChange30d = 8 + index;
  story.insight.salesChange30d = 30 + index * 3;
  story.insight.totalValueChange30d = 20 + index * 2;
  story.insight.trackedCardMovement30d = 6 + index;
  story.insight.risingCount = 5;
  story.insight.fallingCount = 1;
  story.insight.flatCount = 0;
  story.insight.scoreBreakdown = { liquidity:80,momentum:75,breadth:80,stability:70,evidence:90 };
  return story;
}

test("the quick-scroll signal avoids unsupported average-sale movement",() => {
  const story = playerStory("Example Player","Football");
  story.insight.averageSaleChange30d = 30;
  story.insight.trackedCardMovement30d = -8;
  story.insight.risingCount = 1;
  story.insight.fallingCount = 5;
  story.insight.salesChange30d = 42;
  const featured = applyPlayerIndexFeature(story);
  assert.notEqual(featured.insight.featureMetric,"average_sale_change");
  assert.ok(["sales_change","market_breadth"].includes(featured.insight.featureMetric));
});

test("daily selection rotates recent players and limits each sport to two",() => {
  const stories = [
    ...["A","B","C","D"].map((name,index) => playerStory(`Basketball ${name}`,"Basketball",index)),
    ...["A","B"].map((name,index) => playerStory(`Baseball ${name}`,"Baseball",index + 1)),
    ...["A","B"].map((name,index) => playerStory(`Football ${name}`,"Football",index + 2)),
    ...["A","B"].map((name,index) => playerStory(`Hockey ${name}`,"Hockey",index + 3)),
  ];
  const recentStory = stories[0];
  const recent = [{
    player:recentStory.player,featuredOn:"2026-07-29T00:00:00.000Z",
    averageSaleChange30d:recentStory.insight.averageSaleChange30d,
    salesChange30d:recentStory.insight.salesChange30d,
    totalValueChange30d:recentStory.insight.totalValueChange30d,score:recentStory.insight.score,
  }];
  const selected = selectFeaturedPlayerIndexes(stories,recent,{ target:8,now:"2026-07-30T12:00:00.000Z" });
  assert.equal(selected.length,8);
  assert.ok(!selected.some((story) => story.player === recentStory.player));
  const counts = selected.reduce((result,story) => ({ ...result,[story.sport]:(result[story.sport] ?? 0) + 1 }),{});
  assert.ok(Object.values(counts).every((count) => count <= 2));
});

test("player index uses exact 30-day transaction totals and prior-period comparisons",() => {
  const story = buildPlayerIndexStory({
    player:"Tom Brady",sport:"Football",playerImageUrl:"https://example.com/tom-brady.png",buckets:buckets(),cards:cards(),catalogMatches:742,
    updatedAt:"2026-07-30T12:00:00.000Z",
  });

  assert.ok(story);
  assert.equal(story.storyKind,"player_index");
  assert.equal(story.imageUrl,"https://example.com/tom-brady.png");
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
    player:"Tom Brady",sport:"Football",playerImageUrl:"https://example.com/tom-brady.png",buckets:buckets().slice(-20),cards:cards(4),catalogMatches:4,
  });
  assert.equal(story,null);
});
