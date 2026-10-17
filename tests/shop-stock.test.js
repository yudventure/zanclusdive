import test from "node:test";
import assert from "node:assert/strict";
import {
  countMovements,
  shopStockCounts,
  planShopItems,
  linkedItems,
  shopReservations,
  freeUnits,
  publicStock,
  shopUse,
  stockShortfall,
  shortfallMessage,
  saleMovements,
  unrecordedSales,
  recordedBookings,
  unitForProduct,
  modesOf,
  variantKey,
} from "../src/shop-stock.js";
import { validateItem, stockTable } from "../src/inventory-model.js";
import { bookingErrorMessage } from "../src/booking-model.js";

const now = "2026-10-16T01:00:00.000Z";
// Sold and rented out, as most gear.
const mask = {
  id: "demo-mask",
  name: "Mask & snorkel set",
  category: "mask",
  availability: "stock",
  enabled: true,
  saleEnabled: true,
  rentalEnabled: true,
};
// Only sold.
const torch = {
  id: "demo-light",
  name: "Dive torch",
  category: "light",
  availability: "request",
  enabled: true,
  saleEnabled: true,
  rentalEnabled: false,
};
const item = (id, extra = {}) => ({
  id,
  name: id,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});
const move = (itemId, kind, qty, extra = {}) => ({
  itemId,
  kind,
  qty,
  date: "2026-10-01",
  ...extra,
});
const booking = (id, lines, extra = {}) => ({
  id,
  experience: "shop",
  status: "confirmed",
  startDate: "2026-10-20",
  endDate: "2026-10-22",
  payment: { status: "paid", lines },
  ...extra,
});

test("sale and rental stock are separate items, per size", () => {
  assert.deepEqual(modesOf(mask), ["sale", "rental"]);
  assert.deepEqual(modesOf(torch), ["sale"]);
  assert.equal(variantKey("demo-mask", "rental", "M"), "demo-mask::rental::M");
  const sized = { ...mask, sizes: ["M", "L"] };
  const existing = item("item:000000000001", {
    name: "  mask & snorkel set · SEWA · m ",
  });
  const plan = planShopItems([sized, torch], [existing], [], now);
  // The rental M takes the item of the same name; the rest are new.
  assert.deepEqual(plan.update, [
    {
      id: existing.id,
      changes: {
        productId: "demo-mask",
        mode: "rental",
        size: "M",
        linkedAt: now,
      },
    },
  ]);
  assert.deepEqual(
    plan.create.map((i) => [i.name, i.unit, i.mode, i.size]),
    [
      ["Mask & snorkel set · Jual · M", "set", "sale", "M"],
      ["Mask & snorkel set · Jual · L", "set", "sale", "L"],
      ["Mask & snorkel set · Sewa · L", "set", "rental", "L"],
      ["Dive torch · Jual", "pcs", "sale", ""],
    ],
  );
  assert.ok(plan.create.every((i) => i.auto && i.shopName === i.name));
  assert.equal(unitForProduct({ category: "fins" }), "pasang");
  // Once linked, nothing changes.
  const linked = [
    item("a", { productId: "demo-light", mode: "sale" }),
    item("b", { productId: "demo-mask", mode: "sale", size: "M" }),
    item("c", { productId: "demo-mask", mode: "rental", size: "M" }),
    item("d", { productId: "demo-mask", mode: "sale", size: "L" }),
    item("e", { productId: "demo-mask", mode: "rental", size: "L" }),
  ];
  assert.deepEqual(planShopItems([sized, torch], linked, [], now), {
    create: [],
    update: [],
    remove: [],
  });
});

test("items from before the split count for sale, or rental-only gear", () => {
  const rentalOnly = { ...mask, id: "demo-tank", saleEnabled: false };
  const old = item("item:00000000000f", { productId: "demo-mask" });
  const tank = item("item:00000000000e", { productId: "demo-tank" });
  const plan = planShopItems([mask, rentalOnly], [old, tank], [], now);
  assert.deepEqual(plan.update, [
    { id: old.id, changes: { mode: "sale" } },
    { id: tank.id, changes: { mode: "rental" } },
  ]);
  // The mask's rental stock starts as a new item.
  assert.deepEqual(
    plan.create.map((i) => [i.productId, i.mode]),
    [["demo-mask", "rental"]],
  );
  assert.equal(linkedItems([old], [mask]).get("demo-mask::sale"), old);
});

test("the newest link wins; an empty item the warehouse made goes", () => {
  const made = item("item:00000000000a", {
    productId: "demo-mask",
    mode: "sale",
    linkedAt: "2026-10-01T00:00:00.000Z",
    auto: true,
  });
  const own = item("item:00000000000b", {
    name: "Scuba Pro Dive Mask - Zanclus Dive Shop",
    productId: "demo-mask",
    mode: "sale",
    linkedAt: now,
  });
  const rental = item("r", { productId: "demo-mask", mode: "rental" });
  assert.deepEqual(planShopItems([mask], [made, own, rental], [], now), {
    create: [],
    update: [],
    remove: [made.id],
  });
  const kept = planShopItems(
    [mask],
    [made, own, rental],
    [move(made.id, "in", 2)],
    now,
  );
  assert.deepEqual(kept.remove, []);
  assert.deepEqual(kept.update, [
    { id: made.id, changes: { productId: "", size: "", mode: "" } },
  ]);
});

test("a way, product or size that is gone frees its item; renames follow", () => {
  const orphan = item("o", { productId: "old-product", mode: "sale" });
  // The mask is no longer rented out.
  const rented = item("r", {
    productId: "demo-mask",
    mode: "rental",
    auto: true,
  });
  const made = item("m", {
    name: "Mask set · Jual",
    shopName: "Mask set · Jual",
    productId: "demo-mask",
    mode: "sale",
    auto: true,
  });
  const plan = planShopItems(
    [{ ...mask, rentalEnabled: false }],
    [orphan, rented, made],
    [],
    now,
  );
  assert.deepEqual(plan.update, [
    { id: orphan.id, changes: { productId: "", size: "", mode: "" } },
    {
      id: made.id,
      changes: {
        name: "Mask & snorkel set · Jual",
        shopName: "Mask & snorkel set · Jual",
      },
    },
  ]);
  assert.deepEqual(plan.remove, [rented.id]);
  assert.deepEqual(plan.create, []);
});

test("orders hold units: purchases on the sale stock, rentals on the rental stock", () => {
  const lines = [
    { product: "demo-mask", mode: "sale", quantity: 1 },
    { product: "demo-mask", mode: "rental", quantity: 2 },
    { name: { id: "Sewa full set" }, quantity: 1 },
  ];
  const bookings = [
    booking("b1", lines),
    booking("b2", lines, {
      status: "pending",
      payment: { status: "pending", lines },
    }),
    booking("b3", lines, { status: "cancelled" }),
    booking("b4", lines, {
      status: "pending",
      payment: { status: "expired", lines },
    }),
    booking("b5", lines, {
      payment: { status: "paid", stockRecorded: true, lines },
    }),
  ];
  const held = shopReservations(bookings, new Set(["b1"]));
  // b1's purchase is a movement already; b2's is waiting for payment.
  assert.equal(held["demo-mask::sale"].sale, 1);
  assert.deepEqual(held["demo-mask::sale"].rentals, []);
  assert.equal(held["demo-mask::rental"].sale, 0);
  assert.deepEqual(
    held["demo-mask::rental"].rentals.map((r) => [r.bookingId, r.qty]),
    [
      ["b1", 2],
      ["b2", 2],
      ["b5", 2],
    ],
  );
  assert.deepEqual(
    recordedBookings([
      move("x", "out", 1, { bookingId: "b1" }),
      move("x", "in", 1),
    ]),
    new Set(["b1"]),
  );
});

test("free units: the busiest day counts", () => {
  const held = {
    sale: 1,
    rentals: [
      { from: "2026-10-20", to: "2026-10-22", qty: 2 },
      { from: "2026-10-22", to: "2026-10-23", qty: 1 },
      { from: "2026-11-05", to: "2026-11-05", qty: 4 },
    ],
  };
  assert.equal(freeUnits(10, held, "2026-10-16", "2026-10-19"), 9);
  assert.equal(freeUnits(10, held, "2026-10-21", "2026-10-23"), 6);
  assert.equal(freeUnits(10, held, "2026-10-16"), 5);
  assert.equal(freeUnits(10, undefined, "2026-10-16"), 10);
});

const data = (extra = {}) => ({
  products: [mask, torch],
  items: [
    item("sale", { productId: "demo-mask", mode: "sale", unit: "set" }),
    item("rent", { productId: "demo-mask", mode: "rental", unit: "set" }),
    item("torch", { productId: "demo-light", mode: "sale" }),
  ],
  movements: [
    move("sale", "in", 5),
    move("rent", "in", 3),
    move("torch", "in", 2),
  ],
  bookings: [
    booking("b1", [{ product: "demo-mask", mode: "rental", quantity: 2 }]),
    booking("b2", [{ product: "demo-mask", mode: "sale", quantity: 1 }], {
      status: "pending",
      payment: {
        status: "pending",
        lines: [{ product: "demo-mask", mode: "sale", quantity: 1 }],
      },
    }),
  ],
  ...extra,
});

test("the public shop sees each stock, not bookings", () => {
  assert.deepEqual(publicStock(data(), "2026-10-16"), {
    // 5 for sale with 1 waiting for payment; 3 rental units.
    "demo-mask": { sale: 4, rental: 3 },
  });
  const empty = data({ movements: [] });
  assert.deepEqual(publicStock(empty, "2026-10-16")["demo-mask"], {
    sale: 0,
    rental: 0,
  });
  const off = data();
  off.items[1].active = false;
  assert.deepEqual(publicStock(off, "2026-10-16")["demo-mask"], {
    sale: 4,
    rental: 0,
  });
});

test("the warehouse sees what the shop holds of each stock", () => {
  const use = shopUse(data(), "2026-10-21");
  assert.deepEqual(use.rent, {
    productId: "demo-mask",
    mode: "rental",
    size: "",
    productName: "Mask & snorkel set",
    availability: "stock",
    shown: true,
    rentedToday: 2,
    bookedLater: 0,
    waiting: 0,
  });
  assert.equal(use.sale.waiting, 1);
  assert.equal(use.sale.rentedToday, 0);
  assert.equal(shopUse(data(), "2026-10-16").rent.bookedLater, 2);
  assert.equal(use.torch.mode, "sale");
});

test("an order cannot take more than its stock has", () => {
  const order = (lines, startDate = "2026-10-21", endDate = startDate) => ({
    startDate,
    endDate,
    lines,
  });
  const sale = (quantity) => ({ product: "demo-mask", mode: "sale", quantity });
  const rent = (quantity) => ({
    product: "demo-mask",
    mode: "rental",
    quantity,
  });
  const today = "2026-10-16";
  // Rentals do not touch the sale stock: 4 can still be bought.
  assert.equal(stockShortfall(data(), order([sale(4)]), today), null);
  const short = stockShortfall(data(), order([sale(5)]), today);
  assert.deepEqual([short.mode, short.left], ["sale", 4]);
  // On 21 Oct two of three rental units are out.
  assert.equal(stockShortfall(data(), order([rent(1)]), today), null);
  assert.equal(stockShortfall(data(), order([rent(2)]), today).left, 1);
  assert.equal(
    stockShortfall(data(), order([rent(3)], "2026-10-25", "2026-10-26"), today),
    null,
  );
  // Buying and renting the same gear draw on different stock.
  assert.equal(
    stockShortfall(data(), order([sale(4), rent(3)], "2026-10-25"), today),
    null,
  );
  // Products that do not follow the warehouse are not checked.
  assert.equal(
    stockShortfall(
      data(),
      order([{ product: "demo-light", mode: "sale", quantity: 9 }]),
      today,
    ),
    null,
  );
});

test("shortfall words have no colon or semicolon, and read in English", () => {
  const product = { name: "Mask & snorkel set" };
  const messages = [
    shortfallMessage({ product, mode: "sale", left: 2 }),
    shortfallMessage({ product, mode: "rental", left: 1, size: "M" }),
    shortfallMessage({ product, mode: "sale", left: 0 }),
  ];
  for (const message of messages) assert.doesNotMatch(message, /[:;—]/);
  assert.equal(
    bookingErrorMessage(messages[0], "en"),
    "Only 2 left of Mask & snorkel set. Choose fewer.",
  );
  assert.equal(
    bookingErrorMessage(messages[1], "en"),
    "Only 1 left of Mask & snorkel set size M for those dates. Choose fewer or other dates.",
  );
  assert.equal(
    bookingErrorMessage(messages[2], "en"),
    "Mask & snorkel set is out of stock. Remove it from your order or chat with our team on WhatsApp.",
  );
});

test("a paid purchase leaves the sale stock, once", () => {
  const lines = [
    { product: "demo-mask", mode: "sale", quantity: 1 },
    { product: "demo-mask", mode: "sale", quantity: 2 },
    { product: "demo-mask", mode: "rental", quantity: 1 },
    { product: "gone", mode: "sale", quantity: 1 },
  ];
  const paid = booking("2b8f7a1c-0000-4000-8000-000000000000", lines);
  assert.deepEqual(saleMovements(paid, data(), "2026-10-16"), [
    {
      date: "2026-10-16",
      itemId: "sale",
      kind: "out",
      qty: 3,
      reason: "jual",
      note: "Pesanan online ZC-2B8F7A1C0000",
      bookingId: paid.id,
    },
  ]);
  const rentalOnly = booking("r", [lines[2]]);
  const waiting = booking("w", lines, {
    status: "pending",
    payment: { status: "pending", lines },
  });
  assert.deepEqual(
    unrecordedSales([paid, rentalOnly, waiting], new Set()).map((b) => b.id),
    [paid.id],
  );
  assert.deepEqual(unrecordedSales([paid], new Set([paid.id])), []);
});

test("counts typed in the Dive Shop editor set each stock", () => {
  const sized = { ...mask, sizes: ["M", "L"] };
  const sizedData = {
    products: [sized],
    items: [
      item("sm", { productId: "demo-mask", mode: "sale", size: "M" }),
      item("rm", { productId: "demo-mask", mode: "rental", size: "M" }),
    ],
    movements: [move("sm", "in", 2)],
  };
  const sent = {
    shop: {
      products: [
        {
          id: "demo-mask",
          stockCounts: {
            sale: { M: "5", L: "" },
            rental: { M: 4, XL: 3 },
          },
        },
      ],
    },
  };
  const counts = shopStockCounts(sent, [sized]);
  assert.deepEqual(counts, [
    { productId: "demo-mask", mode: "sale", size: "M", count: 5 },
    { productId: "demo-mask", mode: "rental", size: "M", count: 4 },
  ]);
  assert.deepEqual(
    countMovements(counts, sizedData, "2026-10-16").map((m) => [
      m.itemId,
      m.kind,
      m.qty,
      m.note,
    ]),
    [
      ["sm", "adjust", 3, "Diatur dari Dive Shop"],
      ["rm", "adjust", 4, "Diatur dari Dive Shop"],
    ],
  );
  // A way the product is not offered is ignored.
  assert.deepEqual(
    shopStockCounts(sent, [{ ...sized, rentalEnabled: false }]).map(
      (c) => c.mode,
    ),
    ["sale"],
  );
});

test("warehouse items link to a product's sale or rental stock", () => {
  const products = [{ ...mask, sizes: ["M"] }, torch];
  const rental = validateItem(
    { name: "Mask sewa", productId: "demo-mask", mode: "rental", size: "M" },
    null,
    { products },
  );
  assert.deepEqual(
    [rental.productId, rental.mode, rental.size],
    ["demo-mask", "rental", "M"],
  );
  assert.ok(rental.linkedAt);
  const kept = validateItem(
    { name: "Mask A" },
    { ...rental, linkedAt: now },
    { products },
  );
  assert.equal(kept.linkedAt, undefined);
  assert.ok(
    validateItem({ mode: "sale" }, { ...rental, linkedAt: now }, { products })
      .linkedAt,
  );
  for (const input of [
    { productId: "nope" },
    { productId: "demo-light", mode: "rental" },
    { productId: "demo-mask", mode: "sale", size: "XL" },
    { productId: "demo-mask", mode: "lend", size: "M" },
  ])
    assert.throws(
      () => validateItem({ name: "x", ...input }, null, { products }),
      { message: /Produk, jual atau sewa, atau ukuran/ },
    );
  const [row] = stockTable([{ id: "i", name: "Mask", minStock: 2 }], []);
  assert.equal(row.empty, true);
  assert.equal(row.low, false);
});
