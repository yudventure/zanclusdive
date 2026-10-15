import test from "node:test";
import assert from "node:assert/strict";
import {
  activeBanners,
  defaultCalendar,
  eventDates,
  sampleBanner,
  validateCalendar,
  withCalendar,
} from "../src/calendar-model.js";

test("event banners show only while their event is on", () => {
  // The dive trip ships switched on, priced in rupiah per person, with
  // its flyer and a minimum group of 4.
  assert.deepEqual(
    defaultCalendar.banners.map((b) => [
      b.title.id,
      b.enabled,
      b.amount,
      b.minPeople,
      b.image,
    ]),
    [
      [
        "Dive Trip with Zanclus",
        true,
        27500000,
        4,
        "/assets/photos/event-dive-trip.webp",
      ],
    ],
  );
  assert.equal(activeBanners(defaultCalendar, "2030-01-01").length, 1);
  const on = (extra) => ({ ...sampleBanner(), enabled: true, ...extra });
  const calendar = {
    banners: [
      on({
        title: { id: "B", en: "" },
        startDate: "2030-06-10",
        endDate: "2030-06-12",
      }),
      on({
        title: { id: "A", en: "" },
        startDate: "2030-06-01",
        endDate: "2030-06-05",
        showFrom: "2030-05-20",
      }),
      on({ title: { id: "Off", en: "" }, enabled: false }),
      on({ title: { id: "C", en: "" }, startDate: "2030-07-01" }),
    ],
  };
  const titles = (day) => activeBanners(calendar, day).map((b) => b.title.id);
  assert.deepEqual(titles("2030-05-10"), ["B", "C"]);
  assert.deepEqual(titles("2030-05-25"), ["A", "B"]);
  assert.deepEqual(titles("2030-06-06"), ["B", "C"]);
  assert.deepEqual(titles("2030-06-13"), ["C"]);
});

test("banner fields are checked before saving", () => {
  const save = (banner) =>
    validateCalendar({ ...structuredClone(defaultCalendar), banners: [banner] })
      .banners[0];
  const good = save({
    ...sampleBanner(),
    link: "/id/trip",
    startDate: "2030-06-01",
    endDate: "2030-06-08",
  });
  assert.equal(good.link, "/id/trip");
  for (const [change, reason] of [
    [{ link: "javascript:alert(1)" }, /Link tombol/],
    [{ link: "//evil.example" }, /Link tombol/],
    [{ image: "http://example.com/a.png" }, /Foto/],
    [{ background: "javascript:alert(1)" }, /Foto latar/],
    [{ amount: -1 }, /Harga per orang/],
    [{ amount: 1.5 }, /Harga per orang/],
    [{ minPeople: 0 }, /Minimal peserta/],
    [{ minPeople: 31 }, /Minimal peserta/],
    [{ title: { id: "", en: "" } }, /Judul banner/],
    [
      { startDate: "2030-06-08", endDate: "2030-06-01" },
      /sebelum tanggal mulai/,
    ],
    [{ endDate: "2030-02-31" }, /Tanggal selesai/],
  ])
    assert.throws(() => save({ ...sampleBanner(), ...change }), reason);
  // At most four banners.
  assert.throws(
    () =>
      validateCalendar({
        ...structuredClone(defaultCalendar),
        banners: Array.from({ length: 5 }, sampleBanner),
      }),
    /maksimal 4/,
  );
});

test("event dates read naturally", () => {
  // Intl puts thin spaces around the dash.
  const dates = (...args) => eventDates(...args).replace(/\s/g, " ");
  assert.equal(dates("2030-06-01", "2030-06-08", "id"), "1–8 Jun 2030");
  // Ranges are written tight, without spaces round the dash.
  assert.equal(dates("2030-06-01", "2030-06-08", "en"), "Jun 1–8, 2030");
  assert.equal(dates("2030-06-30", "2030-07-02", "id"), "30 Jun–2 Jul 2030");
  assert.equal(dates("2030-06-01", "", "id"), "1 Jun 2030");
  assert.equal(dates("", "", "id"), "");
});

test("saved banners are brought up to date once", () => {
  // The dive trip as it was saved before: a dollar price written as text.
  const old = {
    ...sampleBanner(),
    enabled: false,
    amount: undefined,
    minPeople: undefined,
    price: { id: "$1.680 / pax", en: "$1,680 / pax" },
    note: { id: "Minimal 4 pax", en: "Minimum 4 pax" },
  };
  delete old.amount;
  delete old.minPeople;
  // The two photo banners shipped for a day, untouched.
  const photo = (title, background) => ({
    enabled: true,
    title: { id: title, en: "" },
    background,
    startDate: "",
    endDate: "",
  });
  const saved = {
    calendar: {
      events: [],
      banners: [
        photo(
          "Menyelam pertama di Raja Ampat",
          "/assets/photos/banner-penyu.webp",
        ),
        photo(
          "Jelajahi gua dan dinding karang",
          "/assets/photos/banner-gua.webp",
        ),
        old,
      ],
    },
  };
  const content = withCalendar(saved);
  const [trip, ...rest] = content.calendar.banners;
  assert.deepEqual(rest, []);
  assert.equal(trip.price, undefined);
  assert.deepEqual(
    [trip.enabled, trip.amount, trip.minPeople, trip.note.id],
    [true, 27500000, 4, "Harga spesial"],
  );
  // It validates and, read again, nothing changes.
  validateCalendar(content.calendar);
  assert.equal(withCalendar(content), content);
  // A dive trip the owner dated keeps its dates and switch.
  const dated = withCalendar({
    calendar: {
      events: [],
      banners: [{ ...old, startDate: "2030-06-01", endDate: "2030-06-08" }],
    },
  }).calendar.banners[0];
  assert.deepEqual(
    [dated.enabled, dated.startDate, dated.amount],
    [false, "2030-06-01", 27500000],
  );
  // Banners the owner made, or an emptied list, stay.
  for (const banners of [
    [{ ...sampleBanner(), title: { id: "Promo", en: "" } }],
    [],
  ]) {
    const kept = { calendar: { events: [], banners } };
    assert.equal(withCalendar(kept), kept);
  }
  // A calendar without banners gets the dive trip.
  assert.equal(
    withCalendar({ calendar: { events: [] } }).calendar.banners[0].amount,
    27500000,
  );
});
