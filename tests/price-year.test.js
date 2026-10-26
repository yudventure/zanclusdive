import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultPriceList,
  defaultPriceYear,
  priceYear,
  validatePriceList,
} from "../src/price-list.js";
import { dictionary } from "../src/i18n.js";

test("the price list title carries the year set in the admin", () => {
  assert.equal(defaultPriceYear, 2026);
  // Lists without a year, as saved before it existed, show 2026.
  const older = structuredClone(defaultPriceList);
  assert.equal(older.year, undefined);
  assert.equal(priceYear(older), 2026);
  assert.equal(validatePriceList(older).year, undefined);
  assert.equal(validatePriceList({ ...older, year: "" }).year, undefined);
  assert.equal(validatePriceList({ ...older, year: "2027" }).year, 2027);
  assert.equal(priceYear({ ...older, year: 2027 }), 2027);
  for (const bad of [1999, 2026.5, "dua ribu", 2101])
    assert.throws(
      () => validatePriceList({ ...older, year: bad }),
      /Tahun daftar harga/,
    );
  assert.equal(dictionary("id").prices.kicker(2026), "DAFTAR HARGA 2026");
  assert.equal(dictionary("en").prices.kicker(2026), "PRICE LIST 2026");
});
