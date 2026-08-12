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
