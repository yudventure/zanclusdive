import test from "node:test";
import assert from "node:assert/strict";
import {
  readSchedule,
  readScheduleLine,
  scheduleDates,
} from "../src/schedule-paste.js";
import { validateBooking } from "../src/cms-model.js";

const today = "2026-10-18";
// The owner's schedule, as written on WhatsApp.
const pasted = `29 Okt sd 01 Nov (12 Divers)
15-19 Nov (2 Divers)
30 nov - 05 des (2 Divers)
21 sd 25 Nov (13 Divers)
27 Des sd 01 Des (2 Divers)`;

test("the owner's schedule is read into five reservations", () => {
  const rows = readSchedule(pasted, today);
  assert.deepEqual(
    rows.map((r) => [r.startDate, r.endDate, r.participants, r.experience]),
    [
      ["2026-10-29", "2026-11-01", 12, "diving"],
      ["2026-11-15", "2026-11-19", 2, "diving"],
      ["2026-11-30", "2026-12-05", 2, "diving"],
      ["2026-11-21", "2026-11-25", 13, "diving"],
      ["2026-12-27", "2027-01-01", 2, "diving"],
    ],
  );
  assert.deepEqual(
    rows.map((r) => r.guestName),
    [
      "Grup 12 penyelam",
      "Grup 2 penyelam",
      "Grup 2 penyelam",
      "Grup 13 penyelam",
      "Grup 2 penyelam",
    ],
  );
  // An end before the start is read as the next month, and said so.
  assert.equal(rows.filter((r) => r.warning).length, 1);
  assert.match(rows[4].warning, /dibaca sampai 1 Jan 2027/);
  assert.doesNotMatch(rows[4].warning, /[:;—]/);
  assert.equal(
    scheduleDates(rows[0].startDate, rows[0].endDate),
    "29 Okt 2026 sampai 1 Nov 2026, 4 hari",
  );
  // Each one is a reservation the calendar accepts.
  for (const row of rows)
    validateBooking({
      experience: row.experience,
      status: "confirmed",
      source: "whatsapp",
      startDate: row.startDate,
      endDate: row.endDate,
      guestName: row.guestName,
      participants: row.participants,
      amount: 0,
    });
});

test("other ways of writing a trip", () => {
  const read = (line) => readScheduleLine(line, today);
  const pick = (r) => [r.startDate, r.endDate, r.participants, r.guestName];
  assert.deepEqual(pick(read("3 Nov s/d 5 Nov 2026 4 pax Keluarga Budi")), [
    "2026-11-03",
    "2026-11-05",
    4,
    "Keluarga Budi",
  ]);
  assert.deepEqual(pick(read("- 30 Des sampai 3 Jan, 6 orang")), [
    "2026-12-30",
    "2027-01-03",
    6,
    "Grup 6 tamu",
  ]);
  assert.deepEqual(pick(read("1. 12 November (5 divers) PT Laut")), [
    "2026-11-12",
    "2026-11-12",
    5,
    "PT Laut",
  ]);
  assert.deepEqual(pick(read("7 Oct to 9 Oct 2027")), [
    "2027-10-07",
    "2027-10-09",
    1,
    "Grup 1 penyelam",
  ]);
  // A date more than a month gone is next year's, a recent one is not.
  assert.equal(read("10 Jan (2 divers)").startDate, "2027-01-10");
  assert.equal(read("10 Okt (2 divers)").startDate, "2026-10-10");
  assert.equal(read("2-4 Agu snorkeling 8 orang").experience, "snorkeling");
  assert.equal(read("5 Nov trip pulau 10 orang").experience, "trip");
  // Lines that cannot be read say why, and blank lines are skipped.
  assert.equal(read("Besok ada 12 divers").error, "Tanggal belum terbaca.");
  assert.equal(
    read("31 Nop sd 2 Des").error,
    "Tanggal itu tidak ada di kalender.",
  );
  assert.equal(read("5 Foo sd 7 Bar").error, "Bulan belum terbaca.");
  assert.equal(
    read("5 Nov (200 divers)").error,
    "Jumlah peserta harus 1 sampai 100.",
  );
  assert.equal(read("   "), null);
  assert.equal(readSchedule("\n\n15-19 Nov\n\n", today).length, 1);
});
