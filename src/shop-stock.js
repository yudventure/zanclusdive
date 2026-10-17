import { holdsPlaces, bookingReference } from "./booking-model.js";
import { stockOf } from "./inventory-model.js";

// Dive Shop and Gudang together. Every Dive Shop product has one item in
// the warehouse per size (item.productId and item.size; a product without
// sizes has one item). Its stock is what the shop can sell or rent out, and
// the team sets it in the Dive Shop editor or with Masuk and Keluar. A paid
// purchase becomes a "Penjualan" movement, and a rental holds units on its
// dates for as long as its booking holds its places, without movements, so
// a new date or a cancellation frees them by itself.

// The unit a new warehouse item gets for a product of this shop category.
export const shopUnits = { mask: "set", fins: "pasang", regulator: "set" };
export const unitForProduct = (product) => shopUnits[product.category] ?? "pcs";

// A product's sizes, or one variant without a size.
export const sizesOf = (product) =>
  Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : [""];
export const variantKey = (productId, size = "") =>
  size ? `${productId}::${size}` : productId;
const itemKey = (item) => variantKey(item.productId, item.size ?? "");
export const variantName = (product, size) =>
  String(size ? `${product.name} · ${size}` : product.name).slice(0, 80);

const nameKey = (name) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id");
const linkTime = (item) => item.linkedAt || item.createdAt || "";

// The warehouse item of each product and size: the one linked last, when
// the team moved the link from one item to another.
export function linkedItems(items, products) {
  const valid = new Set(
    products.flatMap((p) => sizesOf(p).map((size) => variantKey(p.id, size))),
  );
  const map = new Map();
  for (const item of items) {
    if (!item.productId) continue;
    const key = itemKey(item);
    if (!valid.has(key)) continue;
    const current = map.get(key);
    if (!current || linkTime(item) > linkTime(current)) map.set(key, item);
  }
  return map;
}

// What to change so that every product and size has exactly one warehouse
// item. A missing one takes an unlinked item of the same name, or a new
// one. An item whose product or size is gone, or a second item on one
// size, is unlinked, or removed when the warehouse made it and nothing was
// ever recorded on it.
export function planShopItems(products, items, movements, now) {
  const changes = new Map();
  const change = (item, patch) =>
    changes.set(item.id, { ...(changes.get(item.id) ?? {}), ...patch });
  let list = items.map((item) => ({ ...item }));
  const linked = linkedItems(list, products);
  const used = new Set(movements.map((m) => m.itemId));
  const remove = [];
  for (const item of list) {
    if (!item.productId || linked.get(itemKey(item)) === item) continue;
    item.productId = "";
    item.size = "";
    if (item.auto && !used.has(item.id)) remove.push(item.id);
    else change(item, { productId: "", size: "" });
  }
  list = list.filter((item) => !remove.includes(item.id));
  const create = [];
  for (const product of products)
    for (const size of sizesOf(product)) {
      const name = variantName(product, size);
      const item = linked.get(variantKey(product.id, size));
      // An item the warehouse made keeps the product's name until the
      // team gives it its own.
      if (item) {
        if (item.auto && item.name === item.shopName && name !== item.name)
          change(item, { name, shopName: name });
        continue;
      }
      const same = list.find(
        (i) =>
          !i.productId &&
          i.active !== false &&
          nameKey(i.name) === nameKey(name),
      );
      if (same) {
        same.productId = product.id;
        same.size = size;
        change(same, { productId: product.id, size, linkedAt: now });
        continue;
      }
      create.push({
        name,
        sku: "",
        category: "alat",
        unit: unitForProduct(product),
        minStock: 0,
        cost: 0,
        location: "",
        note: "",
        active: true,
        productId: product.id,
        size,
        linkedAt: now,
        auto: true,
        shopName: name,
      });
    }
  for (const id of remove) changes.delete(id);
  return {
    create,
    update: [...changes].map(([id, patch]) => ({ id, changes: patch })),
    remove,
  };
}

// Bookings whose purchases are already movements in the warehouse.
export const recordedBookings = (movements) =>
  new Set(movements.filter((m) => m.bookingId).map((m) => m.bookingId));

// Units each product and size's orders hold: purchases waiting for payment
// (or for their movement), and rentals by date. Orders hold as long as
// their booking holds its places: confirmed, or with an online payment
// open.
export function shopReservations(bookings, recorded = new Set()) {
  const held = {};
  for (const booking of bookings) {
    if (!holdsPlaces(booking)) continue;
    for (const line of booking.payment?.lines ?? []) {
      if (!line.product) continue;
      const entry = (held[variantKey(line.product, line.size)] ??= {
        sale: 0,
        rentals: [],
      });
      const qty = Number(line.quantity) || 0;
      if (line.mode === "rental")
        entry.rentals.push({
          from: booking.startDate,
          to: booking.endDate || booking.startDate,
          qty,
          bookingId: booking.id,
        });
      else if (!booking.payment.stockRecorded && !recorded.has(booking.id))
        entry.sale += qty;
    }
  }
  return held;
}

// Units on rental on one day.
export const rentedOn = (held, day) =>
  (held?.rentals ?? [])
    .filter((r) => r.from <= day && r.to >= day)
    .reduce((sum, r) => sum + r.qty, 0);

// The units free on every day from..to: the stock less the purchases held
// and the busiest day of rentals. Without "to", every rental from "from"
// on counts, which is what a purchase needs: a sold unit never comes back.
export function freeUnits(stock, held, from, to) {
  const rentals = held?.rentals ?? [];
  const end =
    to ?? rentals.reduce((last, r) => (r.to > last ? r.to : last), from);
  const days = [
    from,
    ...rentals.map((r) => r.from).filter((day) => day > from && day <= end),
  ];
  const busiest = Math.max(0, ...days.map((day) => rentedOn(held, day)));
  return stock - (held?.sale ?? 0) - busiest;
}

// Everything the stock views need, from the stored records.
export function stockState({ products, items, movements, bookings }) {
  const recorded = recordedBookings(movements);
  return {
    linked: linkedItems(items, products),
    held: shopReservations(bookings, recorded),
    recorded,
  };
}

// What the public shop knows of products that follow the warehouse: the
// units a guest can buy now, and the units that can be rented (the dates
// are checked when paying), per size and for the product. No bookings or
// names leave the server.
export function publicStock(data, today) {
  const { linked, held } = stockState(data);
  const out = {};
  for (const product of data.products) {
    if (product.availability !== "stock") continue;
    const sizes = {};
    for (const size of sizesOf(product)) {
      const key = variantKey(product.id, size);
      const item = linked.get(key);
      if (!item || item.active === false) {
        sizes[size] = { sale: 0, rental: 0 };
        continue;
      }
      const stock = stockOf(data.movements, item.id);
      sizes[size] = {
        sale: Math.max(0, freeUnits(stock, held[key], today)),
        rental: Math.max(0, stock - (held[key]?.sale ?? 0)),
      };
    }
    const all = Object.values(sizes);
    const sum = (mode) => all.reduce((total, s) => total + s[mode], 0);
    out[product.id] = {
      sale: sum("sale"),
      rental: sum("rental"),
      ...(sizesOf(product)[0] ? { sizes } : {}),
    };
  }
  return out;
}

// For the warehouse list and the Dive Shop editor: per linked item, the
// product and size, the units out on rental today, booked for later dates,
// and purchases waiting for payment.
export function shopUse(data, today) {
  const { linked, held } = stockState(data);
  const use = {};
  for (const product of data.products)
    for (const size of sizesOf(product)) {
      const key = variantKey(product.id, size);
      const item = linked.get(key);
      if (!item) continue;
      const mine = held[key];
      use[item.id] = {
        productId: product.id,
        size,
        productName: product.name,
        availability: product.availability,
        shown: product.enabled === true,
        rentedToday: rentedOn(mine, today),
        bookedLater: (mine?.rentals ?? [])
          .filter((r) => r.from > today)
          .reduce((sum, r) => sum + r.qty, 0),
        waiting: mine?.sale ?? 0,
      };
    }
  return use;
}

// The name of a product and size in messages.
export const sizedName = (product, size) =>
  size ? `${product.name} ukuran ${size}` : product.name;

// An order's Dive Shop lines against the warehouse, for products that
// follow it. Returns the first line that does not fit, with the units
// left, or null.
export function stockShortfall(data, order, today) {
  const { linked, held } = stockState(data);
  const wanted = new Map();
  for (const line of order.lines) {
    if (!line.product) continue;
    const key = variantKey(line.product, line.size);
    const entry = wanted.get(key) ?? {
      productId: line.product,
      size: line.size ?? "",
      sale: 0,
      rental: 0,
    };
    entry[line.mode === "rental" ? "rental" : "sale"] += line.quantity;
    wanted.set(key, entry);
  }
  for (const [key, { productId, size, sale, rental }] of wanted) {
    const product = data.products.find((p) => p.id === productId);
    if (product?.availability !== "stock") continue;
    const item = linked.get(key);
    const stock =
      item && item.active !== false ? stockOf(data.movements, item.id) : 0;
    const mine = held[key] ?? { sale: 0, rentals: [] };
    const rentalHeld = rental
      ? {
          ...mine,
          rentals: [
            ...mine.rentals,
            { from: order.startDate, to: order.endDate, qty: rental },
          ],
        }
      : mine;
    if (sale) {
      const left = freeUnits(stock, rentalHeld, today);
      if (left < sale)
        return { product, size, mode: "sale", left: Math.max(0, left) };
    }
    if (rental) {
      const left = freeUnits(
        stock,
        { ...mine, sale: mine.sale + sale },
        order.startDate,
        order.endDate,
      );
      if (left < rental)
        return { product, size, mode: "rental", left: Math.max(0, left) };
    }
  }
  return null;
}

// The words for a shortfall; the payment route translates them.
export function shortfallMessage({ product, size, mode, left }) {
  const name = sizedName(product, size);
  if (left <= 0)
    return `${name} sedang habis. Hapus dari pesanan atau chat tim kami lewat WhatsApp.`;
  return mode === "rental"
    ? `Stok ${name} tinggal ${left} untuk tanggal itu. Kurangi jumlahnya atau pilih tanggal lain.`
    : `Stok ${name} tinggal ${left}. Kurangi jumlahnya.`;
}

// The movements a paid order's purchases make in the warehouse, dated the
// day it was paid.
export function saleMovements(booking, data, date) {
  const { linked } = stockState({ ...data, bookings: [] });
  const out = [];
  for (const line of booking.payment?.lines ?? []) {
    if (!line.product || line.mode === "rental") continue;
    const item = linked.get(variantKey(line.product, line.size));
    if (!item) continue;
    const same = out.find((m) => m.itemId === item.id);
    if (same) same.qty += Number(line.quantity) || 0;
    else
      out.push({
        date,
        itemId: item.id,
        kind: "out",
        qty: Number(line.quantity) || 0,
        reason: "jual",
        note: `Pesanan online ${bookingReference(booking.id)}`,
        bookingId: booking.id,
      });
  }
  return out.filter((m) => m.qty > 0);
}

// Paid orders whose purchases are not in the warehouse yet.
export const unrecordedSales = (bookings, recorded) =>
  bookings.filter(
    (b) =>
      b.payment?.status === "paid" &&
      holdsPlaces(b) &&
      !b.payment.stockRecorded &&
      !recorded.has(b.id) &&
      (b.payment.lines ?? []).some((l) => l.product && l.mode !== "rental"),
  );

// Stock counts typed in the Dive Shop editor, as stock opname movements
// that bring each item to its count.
export function countMovements(counts, data, date) {
  const { linked } = stockState({ ...data, bookings: [] });
  const out = [];
  for (const { productId, size, count } of counts) {
    const item = linked.get(variantKey(productId, size));
    if (!item) continue;
    const qty = count - stockOf(data.movements, item.id);
    if (qty)
      out.push({
        date,
        itemId: item.id,
        kind: "adjust",
        qty,
        reason: "opname",
        note: "Diatur dari Dive Shop",
      });
  }
  return out;
}

// The counts the Dive Shop editor sends with the catalog, as
// "stockCounts" on a product: { size: count }, "" for a product without
// sizes. The catalog itself does not keep them; the sizes are the saved
// product's.
export function shopStockCounts(sent, products) {
  const raw = new Map(
    (Array.isArray(sent?.shop?.products) ? sent.shop.products : []).map((p) => [
      p?.id,
      p?.stockCounts,
    ]),
  );
  const out = [];
  for (const product of products) {
    const counts = raw.get(product.id);
    if (!counts || typeof counts !== "object" || Array.isArray(counts))
      continue;
    for (const size of sizesOf(product)) {
      if (!Object.hasOwn(counts, size) || counts[size] === "") continue;
      const count = Number(counts[size]);
      if (Number.isInteger(count) && count >= 0 && count <= 100000)
        out.push({ productId: product.id, size, count });
    }
  }
  return out;
}
