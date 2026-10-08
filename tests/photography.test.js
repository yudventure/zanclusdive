import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  withPhotography,
  defaultSiteImages,
  activityPhotos,
  photoSrcSet,
} from "../src/photography.js";
import { defaultContent, validateContent } from "../src/cms-model.js";
import { withActivities } from "../src/activity-model.js";

test("legacy bundled photographs upgrade once and retain owner data", () => {
  const old = structuredClone(defaultContent);
  delete old.photographyVersion;
  old.images = {
    hero: "/assets/hero.webp",
    reef: "/assets/reef.webp",
    ocean: "/assets/ocean.webp",
  };
  for (const [key, image] of Object.entries({
    diving: "/assets/hero.webp",
    snorkeling: "/assets/reef.webp",
    trip: "/assets/ocean.webp",
  })) {
    old.activities[key].image = image;
    delete old.activities[key].cardImage;
    delete old.activities[key].cardImageAlt;
  }
  old.activities.trip.price = 123456;
  old.activities.trip.enabled = false;
  old.activities.diving.imageAlt = "Caption milik pemilik";
  const upgraded = withActivities(withPhotography(old));
  assert.equal(upgraded.images.ocean, defaultSiteImages.ocean);
  assert.equal(upgraded.activities.trip.image, activityPhotos.trip.image);
  assert.equal(
    upgraded.activities.trip.cardImage,
    activityPhotos.trip.cardImage,
  );
  assert.equal(upgraded.activities.trip.price, 123456);
  assert.equal(upgraded.activities.trip.enabled, false);
  assert.equal(upgraded.activities.diving.imageAlt, "Caption milik pemilik");
  assert.deepEqual(upgraded.text, old.text);
  assert.deepEqual(upgraded.contact, old.contact);
  assert.deepEqual(upgraded.shop, old.shop);
  assert.equal(old.images.ocean, "/assets/ocean.webp");
  upgraded.activities.trip.image = "/assets/ocean.webp";
  assert.equal(
    withPhotography(upgraded).activities.trip.image,
    "/assets/ocean.webp",
  );
});
test("saved custom photos survive migration and every editable image survives CMS validation", () => {
  const old = structuredClone(defaultContent);
  delete old.photographyVersion;
  old.images.hero = "https://example.com/owner.jpg";
  old.images.ocean = "/api/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  old.activities.snorkeling.image = "https://example.com/snorkel.jpg";
  old.activities.snorkeling.imageAlt = "Foto pemilik";
  delete old.activities.snorkeling.cardImage;
  delete old.activities.snorkeling.cardImageAlt;
  const saved = validateContent(withActivities(withPhotography(old)));
  assert.equal(saved.images.hero, old.images.hero);
  assert.equal(saved.images.ocean, old.images.ocean);
  assert.equal(
    saved.activities.snorkeling.cardImage,
    old.activities.snorkeling.image,
  );
  assert.equal(saved.activities.snorkeling.cardImageAlt, "Foto pemilik");
  assert.deepEqual(validateContent(saved), saved);
  for (const section of ["images", "cardImage"]) {
    const invalid = structuredClone(saved);
    if (section === "images")
      invalid.images.galleryIsland = "javascript:alert(1)";
    else invalid.activities.trip.cardImage = "http://example.com/unsafe.jpg";
    assert.throws(() => validateContent(invalid));
  }
  assert.equal(photoSrcSet(saved.images.ocean), undefined);
});
test("bundled placements have distinct image bytes and responsive assets exist", async () => {
  const urls = [
    ...Object.values(defaultSiteImages),
    ...Object.values(activityPhotos).flatMap((photo) => [
      photo.image,
      photo.cardImage,
    ]),
  ];
  assert.equal(new Set(urls).size, urls.length);
  const hashes = [];
  for (const url of urls) {
    const bytes = await readFile(new URL("../public" + url, import.meta.url));
    hashes.push(createHash("sha256").update(bytes).digest("hex"));
    if (photoSrcSet(url))
      await readFile(
        new URL(
          "../public" + url.replace(".webp", "-small.webp"),
          import.meta.url,
        ),
      );
  }
  assert.equal(new Set(hashes).size, hashes.length);
});
