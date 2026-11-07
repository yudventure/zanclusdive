import test from "node:test";
import assert from "node:assert/strict";
import { logoBox, validatePartners } from "../src/course-model.js";

test("logos of every shape get boxes that look the same size", () => {
  assert.deepEqual(logoBox(1), { width: 46, height: 46 });
  assert.deepEqual(logoBox(4.33), { width: 111, height: 26 });
  // Very wide word marks stop at 150 px, tall ones at 52 px.
  assert.deepEqual(logoBox(12), { width: 150, height: 19 });
  assert.deepEqual(logoBox(0.3), { width: 16, height: 52 });
  // Unknown shapes are treated as square.
  assert.deepEqual(logoBox(0), logoBox(1));
  assert.deepEqual(logoBox(NaN), logoBox(1));
  // Wider logos are never taller, and never narrower.
  for (let r = 0.5; r < 8; r += 0.25) {
    const a = logoBox(r);
    const b = logoBox(r + 0.25);
    assert.ok(b.height <= a.height && b.width >= a.width, String(r));
  }
});

test("a partner keeps the shape of its uploaded logo", () => {
  const [emblem, mark, none, odd] = validatePartners([
    { name: "CMAS", logo: "/api/media/a.png", logoRatio: 1.0123 },
    { name: "PADI", logo: "/api/media/b.png", logoRatio: "4.3333" },
    { name: "NAUI", logo: "", logoRatio: 3 },
    { name: "SSI", logo: "/api/media/c.png", logoRatio: 99 },
  ]);
  assert.equal(emblem.logoRatio, 1.012);
  assert.equal(mark.logoRatio, 4.333);
  assert.equal(none.logoRatio, 0);
  assert.equal(odd.logoRatio, 0);
});
