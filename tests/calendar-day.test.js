import test from "node:test";
import assert from "node:assert/strict";
import { dayAgenda, whatsappNumber } from "../src/calendar-day.js";

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
