import test from "node:test";
import assert from "node:assert/strict";
import { demoSeed, demoAccount } from "../src/demo-data.js";
import { cmsMode } from "../src/cms-mode.js";
import { validateBooking, validateContent } from "../src/cms-model.js";

test("CMS defaults to demo and requires explicit MySQL mode", () => {
  assert.equal(cmsMode({}), "demo");
  assert.equal(cmsMode({ CMS_MODE: "mysql" }), "mysql");
  assert.throws(() => cmsMode({ CMS_MODE: "mistyped" }));
});

test("demo seeds only labelled examples with valid current dates and editable content", () => {
  const state = demoSeed(new Date("2026-12-31T18:00:00Z"));
  validateContent(state.content);
  assert.equal(state.bookings.length, 3);
  assert.equal(state.bookings[0].startDate, "2027-01-01");
  for (const booking of state.bookings) {
    validateBooking(booking);
    assert.match(booking.guestName, /Demo/);
    assert.equal(booking.phone, "");
  }
  assert.equal(state.media.length, 0);
  assert.ok(demoAccount.password.length >= 12);
});
