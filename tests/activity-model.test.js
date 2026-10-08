import test from "node:test";
import assert from "node:assert/strict";
import {
  activityKeys,
  activityLabels,
  defaultActivities,
  withActivities,
  activityInquiry,
} from "../src/activity-model.js";
import { defaultContent, validateContent } from "../src/cms-model.js";

test("older content gains activity pages without overwriting saved content, prices, or visibility", () => {
  const old = {
    text: { heroTitle1: "Konten pemilik" },
    contact: { email: "owner@example.com" },
    shop: { products: [{ id: "saved-mask" }] },
  };
  const migrated = withActivities(old);
  assert.deepEqual(migrated.text, old.text);
  assert.deepEqual(migrated.contact, old.contact);
  assert.deepEqual(migrated.shop, old.shop);
  assert.deepEqual(Object.keys(migrated.activities), activityKeys);
  assert.ok(
    activityKeys.every((key) => migrated.activities[key].price === null),
  );
  assert.equal(old.activities, undefined);
  migrated.activities.diving.highlights[0] = "Tersimpan";
  migrated.activities.snorkeling.enabled = false;
  const next = withActivities(migrated);
  assert.equal(next.activities.diving.highlights[0], "Tersimpan");
  assert.equal(next.activities.snorkeling.enabled, false);
  assert.notEqual(defaultActivities.diving.highlights[0], "Tersimpan");
});
test("CMS round trips all activity content and rejects malformed pages, prices, images, and oversized lists", () => {
  const content = structuredClone(defaultContent);
  content.activities.snorkeling.title = "Snorkeling keluarga";
  content.activities.snorkeling.price = "450000";
  content.activities.trip.enabled = false;
  content.activities.diving.highlights.push("", " ");
  const valid = validateContent(content);
  assert.equal(valid.activities.snorkeling.price, 450000);
  assert.equal(valid.activities.snorkeling.title, "Snorkeling keluarga");
  assert.equal(valid.activities.trip.enabled, false);
  assert.equal(
    valid.activities.diving.highlights.length,
    defaultActivities.diving.highlights.length,
  );
  assert.deepEqual(valid.activities.diving.faqs, defaultActivities.diving.faqs);
  const mutations = [
    (a) => {
      a.diving.price = -1;
    },
    (a) => {
      a.diving.price = true;
    },
    (a) => {
      a.trip.image = "javascript:alert(1)";
    },
    (a) => {
      a.trip.itinerary = [];
    },
    (a) => {
      a.snorkeling.faqs = Array(7).fill(a.snorkeling.faqs[0]);
    },
    (a) => {
      a.diving.highlights = Array(9).fill("Too many");
    },
    (a) => {
      a.diving.preparations = ["", " "];
    },
    (a) => {
      a.trip.itinerary[0].description = "";
    },
    (a) => {
      delete a.snorkeling;
    },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(defaultContent);
    mutate(invalid.activities);
    assert.throws(() => validateContent(invalid));
  }
});
test("WhatsApp inquiries retain the selected activity and guest details without promising reservations", () => {
  const details = {
    name: "  Tamu Uji  ",
    date: "2028-02-29",
    participants: "4",
    notes: "Butuh rental fins",
  };
  for (const key of activityKeys) {
    const message = activityInquiry(
      key,
      defaultActivities[key],
      details,
      "2028-02-28",
      true,
    );
    assert.ok(message.includes(activityLabels[key]));
    assert.ok(message.includes(defaultActivities[key].title));
    assert.ok(message.includes("Nama: Tamu Uji"));
    assert.ok(message.includes("2028-02-29"));
    assert.ok(message.includes("4 orang"));
    assert.ok(message.includes(details.notes));
    assert.ok(message.includes("belum menjadi reservasi"));
    assert.ok(message.includes("halaman demo"));
  }
  for (const invalid of [
    { name: " " },
    { date: "2028-02-30" },
    { date: "2027-01-01" },
    { participants: 0 },
    { participants: 101 },
    { participants: 1.5 },
    { notes: "x".repeat(1001) },
  ])
    assert.throws(() =>
      activityInquiry(
        "diving",
        defaultActivities.diving,
        { ...details, ...invalid },
        "2028-02-28",
      ),
    );
  assert.throws(() =>
    activityInquiry("unknown", defaultActivities.diving, details, "2028-02-28"),
  );
  assert.throws(() =>
    activityInquiry(
      "trip",
      { ...defaultActivities.trip, enabled: false },
      details,
      "2028-02-28",
    ),
  );
});
