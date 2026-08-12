import assert from "node:assert/strict";
import test from "node:test";
import { marketHeadline } from "./market-headlines.ts";

test("vintage headlines use plain card language instead of issue jargon",() => {
  for (let variant = 0; variant < 6; variant += 1) {
    const headline = marketHeadline({
      cardId:"vintage-card",
      player:"Mickey Mantle",
      storyKind:"vintage_mover",
      change30d:4.2,
      sales30d:12,
      cardYear:1959,
      variant,
    });
    assert.doesNotMatch(headline,/\bissue\b/i);
  }
});

test("stale high-volume data does not claim a flat or directional price",() => {
  for (let variant = 0; variant < 4; variant += 1) {
    const headline = marketHeadline({
      cardId:"elway-card",
      player:"John Elway",
      storyKind:"high_sales_30d",
      change30d:0,
      sales30d:309,
      freshnessDays:30,
      variant,
    });
    assert.match(headline,/309/);
    assert.match(headline,/(across grades|card-wide|all-grade|30 days)/i);
    assert.doesNotMatch(headline,/flat|unchanged|holds|rises|falls|gains|drops|climbs|slips/i);
  }
});

test("stale directional stories fall back to card activity",() => {
  for (const storyKind of ["biggest_gain","biggest_loss","vintage_mover"]) {
    const headline = marketHeadline({
      cardId:"stale-card",
      player:"Sample Player",
      storyKind,
      change30d:12.5,
      sales30d:18,
      cardYear:1972,
      freshnessDays:14,
    });
    assert.match(headline,/18/);
    assert.doesNotMatch(headline,/12\.5|move|gain|loss|climb|rise|fall|drop|slip|higher|lower/i);
  }
});
