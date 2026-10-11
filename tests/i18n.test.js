import test from "node:test";
import assert from "node:assert/strict";
import { localeHref, messages, formatIDR } from "../src/i18n.js";
import {
  localizeContent,
  applyEnglishEdit,
  withTranslations,
  englishDefaults,
} from "../src/content-i18n.js";
import { defaultContent, validateContent } from "../src/cms-model.js";
import { demoShop } from "../src/shop-model.js";
import { activityInquiry } from "../src/activity-model.js";
import { orderMessage } from "../src/shop-model.js";
import { bookingErrorMessage } from "../src/booking-model.js";

test("Indonesian links gain the /id prefix; English links stay at the root", () => {
  assert.equal(localeHref("en", "/dive-shop"), "/dive-shop");
  assert.equal(localeHref("id", "/"), "/id");
  assert.equal(localeHref("id", "/#contact"), "/id#contact");
  assert.equal(
    localeHref("id", "/dive-shop?mode=rental#catalog"),
    "/id/dive-shop?mode=rental#catalog",
  );
  assert.equal(localeHref("id", "https://wa.me/1"), "https://wa.me/1");
});

test("both dictionaries define the same message keys", () => {
  const keys = (object, prefix = "") =>
    Object.entries(object).flatMap(([key, value]) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? keys(value, prefix + key + ".")
        : [prefix + key],
    );
  assert.deepEqual(keys(messages.en).sort(), keys(messages.id).sort());
  assert.match(formatIDR(650000, "en"), /IDR\s?650,000/);
});

test("English content overlays Indonesian copy and falls back when empty", () => {
  const content = structuredClone(defaultContent);
  content.shop = demoShop();
  const en = localizeContent(content, "en");
  assert.equal(en.text.heroTitle1, "Beneath the waters of Raja Ampat,");
  assert.equal(en.activities.trip.title, englishDefaults.activities.trip.title);
  assert.equal(en.shop.products[0].name, "Mask & snorkel set");
  assert.equal(
    en.shop.products[0].salePrice,
    content.shop.products[0].salePrice,
  );
  assert.equal(
    localizeContent(content, "id").text.heroTitle1,
    "Di bawah laut Raja Ampat,",
  );
  content.en.text.heroTitle1 = "";
  assert.equal(
    localizeContent(content, "en").text.heroTitle1,
    "Di bawah laut Raja Ampat,",
  );
});

test("English admin edits keep shared prices and visibility on the base content", () => {
  const content = structuredClone(defaultContent);
  const view = localizeContent(content, "en");
  const edited = applyEnglishEdit(content, "activities", "diving", {
    ...view.activities.diving,
    title: "Dive with us.",
    price: 750000,
    enabled: false,
  });
  assert.equal(edited.en.activities.diving.title, "Dive with us.");
  assert.equal(edited.activities.diving.title, content.activities.diving.title);
  assert.equal(edited.activities.diving.price, 750000);
  assert.equal(edited.activities.diving.enabled, false);
  const saved = validateContent(edited);
  assert.equal(saved.en.activities.diving.title, "Dive with us.");
});

test("documents saved before translations still render English defaults", () => {
  const legacy = structuredClone(defaultContent);
  delete legacy.en;
  assert.equal(
    withTranslations(legacy).en.text.heroButton,
    "Start your adventure",
  );
  assert.equal(
    validateContent(legacy).en.text.heroButton,
    "Start your adventure",
  );
});

test("WhatsApp messages and booking errors follow the visitor's language", () => {
  const activity = defaultContent.activities.snorkeling;
  const details = { name: "Alex", date: "2030-01-01", participants: 2 };
  assert.match(
    activityInquiry("snorkeling", activity, details, "2029-12-31", false, "en"),
    /^Hi Zanclus! I'd like to ask about Snorkeling\./,
  );
  assert.match(
    activityInquiry("snorkeling", activity, details, "2029-12-31"),
    /^Halo Zanclus!/,
  );
  const products = demoShop().products;
  assert.match(
    orderMessage(
      products,
      [{ id: "demo-mask", mode: "sale", quantity: 1 }],
      { name: "Alex", days: 1 },
      false,
      "en",
    ),
    /BUY · Mask & snorkel set × 1 — IDR/,
  );
  assert.equal(
    bookingErrorMessage("Jumlah peserta harus 1–30 orang.", "en"),
    "Participants must be between 1 and 30.",
  );
  assert.equal(
    bookingErrorMessage("Jumlah peserta harus 1–30 orang.", "id"),
    "Jumlah peserta harus 1–30 orang.",
  );
});

test("hero video accepts YouTube links only and old titles gain Raja Ampat", async () => {
  const { youtubeId } = await import("../src/video.js");
  const { withRajaAmpatTitle } = await import("../src/content-i18n.js");
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
  ])
    assert.equal(youtubeId(url), "dQw4w9WgXcQ");
  for (const url of [
    "http://youtu.be/dQw4w9WgXcQ",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
  ])
    assert.equal(youtubeId(url), null);
  const content = structuredClone(defaultContent);
  content.heroVideo = "https://example.com/video";
  assert.throws(() => validateContent(content));
  content.heroVideo = "https://youtu.be/dQw4w9WgXcQ";
  assert.equal(validateContent(content).heroVideo, content.heroVideo);
  content.text.heroTitle1 = "Di bawah laut,";
  content.en.text.heroTitle1 = "Beneath the sea,";
  const titled = withRajaAmpatTitle(content);
  assert.equal(titled.text.heroTitle1, "Di bawah laut Raja Ampat,");
  assert.equal(titled.en.text.heroTitle1, "Beneath the waters of Raja Ampat,");
  content.text.heroTitle1 = "Judul pemilik";
  assert.equal(withRajaAmpatTitle(content).text.heroTitle1, "Judul pemilik");
});

test("MET Norway forecasts become live hero weather readings", async () => {
  const { parseForecast, weatherCondition, weatherLocations } =
    await import("../src/weather.js");
  const sample = {
    properties: {
      timeseries: [
        {
          time: "2026-10-11T05:00:00Z",
          data: {
            instant: { details: { air_temperature: 29.4, wind_speed: 3.4 } },
            next_1_hours: { summary: { symbol_code: "lightrainshowers_day" } },
          },
        },
      ],
    },
  };
  assert.deepEqual(parseForecast(sample), {
    temperature: 29,
    wind: 12,
    condition: "showers",
    time: "2026-10-11T05:00:00Z",
  });
  assert.equal(parseForecast({}), null);
  assert.equal(weatherCondition("clearsky_night"), "night");
  assert.equal(weatherCondition("partlycloudy_day"), "partly");
  assert.equal(weatherCondition("heavyrainandthunder"), "storm");
  assert.equal(weatherCondition("rain"), "rain");
  for (const { lat, lon } of weatherLocations)
    for (const value of [lat, lon])
      assert.ok((String(value).split(".")[1] || "").length <= 4);
  for (const locale of ["en", "id"])
    for (const { key } of weatherLocations)
      assert.ok(messages[locale].weather.places[key]);
});

test("package price list validates, migrates and keeps both languages", async () => {
  const { defaultPriceList, validatePriceList, withPriceList, priceText } =
    await import("../src/price-list.js");
  assert.deepEqual(validatePriceList(defaultPriceList), defaultPriceList);
  assert.equal(defaultPriceList.diving[0].price, 1200000);
  const legacy = structuredClone(defaultContent);
  delete legacy.priceList;
  assert.deepEqual(withPriceList(legacy).priceList, defaultPriceList);
  assert.deepEqual(validateContent(legacy).priceList, defaultPriceList);
  const broken = structuredClone(defaultPriceList);
  broken.trip[0].price = -5;
  assert.throws(() => validatePriceList(broken));
  broken.trip[0].price = 1;
  broken.trip[0].name.id = "";
  assert.throws(() => validatePriceList(broken));
  broken.trip = Array(9).fill(defaultPriceList.diving[0]);
  assert.throws(() => validatePriceList(broken));
  assert.equal(priceText({ id: "Pelampung", en: "" }, "en"), "Pelampung");
  assert.equal(
    priceText({ id: "Pelampung", en: "Life jacket" }, "en"),
    "Life jacket",
  );
});
