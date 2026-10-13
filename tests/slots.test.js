import test from "node:test";
import assert from "node:assert/strict";
import {
  assertBookable,
  bookingErrorMessage,
  capacityOf,
  placesUsed,
  slotCalendar,
} from "../src/booking-model.js";
import { defaultContent, validateContent } from "../src/cms-model.js";

const content = structuredClone(defaultContent);
const booking = (experience, startDate, participants, extra = {}) => ({
  experience,
  status: "confirmed",
  startDate,
  endDate: startDate,
  participants,
  ...extra,
});

test("diving takes 30 people a day across its programs", () => {
  assert.equal(capacityOf(content, "diving"), 30);
  assert.equal(capacityOf(content, "snorkeling"), 0);
  const bookings = [
    booking("diving", "2030-01-10", 10),
    booking("beginner", "2030-01-10", 4),
    booking("course", "2030-01-10", 2),
    // Waiting for online payment: holds places.
    booking("diving", "2030-01-10", 3, {
      status: "pending",
      payment: { status: "pending" },
    }),
    // A request without payment, a failed payment and a cancellation do not.
    booking("diving", "2030-01-10", 5, { status: "pending" }),
    booking("diving", "2030-01-10", 5, {
      status: "pending",
      payment: { status: "failed" },
    }),
    booking("diving", "2030-01-10", 5, { status: "cancelled" }),
    booking("snorkeling", "2030-01-10", 9),
    booking("diving", "2030-01-09", 1, { endDate: "2030-01-11" }),
  ];
  assert.deepEqual(placesUsed(bookings, "diving", "2030-01-09", "2030-01-11"), {
    "2030-01-09": 1,
    "2030-01-10": 20,
    "2030-01-11": 1,
  });
  const calendar = slotCalendar(
    content,
    [
      ...bookings,
      booking("diving", "2030-01-12", 1, {
        status: "closed",
        endDate: "2030-01-13",
      }),
    ],
    "diving",
    { today: "2030-01-10", last: "2030-12-31" },
  );
  assert.equal(calendar.capacity, 30);
  assert.equal(calendar.used["2030-01-10"], 20);
  assert.equal(calendar.used["2030-01-09"], undefined);
  assert.deepEqual(calendar.closed, [["2030-01-12", "2030-01-13"]]);
  assert.ok(!JSON.stringify(calendar).includes("guest"));

  // 10 places left: 10 fit, 11 do not; a full day takes nobody.
  const ok = booking("diving", "2030-01-10", 10, { status: "pending" });
  assert.doesNotThrow(() => assertBookable(content, bookings, ok));
  assert.throws(
    () => assertBookable(content, bookings, { ...ok, participants: 11 }),
    /Slot tanggal ini tinggal 10 orang/,
  );
  assert.throws(
    () =>
      assertBookable(
        content,
        [...bookings, booking("diving", "2030-01-10", 10)],
        {
          ...ok,
          participants: 1,
        },
      ),
    /sudah penuh/,
  );
  // Courses use the diving places; snorkeling has no limit by default.
  assert.throws(
    () =>
      assertBookable(content, bookings, {
        ...ok,
        experience: "course",
        participants: 11,
      }),
    /tinggal 10 orang/,
  );
  assert.doesNotThrow(() =>
    assertBookable(content, bookings, {
      ...ok,
      experience: "snorkeling",
      participants: 99,
    }),
  );
  assert.equal(
    bookingErrorMessage(
      "Slot tanggal ini tinggal 1 orang. Kurangi peserta atau pilih tanggal lain.",
      "en",
    ),
    "Only 1 place is left on this date. Choose fewer participants or another date.",
  );
});

test("the owner sets the daily places in the CMS", () => {
  const edited = structuredClone(defaultContent);
  edited.activities.snorkeling.capacity = 12;
  delete edited.activities.diving.capacity;
  const saved = validateContent(edited);
  assert.equal(saved.activities.snorkeling.capacity, 12);
  assert.equal(saved.activities.diving.capacity, 30);
  edited.activities.trip.capacity = -1;
  assert.throws(() => validateContent(edited), /Kuota peserta per hari/);
});
