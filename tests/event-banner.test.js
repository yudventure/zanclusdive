import test from "node:test";
import assert from "node:assert/strict";
import {
  activeBanners,
  defaultCalendar,
  eventDates,
  sampleBanner,
  validateCalendar,
} from "../src/calendar-model.js";

test("event banners show only while their event is on", () => {
  // The flyer draft ships switched off.
  assert.equal(defaultCalendar.banners[0].enabled, false);
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
  assert.equal(dates("2030-06-01", "2030-06-08", "en"), "Jun 1 – 8, 2030");
  assert.equal(dates("2030-06-30", "2030-07-02", "id"), "30 Jun – 2 Jul 2030");
  assert.equal(dates("2030-06-01", "", "id"), "1 Jun 2030");
  assert.equal(dates("", "", "id"), "");
});
