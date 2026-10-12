import test from "node:test";
import assert from "node:assert/strict";
import { demoSeed, demoAccount, withoutSamples } from "../src/demo-data.js";
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
  assert.doesNotMatch(
    JSON.stringify(state.content),
    /contoh demo|demo sample/i,
  );
});

test("a live site starts without sample bookings and old sample labels are removed", () => {
  const live = demoSeed(new Date("2026-12-31T18:00:00Z"), {
    sampleBookings: false,
  });
  assert.equal(live.bookings.length, 0);
  const old = demoSeed(new Date("2026-12-31T18:00:00Z"));
  old.content.experiences.beginner.duration = "Setengah hari · contoh demo";
  old.content.contact.location =
    "Raja Ampat, Papua Barat Daya — lokasi contoh demo";
  old.content.en.experiences.beginner.duration = "Half day · demo sample";
  old.bookings.push({
    ...old.bookings[0],
    id: "11111111-1111-4111-8111-111111111111",
    guestName: "Tamu Asli",
  });
  const clean = withoutSamples(old);
  assert.equal(clean.content.experiences.beginner.duration, "Setengah hari");
  assert.equal(clean.content.contact.location, "Raja Ampat, Papua Barat Daya");
  assert.equal(clean.content.en.experiences.beginner.duration, "Half day");
  assert.deepEqual(
    clean.bookings.map((b) => b.guestName),
    ["Tamu Asli"],
  );
});
