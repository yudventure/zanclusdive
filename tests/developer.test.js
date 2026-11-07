import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDeveloper,
  visitorLocks,
  pageLocked,
  sectionLocked,
  itemLocked,
  pageForPath,
  retryAfter,
  lockCount,
  defaultDeveloper,
} from "../src/developer.js";
import { defaultContent, validateContent } from "../src/cms-model.js";

test("developer settings are optional, checked and tidied", () => {
  assert.deepEqual(validateDeveloper(undefined), defaultDeveloper);
  const saved = validateDeveloper({
    enabled: true,
    site: false,
    pages: ["dive-shop", "dive-shop", "about"],
    sections: ["videos"],
    items: ["product:demo-mask", "service:bcd"],
    message: { id: " Sedang diperbarui ", en: "" },
    until: "2026-10-14T10:00",
  });
  assert.deepEqual(saved.pages, ["dive-shop", "about"]);
  assert.equal(saved.message.id, "Sedang diperbarui");
  for (const bad of [
    { pages: ["admin"] },
    { sections: ["hero"] },
    { items: ["booking:1"] },
    { until: "besok" },
    { message: { id: "x".repeat(401) } },
  ])
    assert.throws(() => validateDeveloper(bad), JSON.stringify(bad));
  const content = validateContent(structuredClone(defaultContent));
  assert.equal(content.developer.enabled, false);
});

test("locks apply to visitors only while developer mode is on", () => {
  const developer = {
    ...defaultDeveloper,
    enabled: true,
    pages: ["about"],
    sections: ["ocean"],
    items: ["product:fins"],
  };
  const visitor = visitorLocks(developer);
  assert.ok(pageLocked(visitor, "about"));
  assert.ok(!pageLocked(visitor, "home"));
  assert.ok(sectionLocked(visitor, "ocean"));
  assert.ok(itemLocked(visitor, "product", "fins"));
  assert.ok(!itemLocked(visitor, "service", "fins"));
  const admin = visitorLocks(developer, true);
  assert.ok(!pageLocked(admin, "about") && !sectionLocked(admin, "ocean"));
  const off = visitorLocks({ ...developer, enabled: false });
  assert.ok(!pageLocked(off, "about") && !itemLocked(off, "product", "fins"));
  const site = visitorLocks({ ...developer, site: true });
  assert.ok(pageLocked(site, "home") && pageLocked(site, "trip"));
  assert.equal(lockCount(developer), 3);
  assert.equal(lockCount({ ...developer, site: true }), 1);
  assert.equal(lockCount({ ...developer, enabled: false }), 0);
});

test("paths map to lockable pages and Retry-After stays sensible", () => {
  assert.equal(pageForPath("/"), "home");
  assert.equal(pageForPath("/dive-shop/"), "dive-shop");
  assert.equal(pageForPath("/calendar"), "diving");
  assert.equal(pageForPath("/admin"), null);
  const now = Date.parse("2026-10-14T08:00:00+09:00");
  assert.equal(retryAfter("", now), 3600);
  assert.equal(retryAfter("2026-10-14T09:00", now), 3600);
  assert.equal(retryAfter("2026-10-14T08:01", now), 300);
  assert.equal(retryAfter("2026-10-20T08:00", now), 86400);
});
