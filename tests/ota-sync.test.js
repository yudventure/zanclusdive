import test from "node:test";
import assert from "node:assert/strict";
import {
  agentFeed,
  agentHolds,
  parseCalendar,
  peopleIn,
  unavailableDays,
} from "../src/agent-calendar.js";
import { assertBookable, slotCalendar } from "../src/booking-model.js";
import { defaultContent } from "../src/cms-model.js";

const content = structuredClone(defaultContent);
const ota = (events, extra = {}) => ({
  id: "ota1",
  name: "Booking OTA",
  kind: "ota",
  enabled: true,
  share: false,
  feedMode: "blocks",
  impact: "places",
  pool: "diving",
  perEvent: 2,
  feedMinPlaces: 4,
  events,
  ...extra,
});

test("OTA and calendar exports are read as whole days", () => {
  const ics = [
    "﻿BEGIN:VCALENDAR",
    // Airbnb / Booking.com style: whole days, the end day not included.
    "BEGIN:VEVENT",
    "UID:airbnb-1",
    "DTSTART;VALUE=DATE:20301020",
    "DTEND;VALUE=DATE:20301023",
    "SUMMARY:Airbnb (Not available)",
    "END:VEVENT",
    // A timed booking ending at midnight is one day.
    "BEGIN:VEVENT",
    "UID:gyg-2",
    "DTSTART;TZID=Asia/Jayapura:20301024T090000",
    "DTEND;TZID=Asia/Jayapura:20301025T000000",
    "SUMMARY:Fun dive - 3 pax",
    "END:VEVENT",
    // DURATION instead of DTEND, people in the description, free time.
    "BEGIN:VEVENT",
    "UID:x-3",
    "DTSTART;VALUE=DATE:20301026",
    "DURATION:P2D",
    "SUMMARY:Reserved",
    "DESCRIPTION:Guests: 5",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:x-4",
    "DTSTART:20301027T150000Z",
    "SUMMARY:Cancelled one",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  assert.deepEqual(parseCalendar(ics), [
    {
      uid: "airbnb-1",
      summary: "Airbnb (Not available)",
      start: "2030-10-20",
      end: "2030-10-22",
      people: null,
      free: false,
    },
    {
      uid: "gyg-2",
      summary: "Fun dive - 3 pax",
      start: "2030-10-24",
      end: "2030-10-24",
      people: 3,
      free: false,
    },
    {
      uid: "x-3",
      summary: "Reserved",
      start: "2030-10-26",
      end: "2030-10-27",
      people: 5,
      free: true,
    },
  ]);
  assert.equal(peopleIn("Adults: 4"), 4);
  assert.equal(peopleIn("2 orang"), 2);
  assert.equal(peopleIn("Room 101"), null);
});

test("linked calendars use the daily places", () => {
  const events = [
    {
      uid: "a",
      summary: "4 pax",
      start: "2030-05-10",
      end: "2030-05-10",
      people: 4,
    },
    {
      uid: "b",
      summary: "Reserved",
      start: "2030-05-10",
      end: "2030-05-11",
      people: null,
    },
    {
      uid: "c",
      summary: "Free",
      start: "2030-05-10",
      end: "2030-05-10",
      people: 9,
      free: true,
    },
  ];
  const window = { today: "2030-05-01", last: "2030-12-31" };
  const holds = agentHolds(content, [ota(events)]);
  assert.equal(holds.length, 2);
  const slots = slotCalendar(content, holds, "diving", window);
  assert.equal(slots.used["2030-05-10"], 6);
  assert.equal(slots.used["2030-05-11"], 2);
  // A calendar set to only show its events holds nothing.
  assert.deepEqual(agentHolds(content, [ota(events, { impact: "info" })]), []);
  // One that closes days fills them.
  const blocked = slotCalendar(
    content,
    agentHolds(content, [ota(events, { impact: "block" })]),
    "diving",
    window,
  );
  assert.equal(blocked.used["2030-05-10"], 60);
  // Online sign-ups for diving and courses see those places taken.
  const bookings = [
    {
      experience: "diving",
      status: "confirmed",
      startDate: "2030-05-10",
      endDate: "2030-05-10",
      participants: 22,
    },
  ];
  const request = {
    experience: "course",
    status: "pending",
    startDate: "2030-05-10",
    endDate: "2030-05-10",
    participants: 3,
  };
  assert.doesNotThrow(() => assertBookable(content, bookings, request));
  assert.throws(
    () => assertBookable(content, [...bookings, ...holds], request),
    /tinggal 2 orang/,
  );
  // Snorkeling has no limit, so a blocking calendar closes its days.
  const snorkel = agentHolds(content, [
    ota(events, { impact: "block", pool: "snorkeling" }),
  ]);
  assert.throws(
    () =>
      assertBookable(content, snorkel, {
        ...request,
        experience: "snorkeling",
      }),
    /ditutup/,
  );
});

test("an OTA's feed has only the days it should stop selling", () => {
  const now = new Date("2030-05-01T00:00:00Z");
  const other = ota(
    [
      {
        uid: "o",
        summary: "8 pax",
        start: "2030-05-12",
        end: "2030-05-12",
        people: 8,
      },
    ],
    { id: "ota2", name: "Other OTA" },
  );
  const own = ota([
    {
      uid: "s",
      summary: "30 pax",
      start: "2030-05-14",
      end: "2030-05-14",
      people: 30,
    },
  ]);
  const bookings = [
    {
      id: "b1",
      experience: "diving",
      status: "confirmed",
      startDate: "2030-05-12",
      endDate: "2030-05-12",
      participants: 19,
      guestName: "Rahasia",
    },
    {
      id: "b2",
      experience: "beginner",
      status: "confirmed",
      startDate: "2030-05-13",
      endDate: "2030-05-13",
      participants: 10,
    },
    {
      id: "b3",
      experience: "diving",
      status: "closed",
      startDate: "2030-05-20",
      endDate: "2030-05-21",
      participants: 1,
    },
  ];
  const days = unavailableDays({
    content,
    bookings,
    agents: [own, other],
    agent: own,
    today: "2030-05-01",
    last: "2030-06-01",
  });
  // 19 + 8 from the other OTA leaves 3 < 4; 10 leaves 20; the OTA's own
  // 30 pax are not sent back to it; closed days are blocked.
  assert.deepEqual(days, [
    { start: "2030-05-12", end: "2030-05-12", reason: "full" },
    { start: "2030-05-20", end: "2030-05-21", reason: "closed" },
  ]);
  const feed = agentFeed({
    content,
    bookings,
    agents: [own, other],
    agent: own,
    now,
  });
  const events = parseCalendar(feed);
  assert.deepEqual(
    events.map((e) => [e.start, e.end, e.summary]),
    [
      ["2030-05-12", "2030-05-12", "Not available · Zanclus penuh"],
      ["2030-05-20", "2030-05-21", "Not available · Zanclus tutup"],
    ],
  );
  assert.doesNotMatch(feed, /Rahasia|tamu/);
  // A travel agent still gets the detailed schedule.
  assert.match(
    agentFeed({
      content,
      bookings,
      agents: [own, other],
      agent: { ...own, feedMode: "detail" },
      now,
    }),
    /19 tamu/,
  );
});
