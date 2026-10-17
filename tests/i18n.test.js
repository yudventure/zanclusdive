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
  const details = {
    name: "Alex",
    whatsapp: "+44 7700 900123",
    date: "2030-01-01",
    participants: 2,
  };
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
      { name: "Alex", whatsapp: "+44 7700 900123", days: 1 },
      false,
      "en",
    ),
    /BUY · Mask & snorkel set × 1 · IDR[\s\S]*Estimated total IDR/,
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

test("old hero titles gain Raja Ampat", async () => {
  const { withRajaAmpatTitle } = await import("../src/content-i18n.js");
  const content = structuredClone(defaultContent);
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
  const gear = defaultContent.shop.products;
  assert.deepEqual(validatePriceList(defaultPriceList, gear), defaultPriceList);
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
  const older = structuredClone(defaultContent);
  older.priceList = { diving: [], snorkeling: [], trip: [] };
  const moved = withPriceList(older);
  const migrated = moved.priceList;
  assert.deepEqual(migrated.diving, []);
  // Its rental lists were the defaults, already Dive Shop products: none
  // is copied.
  assert.equal(migrated.rentalBasics, undefined);
  assert.equal(moved.shop.products.length, gear.length);
  assert.equal(gear.find((p) => p.id === "sewa-masker").rentalPrice, 50000);
  assert.equal(defaultContent.en.shop.products["sewa-masker"].name, "Mask");
  assert.equal(defaultPriceList.rentalSets, undefined);
  assert.equal(withPriceList({ priceList: migrated }).priceList, migrated);
  assert.equal(priceText({ id: "Pelampung", en: "" }, "en"), "Pelampung");
  assert.equal(
    priceText({ id: "Pelampung", en: "Life jacket" }, "en"),
    "Life jacket",
  );
});

test("homepage Dive Shop cart totals and WhatsApp checkout", async () => {
  const { addLine, cartTotals, checkoutMessage } =
    await import("../src/shop/cart.js");
  const mask = {
    key: "rent:sewa-masker",
    name: "Masker",
    price: 50000,
    mode: "rental",
  };
  const fins = {
    key: "buy:fins",
    name: "Open heel fins",
    price: 1250000,
    mode: "sale",
  };
  const quote = { key: "buy:tank", name: "Tabung", price: null, mode: "sale" };
  let cart = addLine(addLine(addLine([], mask), mask), fins);
  assert.equal(cart.find((l) => l.key === mask.key).quantity, 2);
  assert.deepEqual(
    { ...cartTotals(cart, 3), hasRental: undefined },
    {
      count: 3,
      sale: 1250000,
      rental: 300000,
      total: 1550000,
      hasRental: undefined,
      needsQuote: false,
    },
  );
  assert.equal(addLine(cart, mask, -2).length, 1);
  assert.equal(addLine([], { ...mask }, 20)[0].quantity, 10);
  cart = addLine(cart, quote);
  assert.equal(cartTotals(cart).needsQuote, true);
  const details = {
    name: "Alex",
    whatsapp: "+62 812 3456 7890",
    email: "alex@example.com",
    startDate: "2030-01-02",
    days: 2,
    notes: "Ukuran L",
  };
  const text = checkoutMessage(cart, details, "2030-01-01", "id");
  assert.match(text, /^Halo Zanclus! Saya Alex/);
  assert.match(text, /SEWA · Masker × 2 · Rp\s?50\.000 \/ hari/);
  assert.match(text, /BELI · Tabung × 1 · Tanya harga/);
  assert.match(text, /Lama sewa 2 hari, mulai 2030-01-02/);
  assert.match(text, /Catatan Ukuran L/);
  assert.match(text, /WhatsApp \+62 812 3456 7890\nEmail alex@example\.com/);
  assert.throws(() =>
    checkoutMessage(cart, { ...details, whatsapp: "" }, "2030-01-01"),
  );
  assert.throws(() =>
    checkoutMessage(cart, { ...details, email: "alex@" }, "2030-01-01"),
  );
  assert.match(
    checkoutMessage(cart, details, "2030-01-01", "en"),
    /RENT · Masker × 2 · IDR\s?50,000 \/ day/,
  );
  assert.throws(() =>
    checkoutMessage(cart, { ...details, name: " " }, "2030-01-01"),
  );
  assert.throws(() =>
    checkoutMessage(
      cart,
      { ...details, startDate: "2029-12-31" },
      "2030-01-01",
    ),
  );
  assert.throws(() =>
    checkoutMessage(cart, { ...details, days: 31 }, "2030-01-01"),
  );
  assert.ok(
    checkoutMessage(
      [fins],
      { name: "Alex", whatsapp: "081234567890" },
      "2030-01-01",
    ),
  );
});

test("dive gallery validates photos and captions", async () => {
  const { validateGallery } = await import("../src/cms-model.js");
  const { defaultGallery, galleryCaption } = await import("../src/gallery.js");
  assert.deepEqual(validateGallery(undefined), defaultGallery);
  assert.deepEqual(validateGallery(defaultGallery), defaultGallery);
  const legacy = structuredClone(defaultContent);
  delete legacy.gallery;
  assert.equal(validateContent(legacy).gallery.items.length, 10);
  assert.throws(() =>
    validateGallery({ items: [{ src: "javascript:alert(1)", caption: {} }] }),
  );
  assert.throws(() =>
    validateGallery({ items: Array(25).fill(defaultGallery.items[0]) }),
  );
  const own = validateGallery({
    items: [
      {
        src: "/api/media/0e7b7d3c-5a2a-4b6e-9a51-3b2a8a1d2f10",
        caption: { id: " Manta di Arborek ", en: "" },
      },
    ],
  });
  assert.equal(own.items[0].caption.id, "Manta di Arborek");
  assert.equal(galleryCaption(own.items[0], "en"), "Manta di Arborek");
});

test("activity calendar validates, sorts events and fills missing parts", async () => {
  const {
    validateCalendar,
    defaultCalendar,
    monthGrid,
    eventsInMonth,
    calendarText,
  } = await import("../src/calendar-model.js");
  assert.deepEqual(validateCalendar(defaultCalendar), defaultCalendar);
  assert.equal(validateCalendar(undefined).seasons.length, 12);
  const partial = validateCalendar({
    events: [
      {
        date: "2027-02-01",
        type: "eco",
        place: "",
        title: { id: "B", en: "" },
        description: {},
      },
      {
        date: "2027-01-05",
        type: "dive",
        place: "Kri",
        title: { id: "A", en: "A en" },
        description: {},
      },
    ],
  });
  assert.deepEqual(
    partial.events.map((e) => e.title.id),
    ["A", "B"],
  );
  assert.deepEqual(partial.spots, defaultCalendar.spots);
  assert.equal(calendarText(partial.events[1].title, "en"), "B");
  assert.throws(() =>
    validateCalendar({
      events: [{ date: "2027-02-30", type: "eco", title: { id: "X" } }],
    }),
  );
  assert.throws(() =>
    validateCalendar({
      events: [{ date: "2027-02-01", type: "party", title: { id: "X" } }],
    }),
  );
  assert.throws(() =>
    validateCalendar({ seasons: defaultCalendar.seasons.slice(1) }),
  );
  // October 2026 starts on a Thursday: three blanks in a Monday-first grid.
  assert.equal(monthGrid(2026, 9).filter((d) => d === null).length, 3);
  assert.equal(monthGrid(2026, 9).length, 3 + 31);
  assert.equal(eventsInMonth(defaultCalendar.events, 2026, 10).length, 2);
  const legacy = structuredClone(defaultContent);
  delete legacy.calendar;
  assert.equal(validateContent(legacy).calendar.eco.length, 5);
});

test("texts the pages rely on are present in both languages", () => {
  for (const locale of ["en", "id"]) {
    const t = messages[locale];
    for (const [path, value] of Object.entries({
      "meta.title": t.meta.title,
      "gallery.eyebrow": t.gallery.eyebrow,
      "diveSites.title": t.diveSites.title,
      "activity.skip": t.activity.skip,
      "activity.sections": t.activity.sections,
      "shop.skip": t.shop.skip,
      "activity.requiredNote": t.activity.requiredNote,
    }))
      assert.ok(typeof value === "string" && value.trim(), `${locale} ${path}`);
  }
});
