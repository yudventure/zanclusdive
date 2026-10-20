import test from "node:test";
import assert from "node:assert/strict";
import { defaultContent } from "../src/cms-model.js";
import { validateEventSignup } from "../src/event-signup.js";
import { bookingErrorMessage } from "../src/booking-model.js";

const now = new Date("2030-01-01T03:00:00Z");
const input = (extra) => ({
  requestId: "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b",
  event: "Dive Trip with Zanclus",
  name: "Rina",
  phone: "+62 812 3456 7890",
  email: "rina@example.com",
  people: 4,
  date: "2030-02-10",
  notes: "Open Water, 20 log",
  ...extra,
});

test("an event sign-up becomes a reservation request priced from the CMS", () => {
  const { booking } = validateEventSignup(defaultContent, input(), now, "en");
  assert.deepEqual(
    [
      booking.experience,
      booking.status,
      booking.source,
      booking.startDate,
      booking.endDate,
      booking.participants,
      booking.amount,
      booking.email,
      booking.lang,
    ],
    [
      "trip",
      "pending",
      "website",
      "2030-02-10",
      "2030-02-10",
      4,
      110000000,
      "rina@example.com",
      "en",
    ],
  );
  assert.match(
    booking.notes,
    /^Daftar event Dive Trip with Zanclus · tanggal pilihan tamu · Rp\s?27\.500\.000 \/ orang\nOpen Water, 20 log$/,
  );
  // A dated event uses its own dates, whatever the guest sends.
  const content = structuredClone(defaultContent);
  Object.assign(content.calendar.banners[0], {
    startDate: "2030-03-01",
    endDate: "2030-03-08",
  });
  const dated = validateEventSignup(content, input({ date: "" }), now).booking;
  assert.deepEqual(
    [dated.startDate, dated.endDate],
    ["2030-03-01", "2030-03-08"],
  );
  assert.match(dated.notes, /1–8 Mar 2030/);
});

test("event sign-ups are refused when they do not fit the event", () => {
  const refused = (extra, content = defaultContent) =>
    assert.throws(() => validateEventSignup(content, input(extra), now));
  // Fewer than the minimum group, an event that is not showing, a bad date,
  // phone or email.
  assert.throws(
    () => validateEventSignup(defaultContent, input({ people: 3 }), now),
    {
      message: "Event ini untuk minimal 4 peserta.",
    },
  );
  assert.equal(
    bookingErrorMessage("Event ini untuk minimal 4 peserta.", "en"),
    "This event is for groups of at least 4.",
  );
  refused({ event: "Promo lain" });
  refused({ date: "2029-12-01" });
  refused({ phone: "12" });
  refused({ email: "bukan-email" });
  refused({ requestId: "x" });
  const off = structuredClone(defaultContent);
  off.calendar.banners[0].enabled = false;
  refused({}, off);
  // A banner with its own link has no sign-up.
  const linked = structuredClone(defaultContent);
  linked.calendar.banners[0].link = "/trip";
  refused({}, linked);
});
