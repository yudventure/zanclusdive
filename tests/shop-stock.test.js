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
} from "../src/shop-stock.js";
import { validateItem, stockTable } from "../src/inventory-model.js";
import { bookingErrorMessage } from "../src/booking-model.js";

const now = "2026-10-16T01:00:00.000Z";
const mask = {
  id: "demo-mask",
  name: "Mask & snorkel set",
  category: "mask",
  availability: "stock",
  enabled: true,
};
const suit = {
  id: "demo-suit",
  name: "Wetsuit 3 mm",
  category: "suit",
  availability: "request",
  enabled: true,
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

test("every Dive Shop product and size gets one warehouse item", () => {
  const sized = { ...suit, sizes: ["M", "L"] };
  const existing = item("item:000000000001", { name: "  wetsuit 3 MM · m " });
  const plan = planShopItems([mask, sized], [existing], [], now);
  // Size M takes the item of the same name; the mask and size L get new
  // ones.
  assert.deepEqual(plan.update, [
    {
      id: existing.id,
      changes: { productId: "demo-suit", size: "M", linkedAt: now },
    },
  ]);
  assert.deepEqual(
    plan.create.map((i) => [i.name, i.unit, i.category, i.productId, i.size]),
    [
      ["Mask & snorkel set", "set", "alat", "demo-mask", ""],
      ["Wetsuit 3 mm · L", "pcs", "alat", "demo-suit", "L"],
    ],
  );
  assert.ok(plan.create.every((i) => i.auto && i.shopName === i.name));
  assert.equal(unitForProduct({ category: "fins" }), "pasang");
  assert.equal(unitForProduct({ category: "light" }), "pcs");
  // Once linked, nothing changes.
  const linked = [
    { ...existing, productId: "demo-suit", size: "M", linkedAt: now },
    item("item:000000000002", { productId: "demo-suit", size: "L" }),
    item("item:000000000003", { productId: "demo-mask" }),
  ];
  assert.deepEqual(planShopItems([mask, sized], linked, [], now), {
    create: [],
    update: [],
    remove: [],
  });
  assert.deepEqual(
    [...linkedItems(linked, [mask, sized]).keys()],
    ["demo-suit::M", "demo-suit::L", "demo-mask"],
  );
});

test("the newest link wins; an empty item the warehouse made goes", () => {
  const made = item("item:00000000000a", {
    productId: "demo-mask",
    linkedAt: "2026-10-01T00:00:00.000Z",
    auto: true,
  });
  // The team's own item, linked later from the warehouse form.
  const own = item("item:00000000000b", {
    name: "Scuba Pro Dive Mask - Zanclus Dive Shop",
    productId: "demo-mask",
    linkedAt: now,
  });
  assert.deepEqual(planShopItems([mask], [made, own], [], now), {
    create: [],
    update: [],
    remove: [made.id],
  });
  // An item with movements is only unlinked, never removed.
  const kept = planShopItems(
    [mask],
    [made, own],
    [move(made.id, "in", 2)],
    now,
  );
  assert.deepEqual(kept.remove, []);
  assert.deepEqual(kept.update, [
    { id: made.id, changes: { productId: "", size: "" } },
  ]);
  assert.equal(linkedItems([made, own], [mask]).get("demo-mask"), own);
});

test("a product or size that is gone frees its item; renames follow", () => {
  const orphan = item("item:00000000000c", { productId: "old-product" });
  const dropped = item("item:00000000000e", {
    productId: "demo-suit",
    size: "XL",
    auto: true,
  });
  const made = item("item:00000000000d", {
    name: "Mask set",
    shopName: "Mask set",
    productId: "demo-mask",
    auto: true,
  });
  const sized = { ...suit, sizes: ["M"] };
  const plan = planShopItems([mask, sized], [orphan, dropped, made], [], now);
  assert.deepEqual(plan.update, [
    { id: orphan.id, changes: { productId: "", size: "" } },
    {
      id: made.id,
      changes: { name: "Mask & snorkel set", shopName: "Mask & snorkel set" },
    },
  ]);
  // Size XL left the product and nothing was recorded on its item.
  assert.deepEqual(plan.remove, [dropped.id]);
  assert.deepEqual(
    plan.create.map((i) => i.name),
    ["Wetsuit 3 mm · M"],
  );
  // A name the team gave stays.
  const renamed = { ...made, name: "Mask rak A" };
  assert.deepEqual(planShopItems([mask], [renamed], [], now).update, []);
});

test("orders hold units: purchases until recorded, rentals on their dates", () => {
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
  const held = shopReservations(bookings, new Set(["b1"]))["demo-mask"];
  // b1's purchase is a movement already; b2's is waiting for payment.
  assert.equal(held.sale, 1);
  assert.deepEqual(
    held.rentals.map((r) => [r.bookingId, r.from, r.to, r.qty]),
    [
      ["b1", "2026-10-20", "2026-10-22", 2],
      ["b2", "2026-10-20", "2026-10-22", 2],
      ["b5", "2026-10-20", "2026-10-22", 2],
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

test("free units: the busiest day counts, a purchase looks ahead", () => {
  const held = {
    sale: 1,
    rentals: [
      { from: "2026-10-20", to: "2026-10-22", qty: 2 },
      { from: "2026-10-22", to: "2026-10-23", qty: 1 },
      { from: "2026-11-05", to: "2026-11-05", qty: 4 },
    ],
  };
  // 10 in stock, 1 sold and waiting.
  assert.equal(freeUnits(10, held, "2026-10-16", "2026-10-19"), 9);
  assert.equal(freeUnits(10, held, "2026-10-20", "2026-10-21"), 7);
  // 22 Oct has both rentals.
  assert.equal(freeUnits(10, held, "2026-10-21", "2026-10-23"), 6);
  assert.equal(freeUnits(10, held, "2026-10-24", "2026-10-30"), 9);
  // A purchase must leave the units for every rental still to come.
  assert.equal(freeUnits(10, held, "2026-10-16"), 5);
  assert.equal(freeUnits(10, undefined, "2026-10-16"), 10);
});

const data = (extra = {}) => ({
  products: [mask, suit],
  items: [
    item("item:000000000001", { productId: "demo-mask", unit: "set" }),
    item("item:000000000002", { productId: "demo-suit" }),
  ],
  movements: [
    move("item:000000000001", "in", 5),
    move("item:000000000002", "in", 3),
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

test("the public shop sees units, not bookings", () => {
  assert.deepEqual(publicStock(data(), "2026-10-16"), {
    // 5 in stock, 1 waiting for payment, 2 out on 20–22 Oct.
    "demo-mask": { sale: 2, rental: 4 },
  });
  // A product with no stock or a switched-off item shows as out of stock.
  const empty = data({ movements: [] });
  assert.deepEqual(publicStock(empty, "2026-10-16")["demo-mask"], {
    sale: 0,
    rental: 0,
  });
  const off = data();
  off.items[0].active = false;
  assert.deepEqual(publicStock(off, "2026-10-16")["demo-mask"], {
    sale: 0,
    rental: 0,
  });
});

test("the warehouse sees what the shop holds", () => {
  const use = shopUse(data(), "2026-10-21");
  assert.deepEqual(use["item:000000000001"], {
    productId: "demo-mask",
    size: "",
    productName: "Mask & snorkel set",
    availability: "stock",
    shown: true,
    rentedToday: 2,
    bookedLater: 0,
    waiting: 1,
  });
  assert.equal(
    shopUse(data(), "2026-10-16")["item:000000000001"].bookedLater,
    2,
  );
  assert.equal(shopUse(data(), "2026-10-16")["item:000000000002"].waiting, 0);
});

test("an order cannot take more than the warehouse has", () => {
  const order = (lines, startDate = "2026-10-21", endDate = "2026-10-21") => ({
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
  assert.equal(stockShortfall(data(), order([sale(2)]), today), null);
  const short = stockShortfall(data(), order([sale(3)]), today);
  assert.equal(short.mode, "sale");
  assert.equal(short.left, 2);
  // On 21 Oct two are rented out and one is waiting for payment.
  assert.equal(stockShortfall(data(), order([rent(2)]), today), null);
  assert.equal(stockShortfall(data(), order([rent(3)]), today).left, 2);
  // On another date all four can go.
  assert.equal(
    stockShortfall(data(), order([rent(4)], "2026-10-25", "2026-10-26"), today),
    null,
  );
  // Buying and renting the same gear share the units.
  const both = stockShortfall(
    data(),
    order([sale(1), rent(2)], "2026-10-25", "2026-10-25"),
    today,
  );
  assert.equal(both, null);
  const tooMany = stockShortfall(
    data(),
    order([sale(2), rent(3)], "2026-10-25", "2026-10-25"),
    today,
  );
  assert.equal(tooMany.mode, "sale");
  // Products that do not follow the warehouse are not checked.
  assert.equal(
    stockShortfall(
      data(),
      order([{ product: "demo-suit", mode: "sale", quantity: 9 }]),
      today,
    ),
    null,
  );
});

test("shortfall words have no colon or semicolon, and read in English", () => {
  const product = { name: "Mask & snorkel set" };
  const messages = [
    shortfallMessage({ product, mode: "sale", left: 2 }),
    shortfallMessage({ product, mode: "rental", left: 1 }),
    shortfallMessage({ product, mode: "sale", left: 0 }),
  ];
  for (const message of messages) assert.doesNotMatch(message, /[:;—]/);
  assert.equal(
    bookingErrorMessage(messages[0], "en"),
    "Only 2 left of Mask & snorkel set. Choose fewer.",
  );
  assert.equal(
    bookingErrorMessage(messages[1], "en"),
    "Only 1 left of Mask & snorkel set for those dates. Choose fewer or other dates.",
  );
  assert.equal(
    bookingErrorMessage(messages[2], "en"),
    "Mask & snorkel set is out of stock. Remove it from your order or chat with our team on WhatsApp.",
  );
  assert.equal(bookingErrorMessage(messages[0], "id"), messages[0]);
});

test("a paid purchase becomes one movement per item, once", () => {
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
      itemId: "item:000000000001",
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

test("warehouse items keep their Dive Shop link and show empty stock", () => {
  const products = [mask];
  const linked = validateItem({ name: "Mask", productId: "demo-mask" }, null, {
    products,
  });
  assert.equal(linked.productId, "demo-mask");
  assert.ok(linked.linkedAt);
  // Saving other fields keeps the link and its time.
  const kept = validateItem(
    { name: "Mask A" },
    { ...linked, linkedAt: now },
    {
      products,
    },
  );
  assert.equal(kept.productId, "demo-mask");
  assert.equal(kept.linkedAt, undefined);
  assert.throws(
    () => validateItem({ name: "Mask", productId: "nope" }, null, { products }),
    { message: /Produk atau ukuran Dive Shop/ },
  );
  // A product with sizes links each item to one of them.
  const sized = [{ ...suit, sizes: ["M", "L"] }];
  const m = validateItem(
    { name: "Wetsuit M", productId: "demo-suit", size: "M" },
    null,
    { products: sized },
  );
  assert.deepEqual([m.productId, m.size], ["demo-suit", "M"]);
  for (const size of ["", "XL"])
    assert.throws(
      () =>
        validateItem({ name: "W", productId: "demo-suit", size }, null, {
          products: sized,
        }),
      { message: /ukuran/ },
    );
  // Moving to another size counts as a new link.
  assert.ok(
    validateItem({ size: "L" }, { ...m, linkedAt: now }, { products: sized })
      .linkedAt,
  );
  const [row] = stockTable([{ id: "i", name: "Mask", minStock: 2 }], []);
  assert.equal(row.empty, true);
  assert.equal(row.low, false);
});

test("sizes keep their own stock, holds and counts", () => {
  const sized = { ...suit, availability: "stock", sizes: ["M", "L"] };
  const sizedData = {
    products: [sized],
    items: [
      item("item:0000000000m1", { productId: "demo-suit", size: "M" }),
      item("item:0000000000l1", { productId: "demo-suit", size: "L" }),
    ],
    movements: [move("item:0000000000m1", "in", 2)],
    bookings: [
      booking("b9", [
        { product: "demo-suit", size: "M", mode: "rental", quantity: 1 },
      ]),
    ],
  };
  assert.deepEqual(publicStock(sizedData, "2026-10-16"), {
    "demo-suit": {
      sale: 1,
      rental: 2,
      sizes: { M: { sale: 1, rental: 2 }, L: { sale: 0, rental: 0 } },
    },
  });
  const order = (size, quantity) => ({
    startDate: "2026-10-21",
    endDate: "2026-10-21",
    lines: [{ product: "demo-suit", size, mode: "rental", quantity }],
  });
  assert.equal(stockShortfall(sizedData, order("M", 1), "2026-10-16"), null);
  const short = stockShortfall(sizedData, order("M", 2), "2026-10-16");
  assert.deepEqual([short.size, short.left], ["M", 1]);
  const message = shortfallMessage(short);
  assert.equal(
    message,
    "Stok Wetsuit 3 mm ukuran M tinggal 1 untuk tanggal itu. Kurangi jumlahnya atau pilih tanggal lain.",
  );
  assert.equal(
    bookingErrorMessage(message, "en"),
    "Only 1 left of Wetsuit 3 mm size M for those dates. Choose fewer or other dates.",
  );
  const none = shortfallMessage(
    stockShortfall(sizedData, order("L", 1), "2026-10-16"),
  );
  assert.equal(
    bookingErrorMessage(none, "en"),
    "Wetsuit 3 mm size L is out of stock. Remove it from your order or chat with our team on WhatsApp.",
  );
  // Counts typed in the Dive Shop editor travel with the catalog and
  // become stock opname movements to that count.
  const sent = {
    shop: {
      products: [
        { id: "demo-suit", stockCounts: { M: "5", L: 0, XL: 3 } },
        { id: "demo-mask", stockCounts: { "": "" } },
      ],
    },
  };
  const counts = shopStockCounts(sent, [sized, mask]);
  assert.deepEqual(counts, [
    { productId: "demo-suit", size: "M", count: 5 },
    { productId: "demo-suit", size: "L", count: 0 },
  ]);
  assert.deepEqual(countMovements(counts, sizedData, "2026-10-16"), [
    {
      date: "2026-10-16",
      itemId: "item:0000000000m1",
      kind: "adjust",
      qty: 3,
      reason: "opname",
      note: "Diatur dari Dive Shop",
    },
  ]);
  assert.deepEqual(
    shopStockCounts(
      { shop: { products: [{ id: "demo-mask", stockCounts: { "": -1 } }] } },
      [mask],
    ),
    [],
  );
  // A paid size leaves its own item.
  const paid = booking("p", [
    { product: "demo-suit", size: "M", mode: "sale", quantity: 1 },
  ]);
  assert.equal(
    saleMovements(paid, sizedData, "2026-10-16")[0].itemId,
    "item:0000000000m1",
  );
});
