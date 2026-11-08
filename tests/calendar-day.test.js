import test from "node:test";
import assert from "node:assert/strict";
import { dayAgenda, guestFlow, whatsappNumber } from "../src/calendar-day.js";

const booking = (id, patch = {}) => ({
  id,
  experience: "diving",
  status: "confirmed",
  source: "whatsapp",
  startDate: "2026-10-29",
  endDate: "2026-11-01",
  guestName: id,
  participants: 2,
  ...patch,
});

test("the day panel lists everyone out that day by activity", () => {
  const bookings = [
    booking("Grup Jakarta", { participants: 12 }),
    booking("Budi", {
      experience: "snorkeling",
      startDate: "2026-10-31",
      endDate: "2026-10-31",
      phone: "0812 3456 7890",
    }),
    booking("Tamu Datang", {
      experience: "shop",
      startDate: "2026-10-31",
      endDate: "2026-10-31",
      participants: 1,
      gear: [{ product: "sewa-masker", quantity: 2 }],
    }),
    // A dive with rental gear of a product once for sale and for rent.
    booking("Sari", {
      startDate: "2026-10-31",
      endDate: "2026-10-31",
      payment: {
        status: "paid",
        lines: [
          { name: { id: "Discovery Dive" }, quantity: 1 },
          { product: "demo-suit", mode: "rental", size: "M", quantity: 1 },
        ],
      },
    }),
    booking("Batal", { status: "cancelled" }),
    booking("Lain hari", { startDate: "2026-11-05", endDate: "2026-11-06" }),
    booking("", { status: "closed", experience: "trip", participants: 1 }),
  ];
  const gear = [
    { productId: "sewa-masker", size: "", name: "Masker" },
    {
      productId: "demo-suit-sewa",
      size: "M",
      name: "Wetsuit 3 mm ukuran M",
      pair: "demo-suit",
    },
  ];
  const agents = [
    {
      id: "a1",
      name: "Papua Travel",
      enabled: true,
      events: [
        {
          uid: "e1",
          summary: "Grup Budi 8 orang",
          start: "2026-10-30",
          end: "2026-10-31",
        },
      ],
    },
    {
      id: "a2",
      name: "Off",
      enabled: false,
      events: [
        { uid: "e2", summary: "x", start: "2026-10-31", end: "2026-10-31" },
      ],
    },
  ];
  const day = dayAgenda("2026-10-31", bookings, { agents, gear });
  assert.deepEqual(
    day.programs.map((g) => [
      g.key,
      g.entries.map((e) => [e.booking.guestName, e.day, e.days]),
      g.people,
    ]),
    [
      [
        "diving",
        [
          ["Grup Jakarta", 3, 4],
          ["Sari", 1, 1],
        ],
        14,
      ],
      ["snorkeling", [["Budi", 1, 1]], 2],
      ["shop", [["Tamu Datang", 1, 1]], 1],
    ],
  );
  assert.deepEqual(
    day.rentals.map((r) => [r.booking.guestName, r.items]),
    [
      ["Tamu Datang", [{ name: "Masker", quantity: 2 }]],
      ["Sari", [{ name: "Wetsuit 3 mm ukuran M", quantity: 1 }]],
    ],
  );
  assert.deepEqual(
    day.agents.map(({ agent }) => agent.name),
    ["Papua Travel"],
  );
  assert.equal(day.closed.length, 1);
  assert.deepEqual([day.count, day.people], [4, 17]);
  // A day without anyone.
  const quiet = dayAgenda("2026-12-25", bookings);
  assert.deepEqual(
    [quiet.programs, quiet.rentals, quiet.agents, quiet.closed, quiet.count],
    [[], [], [], [], 0],
  );
});

test("a phone as typed becomes a WhatsApp number", () => {
  assert.equal(whatsappNumber("0812 3456 7890"), "6281234567890");
  assert.equal(whatsappNumber("+62 812-3456-7890"), "6281234567890");
  assert.equal(whatsappNumber("81234567890"), "6281234567890");
  assert.equal(whatsappNumber("+61 412 345 678"), "61412345678");
  assert.equal(whatsappNumber(""), "");
  assert.equal(whatsappNumber("123"), "");
});

test("the guests around today: who came, who is out, who arrives", () => {
  const today = "2026-10-28";
  const flow = guestFlow(
    today,
    [
      booking("Grup Jakarta", {
        startDate: "2026-10-27",
        endDate: "2026-10-29",
        participants: 12,
      }),
      booking("Budi", {
        experience: "snorkeling",
        startDate: today,
        endDate: today,
      }),
      booking("Ani", { startDate: "2026-10-30", endDate: "2026-10-30" }),
      booking("Lama", { startDate: "2026-10-20", endDate: "2026-10-20" }),
      booking("Batal", {
        startDate: "2026-10-26",
        endDate: "2026-10-26",
        status: "cancelled",
      }),
      booking("Tutup", {
        startDate: "2026-10-31",
        endDate: "2026-10-31",
        status: "closed",
      }),
      booking("Minggu depan", {
        startDate: "2026-11-04",
        endDate: "2026-11-05",
        status: "pending",
      }),
      booking("Terlalu jauh", {
        startDate: "2026-11-05",
        endDate: "2026-11-05",
      }),
    ],
    {
      agents: [
        {
          id: "agen",
          name: "Agen Sorong",
          enabled: true,
          events: [
            {
              uid: "e1",
              start: "2026-10-29",
              end: "2026-10-29",
              summary: "4 tamu",
            },
          ],
        },
        {
          id: "mati",
          name: "Agen mati",
          enabled: false,
          events: [{ uid: "e2", start: today, end: today, summary: "x" }],
        },
      ],
    },
  );
  const names = (part) =>
    part.groups.map((g) => [
      g.date,
      g.entries.map((e) => e.booking?.guestName ?? e.agent.name),
    ]);
  // Arrived in the last 7 days, yesterday first; cancelled ones and
  // arrivals before that are left out.
  assert.deepEqual(names(flow.past), [["2026-10-27", ["Grup Jakarta"]]]);
  assert.deepEqual([flow.past.count, flow.past.people], [1, 12]);
  // Today: who arrives today first, then who is already out.
  assert.deepEqual(names(flow.today), [[today, ["Budi", "Grup Jakarta"]]]);
  assert.deepEqual(
    flow.today.groups[0].entries.map((e) => [e.day, e.days]),
    [
      [1, 1],
      [2, 3],
    ],
  );
  assert.equal(flow.today.people, 14);
  // The next 7 days by arrival, with the agents' trips; closed dates and
  // arrivals after the 7th day are left out.
  assert.deepEqual(names(flow.next), [
    ["2026-10-29", ["Agen Sorong"]],
    ["2026-10-30", ["Ani"]],
    ["2026-11-04", ["Minggu depan"]],
  ]);
  assert.deepEqual([flow.next.count, flow.next.people], [3, 4]);
  // One activity picked: only its guests, without the agents' events.
  const snorkeling = guestFlow(
    today,
    [
      booking("Budi", {
        experience: "snorkeling",
        startDate: today,
        endDate: today,
      }),
      booking("Ani", { startDate: "2026-10-29", endDate: "2026-10-29" }),
    ],
    {
      program: "snorkeling",
      agents: [
        {
          id: "agen",
          name: "Agen",
          enabled: true,
          events: [
            { uid: "e", start: "2026-10-29", end: "2026-10-29", summary: "x" },
          ],
        },
      ],
    },
  );
  assert.equal(snorkeling.today.count, 1);
  assert.equal(snorkeling.next.count, 0);
});
