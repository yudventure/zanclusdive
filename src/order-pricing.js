// Every online payment is priced here from the CMS content, never from the
// browser: activity packages, Dive Shop purchases and rentals, dive
// courses and gear servicing. The result is the booking it becomes and the
// lines sent to Midtrans.
import {
  payableItems,
  paymentActivities,
  quantityLimit,
} from "./payment-model.js";
import { addOnItems, priceText, rentalGroups } from "./price-list.js";
import { itemLocked, pageLocked } from "./developer.js";

export class PricingError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => {
  throw new PricingError(message, status);
};
const day = 86400000;
const addDays = (date, n) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * day)
    .toISOString()
    .slice(0, 10);
const both = (id, en = id) => ({ id, en });
const whole = (value, min, max) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
function checkDate(date, { today, last }) {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < today ||
    date > last
  )
    fail("Pilih tanggal mulai hari ini hingga satu tahun ke depan (WIT).", 400);
  return date;
}

// Packages from the activity's price list, chosen like a cart: one or more
// lines { item, itemName, quantity } (or the single item of earlier pages),
// with add-ons from the other lists as { addOn, itemName, quantity }. An
// add-on comes with at least one package.
function activityOrder(content, input, window, locks) {
  const activity = input.activity;
  if (
    !paymentActivities.includes(activity) ||
    !content.activities?.[activity]?.enabled ||
    pageLocked(locks, activity)
  )
    fail("Aktivitas ini belum bisa dibayar online.");
  const chosen = Array.isArray(input.lines)
    ? input.lines
    : [
        {
          item: input.item,
          itemName: input.itemName,
          quantity: input.quantity,
        },
      ];
  const packages = payableItems(content.priceList, activity);
  const addOns = addOnItems(content.priceList, activity);
  if (!chosen.length || chosen.length > packages.length + addOns.length)
    fail("Pilih minimal satu paket dari daftar harga.", 400);
  const participants = whole(input.participants, 1, quantityLimit);
  if (!participants) fail("Jumlah paket dan peserta harus 1–30.", 400);
  const seen = new Set();
  const lines = chosen.map((line) => {
    const addOn = line?.addOn !== undefined;
    const item = addOn
      ? addOns.find((entry) => entry.id === line.addOn)
      : packages.find((entry) => entry.index === Number(line?.item));
    if (!item || priceText(item.name, "id") !== line.itemName)
      fail("Daftar harga baru saja diperbarui. Muat ulang halaman.");
    const id = addOn ? `addon-${item.id}` : `${activity}-${item.index}`;
    if (seen.has(id)) fail("Pilih minimal satu paket dari daftar harga.", 400);
    seen.add(id);
    const quantity = whole(line.quantity, 1, quantityLimit);
    if (!quantity) fail("Jumlah paket dan peserta harus 1–30.", 400);
    return {
      id,
      name: item.name,
      unit: item.unit,
      price: item.price,
      quantity,
      addOn,
    };
  });
  if (lines.every((line) => line.addOn))
    fail("Add-on dipesan bersama minimal satu paket utama.", 400);
  const date = checkDate(input.date, window);
  return {
    program: activity,
    startDate: date,
    endDate: date,
    participants,
    lines,
  };
}

// Homepage cart lines are a product to buy or a rental from the price list;
// the Dive Shop page sells and rents its products.
function shopOrder(content, input, window, locks) {
  const lines = input.lines;
  if (!Array.isArray(lines) || !lines.length || lines.length > 40)
    fail("Pilih alat terlebih dahulu.", 400);
  const rental = lines.some(
    (line) => line?.source === "price" || line?.mode === "rental",
  );
  const days = rental ? whole(input.days, 1, 30) : 1;
  if (!days) fail("Lama sewa harus 1–30 hari.", 400);
  const startDate = rental ? checkDate(input.startDate, window) : window.today;
  const seen = new Set();
  const priced = lines.map((line) => {
    const quantity = whole(line?.quantity, 1, 10);
    if (!quantity) fail("Jumlah setiap alat harus 1–10.", 400);
    let name, price, key, rent;
    if (line.source === "product") {
      const product = (content.shop?.products ?? []).find(
        (p) => p.id === line.id,
      );
      rent = line.mode === "rental";
      if (
        !product?.enabled ||
        product.availability === "unavailable" ||
        !["sale", "rental"].includes(line.mode) ||
        !product[rent ? "rentalEnabled" : "saleEnabled"] ||
        itemLocked(locks, "product", product.id)
      )
        fail("Ada alat yang belum tersedia. Muat ulang halaman.");
      name = both(product.name);
      price = product[rent ? "rentalPrice" : "salePrice"];
      key = `product-${product.id}-${line.mode}`;
    } else if (line.source === "price") {
      const item = rentalGroups.includes(line.group)
        ? content.priceList?.[line.group]?.[Number(line.index)]
        : null;
      if (!item || priceText(item.name, "id") !== line.name)
        fail("Daftar harga baru saja diperbarui. Muat ulang halaman.");
      rent = true;
      name = item.name;
      price = item.price;
      key = `rent-${line.group}-${Number(line.index)}`;
    } else fail("Pilih alat terlebih dahulu.", 400);
    if (seen.has(key)) fail("Pilih alat terlebih dahulu.", 400);
    seen.add(key);
    if (!Number.isSafeInteger(price) || price <= 0)
      fail(
        "Ada alat yang harganya dikonfirmasi tim. Kirim pesanan lewat WhatsApp.",
      );
    return {
      id: key,
      name: rent
        ? both(
            `Sewa ${priceText(name, "id")} (${days} hari)`,
            `Rent ${priceText(name, "en")} (${days} ${days === 1 ? "day" : "days"})`,
          )
        : both(`Beli ${priceText(name, "id")}`, `Buy ${priceText(name, "en")}`),
      price: rent ? price * days : price,
      quantity,
    };
  });
  return {
    program: "shop",
    startDate,
    endDate: rental ? addDays(startDate, days - 1) : startDate,
    participants: 1,
    lines: priced,
  };
}

function courseOrder(content, input, window, locks) {
  const course = (content.courses?.items ?? []).find(
    (c) => c.id === input.course && c.enabled,
  );
  if (!course || pageLocked(locks, "course"))
    fail("Kursus ini belum bisa dibayar online.");
  const participants = whole(input.participants, 1, 20);
  if (!participants) fail("Jumlah peserta kursus harus 1–20.", 400);
  const date = checkDate(input.date, window);
  return {
    program: "course",
    startDate: date,
    endDate: date,
    participants,
    lines: [
      {
        id: `course-${course.id}`,
        name: course.name,
        unit: course.unit,
        price: course.price,
        quantity: participants,
      },
    ],
  };
}

function serviceOrder(content, input, window, locks) {
  const ids = input.services;
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 12 ||
    new Set(ids).size !== ids.length
  )
    fail("Pilih servis terlebih dahulu.", 400);
  if (pageLocked(locks, "service"))
    fail("Servis ini belum bisa dibayar online.");
  const lines = ids.map((id) => {
    const item = (content.service?.items ?? []).find(
      (s) => s.id === id && s.enabled,
    );
    if (!item || itemLocked(locks, "service", id))
      fail("Servis ini belum bisa dibayar online.");
    return {
      id: `service-${item.id}`,
      name: item.name,
      unit: item.unit,
      price: item.price,
      quantity: 1,
    };
  });
  const date = checkDate(input.date, window);
  return {
    program: "service",
    startDate: date,
    endDate: date,
    participants: 1,
    lines,
  };
}

const kinds = {
  activity: activityOrder,
  shop: shopOrder,
  course: courseOrder,
  service: serviceOrder,
};

// { program, startDate, endDate, participants, lines, amount } for a pay
// request; window is { today, last } in WIT and locks the developer locks.
export function priceOrder(content, input, window, locks) {
  const price = kinds[input?.kind ?? "activity"];
  if (!price || locks?.site) fail("Data pembayaran tidak valid.", 400);
  const order = price(content, input, window, locks);
  const amount = order.lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e9)
    fail("Data pembayaran tidak valid.", 400);
  return { ...order, amount };
}

// "Discovery Dive × 2" or "Beli Fins × 1, Sewa Wetsuit (2 hari) × 1".
export const orderLabel = (lines, locale) =>
  lines
    .map((line) => `${priceText(line.name, locale)} × ${line.quantity}`)
    .join(", ")
    .slice(0, 300);
