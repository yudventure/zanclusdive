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
import { fareNames, orderFare } from "./fare-model.js";
import { deliveryChoice } from "./shop-model.js";

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
    // The fare's increase applies to the packages, not the add-ons.
    fareBase: lines
      .filter((line) => !line.addOn)
      .reduce((sum, line) => sum + line.price * line.quantity, 0),
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
    let name, price, key, rent, product, size;
    if (line.source === "product") {
      product = (content.shop?.products ?? []).find((p) => p.id === line.id);
      rent = line.mode === "rental";
      if (
        !product?.enabled ||
        product.availability === "unavailable" ||
        !["sale", "rental"].includes(line.mode) ||
        !product[rent ? "rentalEnabled" : "saleEnabled"] ||
        itemLocked(locks, "product", product.id)
      )
        fail("Ada alat yang belum tersedia. Muat ulang halaman.");
      // Gear with sizes is ordered in one of its sizes.
      size = typeof line.size === "string" ? line.size : "";
      if (product.sizes?.length ? !product.sizes.includes(size) : size)
        fail("Pilih ukuran untuk setiap alat sebelum membayar.", 400);
      name = both(product.name);
      price = product[rent ? "rentalPrice" : "salePrice"];
      key = `product-${product.id}-${line.mode}${size ? "-" + size : ""}`;
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
            `Sewa ${priceText(name, "id")}${size ? ` ukuran ${size}` : ""} (${days} hari)`,
            `Rent ${priceText(name, "en")}${size ? ` size ${size}` : ""} (${days} ${days === 1 ? "day" : "days"})`,
          )
        : both(
            `Beli ${priceText(name, "id")}${size ? ` ukuran ${size}` : ""}`,
            `Buy ${priceText(name, "en")}${size ? ` size ${size}` : ""}`,
          ),
      price: rent ? price * days : price,
      quantity,
      rent,
      // Dive Shop products are counted against the warehouse.
      ...(product
        ? { product: product.id, mode: line.mode, ...(size ? { size } : {}) }
        : {}),
    };
  });
  const sum = (list) =>
    list.reduce((total, line) => total + line.price * line.quantity, 0);
  // Picked up at the dive center, or delivered to a zone for its fee.
  let delivery;
  try {
    delivery = deliveryChoice(content.shop?.delivery, input.delivery, "id");
  } catch (error) {
    fail(error.message, 400);
  }
  const extras = delivery.fee
    ? [
        {
          id: `delivery-${delivery.zone.id}`.slice(0, 50),
          name: both(
            `Ongkos antar ${delivery.zone.name}`,
            `Delivery to ${delivery.zone.name}`,
          ),
          price: delivery.fee,
          quantity: 1,
          extra: true,
        },
      ]
    : [];
  return {
    program: "shop",
    startDate,
    endDate: rental ? addDays(startDate, days - 1) : startDate,
    participants: 1,
    lines: [...priced, ...extras],
    delivery: {
      method: delivery.method,
      zone: delivery.zone?.name ?? "",
      fee: delivery.fee,
      address: delivery.address,
    },
    // Rentals are booked for dates and take a fare; purchases do not.
    fareBase: sum(priced.filter((line) => line.rent)),
    purchases: sum(priced.filter((line) => !line.rent)),
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

// { program, startDate, endDate, participants, lines, amount, fare } for a
// pay request; window is { today, last } in WIT and locks the developer
// locks. Activity packages and rentals take the fare asked for (Standard
// when none): its increase is one more line, and its rules go with the
// order.
export function priceOrder(content, input, window, locks) {
  const price = kinds[input?.kind ?? "activity"];
  if (!price || locks?.site) fail("Data pembayaran tidak valid.", 400);
  const {
    fareBase = 0,
    purchases = 0,
    ...order
  } = price(content, input, window, locks);
  const total = (lines) =>
    lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  let fare = null;
  if (fareBase > 0) {
    fare = orderFare(content.fares, input.fare, {
      amount: total(order.lines),
      base: fareBase,
      purchases,
    });
    if (!fare)
      fail("Tarif yang dipilih sudah tidak tersedia. Muat ulang halaman.");
    if (fare.markup > 0)
      order.lines.push({
        id: `fare-${fare.tier}`,
        name: both(
          `Tarif ${fareNames[fare.tier]} (+${fare.percent}%)`,
          `${fareNames[fare.tier]} fare (+${fare.percent}%)`,
        ),
        price: fare.markup,
        quantity: 1,
        fare: true,
      });
  }
  const amount = total(order.lines);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e9)
    fail("Data pembayaran tidak valid.", 400);
  return { ...order, amount, fare };
}

// "Discovery Dive × 2" or "Beli Fins × 1, Sewa Wetsuit (2 hari) × 1"; the
// fare's increase and the delivery fee are named without a count.
export const orderLabel = (lines, locale) =>
  lines
    .map((line) =>
      line.fare || line.extra
        ? priceText(line.name, locale)
        : `${priceText(line.name, locale)} × ${line.quantity}`,
    )
    .join(", ")
    .slice(0, 300);
