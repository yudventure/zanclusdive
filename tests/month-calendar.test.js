import test from "node:test";
import assert from "node:assert/strict";
import { monthDays } from "../src/month-grid.js";

test("a month grid starts on the Monday before the 1st and fills whole weeks", () => {
  // October 2026 starts on a Thursday and ends on a Saturday.
  const days = monthDays("2026-10");
  assert.equal(days[0], "2026-09-28");
  assert.equal(days[3], "2026-10-01");
  assert.equal(days.at(-1), "2026-11-01");
  assert.equal(days.length, 35);
  // February 2027 starts on a Monday: four whole weeks.
  assert.deepEqual(
    [monthDays("2027-02")[0], monthDays("2027-02").length],
    ["2027-02-01", 28],
  );
  // A month spanning six weeks.
  assert.equal(monthDays("2026-08").length, 42);
  assert.equal(monthDays("2026-08")[0], "2026-07-27");
});
