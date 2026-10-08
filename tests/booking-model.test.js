import test from "node:test";
import assert from "node:assert/strict";
import { defaultContent } from "../src/cms-model.js";
import {
  bookingDates,
  validateBookingRequest,
  assertBookable,
  calendarAvailability,
  bookingReceipt,
} from "../src/booking-model.js";

const now = new Date("2026-10-08T18:00:00Z");
const request = {
  requestId: "240da9b1-c17d-4226-a7a7-a6e435172afa",
  name: "  Ayu  ",
  phone: "+62 851 9084 9237",
  date: "2026-10-09",
  people: "2",
  experience: "beginner",
  notes: "Pemula",
};
test("booking dates use WIT across midnight and overseas client timezones", () => {
  assert.deepEqual(bookingDates(now), {
    today: "2026-10-09",
    last: "2027-10-09",
  });
  assert.equal(
    bookingDates(new Date("2028-02-28T18:00:00Z")).today,
    "2028-02-29",
  );
});
test("public booking always starts pending on the website, without trusting prices or status", () => {
  const { booking } = validateBookingRequest(
    { ...request, status: "confirmed", source: "agent", amount: 999999 },
    now,
  );
  assert.equal(booking.guestName, "Ayu");
  assert.equal(booking.status, "pending");
  assert.equal(booking.source, "website");
  assert.equal(booking.amount, 0);
  assert.equal(booking.startDate, booking.endDate);
  assert.equal(booking.participants, 2);
});
test("public validation rejects past, impossible, distant dates and unusable participant contact", () => {
  for (const patch of [
    { date: "2026-10-08" },
    { date: "2026-02-31" },
    { date: "2027-10-10" },
    { name: " " },
    { phone: " " },
    { phone: "123-----" },
    { people: "0" },
    { people: "31" },
    { people: "1.5" },
    { experience: "forged" },
    { requestId: "__proto__" },
    { notes: "a".repeat(1001) },
    { website: "bot" },
  ])
    assert.throws(() => validateBookingRequest({ ...request, ...patch }, now));
});
test("only admin closures block the selected program; pending requests do not imply full capacity", () => {
  const booking = validateBookingRequest(request, now).booking;
  const closed = {
    ...booking,
    status: "closed",
    startDate: "2026-10-09",
    endDate: "2026-10-11",
  };
  assert.throws(
    () => assertBookable(defaultContent, [closed], booking),
    (e) => e.status === 409,
  );
  assert.doesNotThrow(() =>
    assertBookable(
      defaultContent,
      [{ ...closed, experience: "explorer" }, booking],
      booking,
    ),
  );
  assert.doesNotThrow(() =>
    assertBookable(defaultContent, [closed], {
      ...booking,
      startDate: "2026-10-12",
    }),
  );
  const content = structuredClone(defaultContent);
  content.experiences.beginner.enabled = false;
  assert.throws(
    () => assertBookable(content, [], booking),
    (e) => e.status === 409,
  );
});
test("calendar and public receipts disclose dates and references without guest or contact data", () => {
  const booking = {
    ...validateBookingRequest(request, now).booking,
    id: request.requestId,
  };
  const result = calendarAvailability(
    defaultContent,
    [booking, { ...booking, status: "closed" }],
    "beginner",
    "2026-10",
    now,
  );
  assert.deepEqual(result.closed, [
    { startDate: "2026-10-09", endDate: "2026-10-09" },
  ]);
  assert.deepEqual(bookingReceipt(booking, true), {
    reference: "ZC-240DA9B1C17D",
    status: "pending",
    date: "2026-10-09",
    experience: "beginner",
    demo: true,
  });
  assert.throws(() =>
    calendarAvailability(defaultContent, [], "beginner", "2026-13", now),
  );
});
