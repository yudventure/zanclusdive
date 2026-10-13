import test from "node:test";
import assert from "node:assert/strict";
import { agentFeed, parseCalendar } from "../src/agent-calendar.js";
import { defaultContent } from "../src/cms-model.js";

const content = structuredClone(defaultContent);
const agent = { id: "a1", name: "Papua Travel", enabled: true, share: true };
const other = {
  id: "a2",
  name: "Sorong Tours",
  enabled: true,
  share: true,
  events: [
    {
      uid: "x1",
      summary: "Grup Budi 8 orang",
      start: "2026-10-20",
      end: "2026-10-21",
    },
  ],
};
const hidden = { ...other, id: "a3", name: "Private Agent", share: false };
const bookings = [
  {
    id: "b1",
    experience: "diving",
    status: "confirmed",
    startDate: "2026-10-15",
    endDate: "2026-10-15",
    guestName: "Rahasia Guest",
    phone: "+62811111111",
    participants: 4,
    payment: { status: "paid" },
  },
  {
    id: "b2",
    experience: "beginner",
    status: "closed",
    startDate: "2026-10-18",
    endDate: "2026-10-19",
    guestName: "",
    participants: 1,
  },
  {
    id: "b3",
    experience: "trip",
    status: "pending",
    startDate: "2026-10-16",
    endDate: "2026-10-16",
    guestName: "Belum Bayar",
    participants: 2,
    payment: { status: "pending" },
  },
  {
    id: "b4",
    experience: "trip",
    status: "cancelled",
    startDate: "2026-10-17",
    endDate: "2026-10-17",
    guestName: "Batal",
    participants: 2,
  },
];

test("an agent's feed shows the schedule without guest details", () => {
  const feed = agentFeed({
    content,
    bookings,
    agents: [agent, other, hidden],
    agent,
    now: new Date("2026-10-13T00:00:00Z"),
  });
  assert.match(feed, /^BEGIN:VCALENDAR\r\n/);
  assert.match(feed, /END:VCALENDAR\r\n$/);
  assert.ok(feed.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  const events = parseCalendar(feed);
  const summaries = events.map((e) => e.summary);
  assert.ok(summaries.includes("Zanclus · Diving · 4 tamu · lunas"));
  assert.ok(summaries.some((s) => s.startsWith("Zanclus tutup")));
  assert.ok(summaries.includes("Sorong Tours · terisi"));
  assert.ok(!summaries.some((s) => /Private Agent|Belum Bayar|Batal/.test(s)));
  assert.ok(!feed.includes("Rahasia") && !feed.includes("62811111111"));
  assert.ok(!feed.includes("Grup Budi"));
  const closed = events.find((e) => e.summary.startsWith("Zanclus tutup"));
  assert.deepEqual([closed.start, closed.end], ["2026-10-18", "2026-10-19"]);
});

test("agent calendars from Google, Outlook or Apple are read", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:one@google.com",
    "DTSTART;VALUE=DATE:20261101",
    "DTEND;VALUE=DATE:20261103",
    "SUMMARY:Trip Wayag\\, 6 orang",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:two",
    "DTSTART:20261104T230000Z",
    "DTEND:20261105T010000Z",
    "SUMMARY:Jemput bandara dengan nama yang sang",
    " at panjang",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:three",
    "DTSTART;TZID=Asia/Jayapura:20261110T090000",
    "STATUS:CANCELLED",
    "SUMMARY:Batal",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:old",
    "DTSTART;VALUE=DATE:20250101",
    "SUMMARY:Lama",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const events = parseCalendar(ics, { from: "2026-10-01", to: "2027-10-01" });
  assert.deepEqual(
    events.map((e) => [e.uid, e.summary, e.start, e.end]),
    [
      ["one@google.com", "Trip Wayag, 6 orang", "2026-11-01", "2026-11-02"],
      [
        "two",
        "Jemput bandara dengan nama yang sangat panjang",
        "2026-11-05",
        "2026-11-05",
      ],
    ],
  );
});

test("calendar links on private networks are not fetched", async () => {
  const { privateAddress } = await import("../src/server/net-guard.js");
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "not-an-ip",
  ])
    assert.equal(privateAddress(address), true, address);
  for (const address of ["142.250.4.100", "172.32.0.1", "2001:4860::8888"])
    assert.equal(privateAddress(address), false, address);
});
