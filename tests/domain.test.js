import test from "node:test";
import assert from "node:assert/strict";
import {
  monthCells,
  dateKey,
  recommendation,
  planSummary,
} from "../src/domain.js";
test("calendar uses Monday first and includes leap day", () => {
  const cells = monthCells(2028, 1);
  assert.equal(cells[0], null);
  assert.equal(cells[1], 1);
  assert.equal(cells.at(-1), 29);
  assert.equal(cells.filter(Boolean).length, 29);
});
test("calendar has no empty days when month begins Monday", () => {
  assert.equal(monthCells(2026, 5)[0], 1);
  assert.equal(monthCells(2026, 5).at(-1), 30);
});
test("date keys support safe chronological comparison", () => {
  assert.equal(dateKey(2027, 0, 3), "2027-01-03");
  assert.ok(dateKey(2027, 0, 3) > dateKey(2026, 11, 31));
});
test("quiz respects beginners before special interests", () => {
  assert.equal(recommendation("new", "creative"), "beginner");
  assert.equal(recommendation("experienced", "creative"), "specialty");
  assert.equal(recommendation("experienced", "nature"), "explorer");
});
test("plan summary includes chosen experience and participant details", () => {
  const text = planSummary({
    name: "Ayu",
    date: "2027-01-03",
    people: "2",
    experience: "explorer",
    notes: "First trip",
  });
  assert.match(text, /Ayu/);
  assert.match(text, /Peserta: 2/);
  assert.match(text, /Jelajah laut/);
  assert.match(text, /First trip/);
});
