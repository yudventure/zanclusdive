import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultActivities,
  legacyActivityDefaults,
} from "../src/activity-model.js";
import { defaultContent } from "../src/cms-model.js";
import { withShop, demoShop } from "../src/shop-model.js";
import {
  withActivityRefresh,
  withTranslations,
  localizeContent,
} from "../src/content-i18n.js";

test("each activity page has its own facts", () => {
  const values = Object.values(defaultActivities);
  assert.equal(new Set(values.map((a) => a.duration)).size, 3);
  assert.equal(new Set(values.map((a) => a.meetingPoint)).size, 3);
});

test("shared legacy facts are refreshed, owner edits are kept", () => {
  const old = structuredClone(defaultActivities);
  for (const a of Object.values(old)) {
    a.duration = legacyActivityDefaults.duration;
    a.meetingPoint = legacyActivityDefaults.meetingPoint;
  }
  old.diving.itinerary = legacyActivityDefaults.divingItineraryTitles.map(
    (title) => ({ title, description: "lama" }),
  );
  old.trip.meetingPoint = "Dermaga milik owner";
  const content = withTranslations({
    ...withShop(structuredClone(defaultContent), demoShop()),
    activities: old,
  });
  content.en.activities.snorkeling.duration = "Tailored to your activity plan";
  const fresh = withActivityRefresh(content);
  assert.equal(
    fresh.activities.diving.duration,
    "Setengah hari · 2 penyelaman",
  );
  assert.equal(
    fresh.activities.snorkeling.meetingPoint,
    "Pantai atau dermaga Waisai",
  );
  assert.equal(fresh.activities.trip.meetingPoint, "Dermaga milik owner");
  assert.equal(
    fresh.activities.diving.itinerary[0].title,
    "Briefing di dive center",
  );
  assert.equal(fresh.en.activities.snorkeling.duration, "2 to 4 hours");
  assert.equal(
    localizeContent(fresh, "en").activities.diving.itinerary[2].title,
    "Two dives",
  );
});
