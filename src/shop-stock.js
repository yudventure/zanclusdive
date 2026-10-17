import { holdsPlaces, bookingReference } from "./booking-model.js";
import { stockOf } from "./inventory-model.js";

// Dive Shop and Gudang together. Gear for sale and gear for rent are kept
// apart: every Dive Shop product has one item in the warehouse for each
// way it is offered and each size (item.productId, item.mode "sale" or
// "rental", and item.size; a product without sizes has one item per way).
// Its stock is what the shop can sell, or rent out, and the team sets it
// in the Dive Shop editor or with Masuk and Keluar. A paid purchase becomes
// a "Penjualan" movement on the sale item, and a rental holds units of the
// rental item on its dates for as long as its booking holds its places,
// without movements, so a new date or a cancellation frees them by itself.

// The unit a new warehouse item gets for a product of this shop category.
export const shopUnits = { mask: "set", fins: "pasang", regulator: "set" };
export const unitForProduct = (product) => shopUnits[product.category] ?? "pcs";

// A product's sizes, or one variant without a size.
export const sizesOf = (product) =>
  Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : [""];
// The ways a product is offered: for sale, for rent, or both.
export const modesOf = (product) =>
  [product?.saleEnabled && "sale", product?.rentalEnabled && "rental"].filter(
    Boolean,
  );
export const modeNames = { sale: "Jual", rental: "Sewa" };
export const variantKey = (productId, mode, size = "") =>
  `${productId}::${mode}` + (size ? `::${size}` : "");
// Items linked before sale and rental were kept apart have no mode: they
// count for the sale stock, or the rental stock of gear only rented out.
const legacyMode = (product) => (product?.saleEnabled ? "sale" : "rental");
const modeOfItem = (item, products) =>
  item.mode ?? legacyMode(products.find((p) => p.id === item.productId));
const itemKey = (item, products) =>
  variantKey(item.productId, modeOfItem(item, products), item.size ?? "");
export const variantName = (product, mode, size) =>
  String(
    `${product.name} · ${modeNames[mode]}` + (size ? ` · ${size}` : ""),
  ).slice(0, 80);
// Every product, way and size that needs a warehouse item.
const variantsOf = (product) =>
  modesOf(product).flatMap((mode) =>
    sizesOf(product).map((size) => ({ mode, size })),
  );

const nameKey = (name) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id");
const linkTime = (item) => item.linkedAt || item.createdAt || "";

// The warehouse item of each product, way and size: the one linked last,
// when the team moved the link from one item to another.
export function linkedItems(items, products) {
  const valid = new Set(
    products.flatMap((p) =>
      variantsOf(p).map(({ mode, size }) => variantKey(p.id, mode, size)),
    ),
  );
  const map = new Map();
  for (const item of items) {
    if (!item.productId) continue;
    const key = itemKey(item, products);
    if (!valid.has(key)) continue;
    const current = map.get(key);
    if (!current || linkTime(item) > linkTime(current)) map.set(key, item);
  }
  return map;
}

// What to change so that every product, way and size has exactly one
// warehouse item. A missing one takes an unlinked item of the same name,
// or a new one. An item whose product, way or size is gone, or a second
// item on one of them, is unlinked, or removed when the warehouse made it
// and nothing was ever recorded on it. Items from before sale and rental
// were apart get their way written down.
export function planShopItems(products, items, movements, now) {
  const changes = new Map();
  const change = (item, patch) =>
    changes.set(item.id, { ...(changes.get(item.id) ?? {}), ...patch });
  let list = items.map((item) => ({ ...item }));
  const linked = linkedItems(list, products);
  const used = new Set(movements.map((m) => m.itemId));
  const remove = [];
  for (const item of list) {
    if (!item.productId) continue;
    if (linked.get(itemKey(item, products)) === item) {
      if (!item.mode) change(item, { mode: modeOfItem(item, products) });
      continue;
    }
    item.productId = "";
    item.size = "";
    item.mode = "";
    if (item.auto && !used.has(item.id)) remove.push(item.id);
    else change(item, { productId: "", size: "", mode: "" });
  }
  list = list.filter((item) => !remove.includes(item.id));
  const create = [];
  for (const product of products)
    for (const { mode, size } of variantsOf(product)) {
      const name = variantName(product, mode, size);
      const item = linked.get(variantKey(product.id, mode, size));
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
        same.mode = mode;
        same.size = size;
        change(same, { productId: product.id, mode, size, linkedAt: now });
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
        mode,
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

// Units each product, way and size's orders hold: purchases waiting for
// payment (or for their movement) on the sale stock, and rentals by date
// on the rental stock. Orders hold as long as their booking holds its
// places: confirmed, or with an online payment open.
export function shopReservations(bookings, recorded = new Set()) {
  const held = {};
  for (const booking of bookings) {
    if (!holdsPlaces(booking)) continue;
    for (const line of booking.payment?.lines ?? []) {
      if (!line.product) continue;
      const mode = line.mode === "rental" ? "rental" : "sale";
      const entry = (held[variantKey(line.product, mode, line.size)] ??= {
        sale: 0,
        rentals: [],
      });
      const qty = Number(line.quantity) || 0;
      if (mode === "rental")
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
// units of the sale stock a guest can buy now, and the units of the rental
// stock (the dates are checked when paying), per size and for the product.
// No bookings or names leave the server.
export function publicStock(data, today) {
  const { linked, held } = stockState(data);
  const out = {};
  const units = (product, mode, size) => {
    const item = linked.get(variantKey(product.id, mode, size));
    if (!item || item.active === false) return 0;
    const stock = stockOf(data.movements, item.id);
    return Math.max(
      0,
      mode === "sale"
        ? freeUnits(stock, held[variantKey(product.id, mode, size)], today)
        : stock,
    );
  };
  for (const product of data.products) {
    if (product.availability !== "stock") continue;
    const sizes = {};
    for (const size of sizesOf(product))
      sizes[size] = {
        sale: units(product, "sale", size),
        rental: units(product, "rental", size),
      };
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
// product, way and size, the units out on rental today, booked for later
// dates, and purchases waiting for payment.
export function shopUse(data, today) {
  const { linked, held } = stockState(data);
  const use = {};
  for (const product of data.products)
    for (const { mode, size } of variantsOf(product)) {
      const key = variantKey(product.id, mode, size);
      const item = linked.get(key);
      if (!item) continue;
      const mine = held[key];
      use[item.id] = {
        productId: product.id,
        mode,
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
    const mode = line.mode === "rental" ? "rental" : "sale";
    const key = variantKey(line.product, mode, line.size);
    const entry = wanted.get(key) ?? {
      productId: line.product,
      mode,
      size: line.size ?? "",
      quantity: 0,
    };
    entry.quantity += line.quantity;
    wanted.set(key, entry);
  }
  for (const [key, { productId, mode, size, quantity }] of wanted) {
    const product = data.products.find((p) => p.id === productId);
    if (product?.availability !== "stock") continue;
    const item = linked.get(key);
    const stock =
      item && item.active !== false ? stockOf(data.movements, item.id) : 0;
    const mine = held[key] ?? { sale: 0, rentals: [] };
    // Purchases take from the sale stock for good; rentals use the rental
    // stock on their dates.
    const left =
      mode === "sale"
        ? freeUnits(stock, mine, today)
        : freeUnits(stock, mine, order.startDate, order.endDate);
    if (left < quantity)
      return { product, size, mode, left: Math.max(0, left) };
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
    const item = linked.get(variantKey(line.product, "sale", line.size));
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
  for (const { productId, mode, size, count } of counts) {
    const item = linked.get(variantKey(productId, mode, size));
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
// "stockCounts" on a product: { sale: { size: count }, rental: { … } }, ""
// for a product without sizes. The catalog itself does not keep them; the
// ways and sizes are the saved product's.
export function shopStockCounts(sent, products) {
  const raw = new Map(
    (Array.isArray(sent?.shop?.products) ? sent.shop.products : []).map((p) => [
      p?.id,
      p?.stockCounts,
    ]),
  );
  const out = [];
  for (const product of products) {
    const all = raw.get(product.id);
    for (const { mode, size } of variantsOf(product)) {
      const counts = all?.[mode];
      if (!counts || typeof counts !== "object" || Array.isArray(counts))
        continue;
      if (!Object.hasOwn(counts, size) || counts[size] === "") continue;
      const count = Number(counts[size]);
      if (Number.isInteger(count) && count >= 0 && count <= 100000)
        out.push({ productId: product.id, mode, size, count });
    }
  }
  return out;
}
