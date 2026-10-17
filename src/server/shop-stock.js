import "server-only";
import {
  getContent,
  listBookings,
  listRecords,
  saveRecord,
  deleteRecord,
  updateBooking,
} from "./store.js";
import { newId } from "./records.js";
import { BookingError, bookingDates } from "../booking-model.js";
import { stockOf } from "../inventory-model.js";
import { shiftDate } from "../fare-model.js";
import {
  modesOf,
  countMovements,
  gearLines,
  linkedItems,
  sizedName,
  sizesOf,
  variantKey,
  planShopItems,
  publicStock,
  recordedBookings,
  saleMovements,
  shortfallMessage,
  shopUse,
  stockShortfall,
  unrecordedSales,
} from "../shop-stock.js";

// The Dive Shop and the warehouse, on the server. Changes run one at a
// time, so two saves cannot make two items for one product and two orders
// cannot both take the last unit.
let tail = Promise.resolve();
export function withStockLock(work) {
  const task = tail.then(work);
  tail = task.catch(() => {});
  return task;
}

const shopProducts = async () =>
  (await getContent()).content.shop?.products ?? [];

// The catalog, for checking the product an item is linked to.
export const shopCatalog = async () => ({ products: await shopProducts() });

async function loadStock() {
  const [products, items, movements, bookings] = await Promise.all([
    shopProducts(),
    listRecords("item"),
    listRecords("movement"),
    listBookings(),
  ]);
  return { products, items, movements, bookings };
}

async function recordSales(booking, data, now) {
  const recorded = recordedBookings(data.movements);
  if (recorded.has(booking.id)) return 0;
  const date = bookingDates(new Date(booking.payment.paidAt || now)).today;
  const at = new Date(now).toISOString();
  const moves = saleMovements(booking, data, date);
  for (const move of moves) {
    const saved = {
      id: newId("mv"),
      ...move,
      createdAt: at,
      updatedAt: at,
      createdBy: "Website",
    };
    await saveRecord("movement", saved);
    data.movements.push(saved);
  }
  await updateBooking(booking.id, (current) =>
    current.payment
      ? {
          ...current,
          payment: { ...current.payment, stockRecorded: true },
        }
      : null,
  );
  return moves.length;
}

// Makes the warehouse match the Dive Shop: an item for every product and
// size, the stock counts typed in the Dive Shop editor, and the purchases
// of paid orders that are not movements yet. Returns how many items were
// made and movements recorded.
export function syncShopStock({ counts = [], now = Date.now() } = {}) {
  return withStockLock(async () => {
    const data = await loadStock();
    const at = new Date(now).toISOString();
    const plan = planShopItems(data.products, data.items, data.movements, at);
    for (const { id, changes } of plan.update) {
      const item = data.items.find((i) => i.id === id);
      await saveRecord("item", { ...item, ...changes, updatedAt: at });
    }
    for (const id of plan.remove) await deleteRecord("item", id);
    for (const record of plan.create)
      await saveRecord("item", {
        id: newId("item"),
        ...record,
        createdAt: at,
        updatedAt: at,
        createdBy: "Dive Shop",
      });
    let recorded = 0;
    const fresh = { ...data, items: await listRecords("item") };
    for (const move of countMovements(
      counts,
      fresh,
      bookingDates(new Date(now)).today,
    )) {
      const saved = {
        id: newId("mv"),
        ...move,
        createdAt: at,
        updatedAt: at,
        createdBy: "Dive Shop",
      };
      await saveRecord("movement", saved);
      fresh.movements.push(saved);
    }
    for (const booking of unrecordedSales(
      data.bookings,
      recordedBookings(data.movements),
    ))
      recorded += await recordSales(booking, fresh, now);
    return { created: plan.create.length, recorded };
  });
}

// A paid order's purchases leave the warehouse.
export function recordShopSales(booking, now = Date.now()) {
  if (
    booking?.payment?.status !== "paid" ||
    !(booking.payment.lines ?? []).some((l) => l.product && l.mode !== "rental")
  )
    return Promise.resolve(0);
  return withStockLock(async () => {
    const data = await loadStock();
    const current = data.bookings.find((b) => b.id === booking.id);
    if (!current || !unrecordedSales([current], new Set()).length) return 0;
    return recordSales(current, data, now);
  });
}

// Saves an order only when its Dive Shop gear is still in stock. "create"
// stores the booking; it runs inside the lock so the next order counts it.
export async function reserveShopStock(order, create, now = new Date()) {
  const products = await shopProducts();
  const follows = order.lines.some(
    (line) =>
      line.product &&
      products.find((p) => p.id === line.product)?.availability === "stock",
  );
  if (!follows) return create();
  return withStockLock(async () => {
    const data = await loadStock();
    const short = stockShortfall(data, order, bookingDates(now).today);
    if (short) throw new BookingError(shortfallMessage(short), 409);
    return create();
  });
}

export const fullOnDate =
  "Alat sewa pesanan ini sudah penuh dipesan pada tanggal itu. Pilih tanggal lain.";
// A guest moving a booking with rental gear (a Dive Shop rental, or an
// activity with gear as an add-on): the gear must be free on the new
// dates, counting every other order. "move" saves the new date inside the
// lock.
export async function guardShopMove(id, startDate, move, now = new Date()) {
  return withStockLock(async () => {
    const data = await loadStock();
    const booking = data.bookings.find((b) => b.id === id);
    const lines = (booking ? gearLines(booking) : []).filter(
      (line) => line.product && line.mode === "rental",
    );
    if (lines.length) {
      const days = Math.round(
        (Date.parse(booking.endDate) - Date.parse(booking.startDate)) /
          86400000,
      );
      const short = stockShortfall(
        { ...data, bookings: data.bookings.filter((b) => b.id !== id) },
        {
          startDate,
          endDate: shiftDate(startDate, Math.max(0, days)),
          lines,
        },
        bookingDates(now).today,
      );
      if (short) throw new BookingError(fullOnDate, 409);
    }
    return move();
  });
}

// Units for the public shop, or null when the stock cannot be read (the
// shop then shows the products as "ask for availability").
export async function publicShopStock(products, now = new Date()) {
  if (!products?.some((p) => p.availability === "stock")) return {};
  try {
    const data = await loadStock();
    return publicStock({ ...data, products }, bookingDates(now).today);
  } catch (error) {
    console.error(
      "Dive Shop stock unavailable:",
      error?.code || error?.message,
    );
    return null;
  }
}

// What the warehouse list and the Dive Shop editor show beside each item.
export async function shopStockUse(now = new Date()) {
  const data = await loadStock();
  return {
    use: shopUse(data, bookingDates(now).today),
    products: data.products.map((p) => ({
      id: p.id,
      name: p.name,
      sizes: p.sizes ?? [],
      modes: modesOf(p),
    })),
  };
}

// The rental gear for the reservation calendar and the booking form: each
// product for rent and size, with its rental stock and whether the website
// follows it. Bookings are not read here; the calendar has them.
export async function rentalGear() {
  const { products, items, movements } = await loadStock();
  const linked = linkedItems(items, products);
  return products
    .filter((p) => p.rentalEnabled)
    .flatMap((p) =>
      sizesOf(p).map((size) => {
        const key = variantKey(p.id, "rental", size);
        const item = linked.get(key);
        return {
          key,
          productId: p.id,
          size,
          name: sizedName(p, size),
          unit: item?.unit ?? "",
          stock:
            item && item.active !== false ? stockOf(movements, item.id) : 0,
          follows: p.availability === "stock",
        };
      }),
    );
}
