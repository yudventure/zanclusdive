import test from "node:test";
import assert from "node:assert/strict";
import { validateBooking, defaultContent } from "../src/cms-model.js";
import {
  freeUnits,
  gearLeft,
  rentalCalendar,
  shopReservations,
  stockShortfall,
  variantKey,
} from "../src/shop-stock.js";
import { rentalTabOf, rentalAddOn } from "../src/shop-model.js";

const booking = (patch = {}) => ({
  id: "b1",
  experience: "shop",
  status: "confirmed",
  source: "walkin",
  startDate: "2030-01-05",
  endDate: "2030-01-06",
  guestName: "Tamu",
  phone: "",
  participants: 1,
  amount: 0,
  notes: "",
  ...patch,
});
const mask = variantKey("sewa-masker", "rental");

test("the old rental lists are Dive Shop products for rent only", () => {
  const gear = defaultContent.shop.products;
  assert.equal(gear.length, 18);
  assert.ok(gear.every((p) => p.rentalEnabled && !p.saleEnabled));
  assert.ok(gear.every((p) => p.availability === "available"));
  // Each keeps the homepage tab it was listed under.
  assert.deepEqual(
    Object.entries(Object.groupBy(gear, (p) => rentalTabOf[p.category])).map(
      ([tab, list]) => [tab, list.length],
    ),
    [
      ["rentalBasics", 5],
      ["rentalScuba", 5],
      ["rentalTank", 2],
      ["rentalTools", 3],
      ["rentalCamera", 3],
    ],
  );
  const weights = gear.find((p) => p.id === "sewa-weight-belt");
  assert.deepEqual(
    [weights.category, weights.specification, weights.rentalPrice],
    ["weight", "Pemberat 5 kg", 50000],
  );
  assert.equal(
    defaultContent.en.shop.products["sewa-weight-belt"].specification,
    "5 kg of weights",
  );
  // Gear with sizes is rented from the Dive Shop, not as an add-on.
  assert.equal(rentalAddOn(weights), true);
  assert.equal(rentalAddOn({ ...weights, sizes: ["S"] }), false);
  assert.equal(rentalAddOn({ ...weights, enabled: false }), false);
});

test("the team books rental gear by hand on a reservation", () => {
  const saved = validateBooking({
    ...booking(),
    gear: [
      { product: "sewa-masker", quantity: 2 },
      { product: "demo-suit", size: "M", quantity: 1 },
      { product: "sewa-masker", size: "", quantity: 1 },
    ],
  });
  assert.deepEqual(saved.gear, [
    { product: "sewa-masker", quantity: 3 },
    { product: "demo-suit", size: "M", quantity: 1 },
  ]);
  assert.equal("gear" in validateBooking(booking()), false);
  assert.equal("gear" in validateBooking({ ...booking(), gear: [] }), false);
  for (const gear of [
    [{ product: "Masker biru", quantity: 1 }],
    [{ product: "sewa-masker", quantity: 0 }],
    [{ product: "sewa-masker", quantity: 101 }],
    [{ product: "sewa-masker", size: "M::L", quantity: 1 }],
    Array.from({ length: 21 }, () => ({ product: "sewa-masker", quantity: 1 })),
    "sewa-masker",
  ])
    assert.throws(() => validateBooking({ ...booking(), gear }));
});

// A walk-in rental booked by the team, a dive paying online with the mask
// as an add-on, and a reservation not confirmed yet.
const bookings = [
  booking({ id: "walkin", gear: [{ product: "sewa-masker", quantity: 2 }] }),
  booking({
    id: "dive",
    experience: "diving",
    status: "pending",
    startDate: "2030-01-06",
    endDate: "2030-01-06",
    payment: {
      status: "pending",
      lines: [
        { name: { id: "Discovery Dive" }, price: 1200000, quantity: 1 },
        { product: "sewa-masker", mode: "rental", quantity: 1 },
      ],
    },
  }),
  booking({
    id: "maybe",
    status: "pending",
    gear: [{ product: "sewa-masker", quantity: 5 }],
  }),
];

test("gear booked by hand or with an activity holds the rental stock", () => {
  const held = shopReservations(bookings);
  assert.equal(freeUnits(4, held[mask], "2030-01-05", "2030-01-05"), 2);
  assert.equal(freeUnits(4, held[mask], "2030-01-06", "2030-01-06"), 1);
  const gear = [
    {
      key: mask,
      productId: "sewa-masker",
      size: "",
      name: "Masker",
      stock: 4,
      follows: true,
    },
  ];
  const days = rentalCalendar(bookings, gear, "2030-01-04", "2030-01-07");
  assert.deepEqual(Object.keys(days), ["2030-01-05", "2030-01-06"]);
  const busy = days["2030-01-06"][0];
  assert.deepEqual(
    [busy.name, busy.used, gearLeft(busy), busy.bookingIds],
    ["Masker", 3, 1, ["walkin", "dive"]],
  );
  // Over the stock shows as less than nothing left.
  const small = rentalCalendar(
    bookings,
    [{ ...gear[0], stock: 2 }],
    "2030-01-06",
    "2030-01-06",
  );
  assert.equal(gearLeft(small["2030-01-06"][0]), -1);
  // Gear whose stock the website does not follow has no limit.
  const loose = rentalCalendar(
    bookings,
    [{ ...gear[0], follows: false }],
    "2030-01-05",
    "2030-01-05",
  );
  assert.equal(gearLeft(loose["2030-01-05"][0]), null);
});

test("online orders count the gear the team booked", () => {
  const data = {
    products: [
      {
        id: "sewa-masker",
        name: "Masker",
        availability: "stock",
        saleEnabled: false,
        rentalEnabled: true,
        sizes: [],
      },
    ],
    items: [
      {
        id: "item-mask",
        name: "Masker · Sewa",
        productId: "sewa-masker",
        mode: "rental",
        size: "",
        active: true,
      },
    ],
    movements: [{ itemId: "item-mask", kind: "in", qty: 3 }],
    bookings,
  };
  const order = (startDate, quantity) => ({
    startDate,
    endDate: startDate,
    lines: [{ product: "sewa-masker", mode: "rental", quantity }],
  });
  assert.equal(
    stockShortfall(data, order("2030-01-07", 3), "2030-01-01"),
    null,
  );
  const short = stockShortfall(data, order("2030-01-06", 1), "2030-01-01");
  assert.deepEqual([short.mode, short.left], ["rental", 0]);
  assert.equal(
    stockShortfall(data, order("2030-01-05", 1), "2030-01-01"),
    null,
  );
});
