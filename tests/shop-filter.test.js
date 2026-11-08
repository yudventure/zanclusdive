import test from "node:test";
import assert from "node:assert/strict";
import {
  filterItems,
  matchesSearch,
  orderable,
} from "../src/shop/shop-filter.js";

const item = (name, category, price, extra = {}) => ({
  name,
  price,
  left: 10,
  product: {
    name,
    category,
    specification: "",
    description: "",
    availability: "available",
    ...extra,
  },
});
const items = [
  item("SCUBAPRO Crystal VU Dive Mask", "mask", 2900000, {
    specification: "Panoramic vision, tempered glass",
  }),
  item("Open heel fins", "fins", 1250000),
  item("Wetsuit 3 mm", "suit", 1850000, { availability: "unavailable" }),
  item("Dive torch", "light", null),
  { ...item("Fin full foot", "fins", 50000), left: 0 },
];
const names = (list) => list.map((i) => i.name);

test("words are found in the name, summary, description or category", () => {
  assert.ok(matchesSearch(items[0].product, "crystal"));
  assert.ok(matchesSearch(items[0].product, "  tempered   MASK "));
  assert.ok(!matchesSearch(items[0].product, "mask fins"));
  // Without marks and in the category's own name.
  assert.ok(matchesSearch({ name: "Kaca selam", category: "mask" }, "kaca"));
  assert.ok(
    matchesSearch({ name: "Senter" }, "lampu", "Lampu & aksesori"),
    "the category's name counts",
  );
  assert.ok(matchesSearch({ name: "Pélampung" }, "pelampung"));
  assert.ok(matchesSearch(items[1].product, ""));
});

test("category, available only and the order narrow the list", () => {
  assert.deepEqual(names(filterItems(items, { category: "fins" })), [
    "Open heel fins",
    "Fin full foot",
  ]);
  assert.deepEqual(names(filterItems(items, { query: "fin" })), [
    "Open heel fins",
    "Fin full foot",
  ]);
  // Gear marked unavailable or with nothing left is not orderable.
  assert.deepEqual(
    items.map((i) => orderable(i)),
    [true, true, false, true, false],
  );
  assert.deepEqual(names(filterItems(items, { available: true })), [
    "SCUBAPRO Crystal VU Dive Mask",
    "Open heel fins",
    "Dive torch",
  ]);
  // Prices to ask for go last both ways.
  assert.deepEqual(names(filterItems(items, { sort: "priceLow" })), [
    "Fin full foot",
    "Open heel fins",
    "Wetsuit 3 mm",
    "SCUBAPRO Crystal VU Dive Mask",
    "Dive torch",
  ]);
  assert.deepEqual(
    names(filterItems(items, { sort: "priceHigh" })).slice(0, 2),
    ["SCUBAPRO Crystal VU Dive Mask", "Wetsuit 3 mm"],
  );
  assert.equal(
    names(filterItems(items, { sort: "priceHigh" }))[4],
    "Dive torch",
  );
  assert.deepEqual(names(filterItems(items, { sort: "name" })), [
    "Dive torch",
    "Fin full foot",
    "Open heel fins",
    "SCUBAPRO Crystal VU Dive Mask",
    "Wetsuit 3 mm",
  ]);
  // The shop order stays, and the list given is not changed.
  assert.deepEqual(names(filterItems(items)), names(items));
  assert.equal(names(items)[0], "SCUBAPRO Crystal VU Dive Mask");
});
