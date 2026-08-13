import assert from "node:assert/strict";
import test from "node:test";
import { cardNumberLabel,normalizeCardNumber } from "./card-number.ts";

test("card numbers are normalized without duplicating the number sign",() => {
  assert.equal(normalizeCardNumber(" #23 "),"23");
  assert.equal(normalizeCardNumber("Card #US175"),"US175");
  assert.equal(cardNumberLabel("#BS-SO"),"CARD #BS-SO");
});

test("missing card numbers are omitted",() => {
  assert.equal(cardNumberLabel(""),null);
  assert.equal(cardNumberLabel("N/A"),null);
  assert.equal(cardNumberLabel(undefined),null);
});
