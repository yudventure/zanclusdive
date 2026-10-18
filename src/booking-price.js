// Prices a reservation the team notes by hand from the website's own
// prices: the diving programs, the price list of each activity and its
// extra services, the courses, Dive Shop gear for rent and for sale, and
// gear servicing. A line keeps the name, price and unit it had when it was
// picked, so a later price change does not change a noted reservation.
import { priceGroups } from "./price-list.js";

export const packageLimit = 20;
export const amountLimit = 1e9;

const groupLabels = {
  experience: "Program diving",
  diving: "Diving",
  snorkeling: "Snorkeling",
  trip: "Trip laut",
  extras: "Layanan tambahan",
  course: "Kursus selam",
  rental: "Sewa alat Dive Shop",
  sale: "Barang Dive Shop",
  service: "Servis alat",
};
const text = (value) =>
  typeof value === "string" ? value : (value?.id ?? value?.en ?? "");
const priced = (price) => Number.isSafeInteger(price) && price > 0;

// [{ key, label, items: [{ key, name, price, unit }] }], only priced items.
export function bookingPriceGroups(content) {
  const list = content?.priceList ?? {};
  const groups = [];
  const add = (key, items) => {
    const kept = items.filter((item) => item.name && priced(item.price));
    if (kept.length) groups.push({ key, label: groupLabels[key], items: kept });
  };
  add(
    "experience",
    Object.entries(content?.experiences ?? {}).map(([id, e]) => ({
      key: "exp:" + id,
      name: text(e.title),
      price: e.price,
      unit: "/ orang",
    })),
  );
  for (const group of [...priceGroups, "extras"])
    add(
      group,
      (list[group] ?? []).map((e) => ({
        key: "price:" + e.id,
        name: text(e.name),
        price: e.price,
        unit: text(e.unit),
      })),
    );
  add(
    "course",
    (content?.courses?.items ?? []).map((c) => ({
      key: "course:" + c.id,
      name: text(c.name ?? c.title),
      price: c.price,
      unit: text(c.unit) || "/ orang",
    })),
  );
  const products = content?.shop?.products ?? [];
  add(
    "rental",
    products
      .filter((p) => p.rentalEnabled)
      .map((p) => ({
        key: "rent:" + p.id,
        name: text(p.name),
        price: p.rentalPrice,
        unit: "/ hari",
      })),
  );
  add(
    "sale",
    products
      .filter((p) => p.saleEnabled)
      .map((p) => ({
        key: "sale:" + p.id,
        name: text(p.name),
        price: p.salePrice,
        unit: "/ pcs",
      })),
  );
  add(
    "service",
    (content?.service?.items ?? []).map((s) => ({
      key: "service:" + s.id,
      name: text(s.name),
      price: s.price,
      unit: text(s.unit),
    })),
  );
  return groups;
}

// The group of a reservation's program comes first in the picker.
const programGroup = {
  beginner: "experience",
  explorer: "experience",
  specialty: "experience",
  diving: "diving",
  snorkeling: "snorkeling",
  trip: "trip",
  course: "course",
  shop: "rental",
  service: "service",
};
export function groupsFor(groups, experience) {
  const first = programGroup[experience];
  return [
    ...groups.filter((g) => g.key === first),
    ...groups.filter((g) => g.key !== first),
  ];
}

const daysOf = (startDate, endDate) => {
  const days = Math.round(
    (Date.parse(endDate) - Date.parse(startDate)) / 864e5,
  );
  return Number.isFinite(days) && days >= 0 ? days + 1 : 1;
};
// How many of a price the reservation takes: per person follows the
// participants, per day the days of the reservation, per night one less.
export function defaultQuantity(unit, { participants, startDate, endDate }) {
  const u = String(unit ?? "").toLowerCase();
  const people = Math.max(1, Math.min(1000, Number(participants) || 1));
  const days = daysOf(startDate, endDate);
  if (/orang|person|pax|peserta/.test(u)) return people;
  if (/malam|night/.test(u)) return Math.max(1, days - 1);
  if (/hari|day/.test(u)) return days;
  return 1;
}

export const packagesTotal = (lines = []) =>
  lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

// The lines sent by the admin form, checked and tidied.
export function validatePackages(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > packageLimit)
    throw new Error(`Paket maksimal ${packageLimit} baris.`);
  const lines = input.map((line) => {
    const key = line?.key;
    const name = typeof line?.name === "string" ? line.name.trim() : "";
    const unit = typeof line?.unit === "string" ? line.unit.trim() : "";
    const price = Number(line?.price);
    const quantity = Number(line?.quantity);
    if (
      typeof key !== "string" ||
      !/^[a-z]+:[A-Za-z0-9._-]{1,80}$/.test(key) ||
      !name ||
      name.length > 160 ||
      unit.length > 30 ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > amountLimit ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000
    )
      throw new Error("Paket tidak valid. Jumlah tiap paket 1–1000.");
    return { key, name, price, unit, quantity };
  });
  if (packagesTotal(lines) > amountLimit)
    throw new Error("Total paket melebihi Rp 1.000.000.000.");
  return lines;
}

// "Rp 1.500.000", "1.500.000" or "1500000" as typed, to 1500000.
export function parseRupiah(value) {
  const digits = String(value ?? "")
    .replace(/[.,]\d{1,2}$/, "")
    .replace(/\D/g, "")
    .slice(0, 10);
  return digits ? Number(digits) : 0;
}
export const formatRupiah = (amount) =>
  Number(amount) > 0 ? Number(amount).toLocaleString("id-ID") : "";
