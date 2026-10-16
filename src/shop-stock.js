import { holdsPlaces, bookingReference } from "./booking-model.js";
import { stockOf } from "./inventory-model.js";

// Dive Shop and Gudang together. Every Dive Shop product has one item in
// the warehouse (item.productId); its stock is what the shop can sell or
// rent out. A paid purchase becomes a "Penjualan" movement, and a rental
// holds units on its dates for as long as its booking holds its places,
// without movements, so a new date or a cancellation frees them by itself.

// The unit a new warehouse item gets for a product of this shop category.
export const shopUnits = { mask: "set", fins: "pasang", regulator: "set" };
export const unitForProduct = (product) => shopUnits[product.category] ?? "pcs";

const nameKey = (name) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id");
const linkTime = (item) => item.linkedAt || item.createdAt || "";

// The warehouse item of each product: the one linked last, when the team
// moved the link from one item to another.
export function linkedItems(items, products) {
  const ids = new Set(products.map((p) => p.id));
  const map = new Map();
  for (const item of items) {
    if (!item.productId || !ids.has(item.productId)) continue;
    const current = map.get(item.productId);
    if (!current || linkTime(item) > linkTime(current))
      map.set(item.productId, item);
  }
  return map;
}

// What to change so that every product has exactly one warehouse item.
// Links chosen in the Dive Shop editor ({productId, itemId}) come first.
// A product without an item takes an unlinked item of the same name, or a
// new one. A link to a product that is gone is cleared, and a second item
// on one product is unlinked, or removed when the warehouse made it and
// nothing was ever recorded on it.
export function planShopItems(products, items, movements, links = [], now) {
  const changes = new Map();
  const change = (item, patch) =>
    changes.set(item.id, { ...(changes.get(item.id) ?? {}), ...patch });
  let list = items.map((item) => ({ ...item }));
  const productIds = new Set(products.map((p) => p.id));
  for (const { productId, itemId } of links) {
    const item = list.find((i) => i.id === itemId);
    if (!item || !productIds.has(productId) || item.productId === productId)
      continue;
    item.productId = productId;
    item.linkedAt = now;
    change(item, { productId, linkedAt: now });
  }
  const linked = linkedItems(list, products);
  const used = new Set(movements.map((m) => m.itemId));
  const remove = [];
  for (const item of list) {
    if (!item.productId) continue;
    if (!productIds.has(item.productId)) {
      item.productId = "";
      change(item, { productId: "" });
    } else if (linked.get(item.productId) !== item) {
      item.productId = "";
      if (item.auto && !used.has(item.id)) remove.push(item.id);
      else change(item, { productId: "" });
    }
  }
  list = list.filter((item) => !remove.includes(item.id));
  // An item the warehouse made keeps the product's name until the team
  // gives it its own.
  for (const product of products) {
    const item = linked.get(product.id);
    const name = String(product.name).slice(0, 80);
    if (item?.auto && item.name === item.shopName && name !== item.name)
      change(item, { name, shopName: name });
  }
  const create = [];
  for (const product of products) {
    if (linked.has(product.id)) continue;
    const same = list.find(
      (item) =>
        !item.productId &&
        item.active !== false &&
        nameKey(item.name) === nameKey(product.name),
    );
    if (same) {
      same.productId = product.id;
      change(same, { productId: product.id, linkedAt: now });
      continue;
    }
    create.push({
      name: String(product.name).slice(0, 80),
      sku: "",
      category: "alat",
      unit: unitForProduct(product),
      minStock: 0,
      cost: 0,
      location: "",
      note: "",
      active: true,
      productId: product.id,
      linkedAt: now,
      auto: true,
      shopName: String(product.name).slice(0, 80),
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

// Units each product's orders hold: purchases waiting for payment (or for
// their movement), and rentals by date. Orders hold as long as their
// booking holds its places: confirmed, or with an online payment open.
export function shopReservations(bookings, recorded = new Set()) {
  const held = {};
  for (const booking of bookings) {
    if (!holdsPlaces(booking)) continue;
    for (const line of booking.payment?.lines ?? []) {
      if (!line.product) continue;
      const entry = (held[line.product] ??= { sale: 0, rentals: [] });
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
// are checked when paying). No bookings or names leave the server.
export function publicStock(data, today) {
  const { linked, held } = stockState(data);
  const out = {};
  for (const product of data.products) {
    if (product.availability !== "stock") continue;
    const item = linked.get(product.id);
    if (!item || item.active === false) {
      out[product.id] = { sale: 0, rental: 0 };
      continue;
    }
    const stock = stockOf(data.movements, item.id);
    const mine = held[product.id];
    out[product.id] = {
      sale: Math.max(0, freeUnits(stock, mine, today)),
      rental: Math.max(0, stock - (mine?.sale ?? 0)),
    };
  }
  return out;
}

// For the warehouse list and the Dive Shop editor: per linked item, the
// product, the units out on rental today, booked for later dates, and
// purchases waiting for payment.
export function shopUse(data, today) {
  const { linked, held } = stockState(data);
  const use = {};
  for (const product of data.products) {
    const item = linked.get(product.id);
    if (!item) continue;
    const mine = held[product.id];
    use[item.id] = {
      productId: product.id,
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

// An order's Dive Shop lines against the warehouse, for products that
// follow it. Returns the first line that does not fit, with the units
// left, or null.
export function stockShortfall(data, order, today) {
  const { linked, held } = stockState(data);
  const wanted = new Map();
  for (const line of order.lines) {
    if (!line.product) continue;
    const entry = wanted.get(line.product) ?? { sale: 0, rental: 0 };
    entry[line.mode === "rental" ? "rental" : "sale"] += line.quantity;
    wanted.set(line.product, entry);
  }
  for (const [productId, { sale, rental }] of wanted) {
    const product = data.products.find((p) => p.id === productId);
    if (product?.availability !== "stock") continue;
    const item = linked.get(productId);
    const stock =
      item && item.active !== false ? stockOf(data.movements, item.id) : 0;
    const mine = held[productId] ?? { sale: 0, rentals: [] };
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
        return { product, mode: "sale", left: Math.max(0, left) };
    }
    if (rental) {
      const left = freeUnits(
        stock,
        { ...mine, sale: mine.sale + sale },
        order.startDate,
        order.endDate,
      );
      if (left < rental)
        return { product, mode: "rental", left: Math.max(0, left) };
    }
  }
  return null;
}

// The words for a shortfall; the payment route translates them.
export function shortfallMessage({ product, mode, left }) {
  if (left <= 0)
    return `${product.name} sedang habis. Hapus dari pesanan atau chat tim kami lewat WhatsApp.`;
  return mode === "rental"
    ? `Stok ${product.name} tinggal ${left} untuk tanggal itu. Kurangi jumlahnya atau pilih tanggal lain.`
    : `Stok ${product.name} tinggal ${left}. Kurangi jumlahnya.`;
}

// The movements a paid order's purchases make in the warehouse, dated the
// day it was paid.
export function saleMovements(booking, data, date) {
  const { linked } = stockState({ ...data, bookings: [] });
  const out = [];
  for (const line of booking.payment?.lines ?? []) {
    if (!line.product || line.mode === "rental") continue;
    const item = linked.get(line.product);
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
