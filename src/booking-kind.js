// Reservations and purchases. Diving, snorkeling, trips, courses, gear
// servicing and Dive Shop rentals are booked for a date and kept in the
// reservation calendar. A Dive Shop order that only buys goods has no
// schedule: the team only needs to know whether it is paid, and it is
// listed in Pembelian barang instead.
import { programTitle } from "./cms-model.js";

const text = (name) =>
  String(
    name && typeof name === "object"
      ? (name.id ?? name.en ?? "")
      : (name ?? ""),
  );
// Lines saved before products carried their way only say it in the name.
const rents = (line) =>
  line?.mode === "rental" ||
  (!line?.mode && /^(sewa|rent)\b/i.test(text(line?.name)));
const buys = (line) =>
  line?.mode === "sale" ||
  (!line?.mode && /^(beli|buy)\b/i.test(text(line?.name)));

export function isPurchase(booking) {
  if (booking?.experience !== "shop" || booking.gear?.length) return false;
  const lines = booking.payment?.lines;
  if (Array.isArray(lines) && lines.length)
    return lines.some(buys) && !lines.some(rents);
  const item = text(booking.payment?.item);
  return /^(beli|buy)\b/i.test(item) && !/\b(sewa|rent)\b/i.test(item);
}
export const isReservation = (booking) => !isPurchase(booking);

// The name of what was booked or bought, for the admin's lists.
export const bookingTitle = (content, booking) =>
  isPurchase(booking)
    ? "Pembelian barang"
    : programTitle(content, booking?.experience);

// Whether a purchase is paid, for its list and filters.
export const purchaseStates = {
  unpaid: "Belum dibayar",
  paid: "Sudah dibayar",
  expired: "Tidak dibayar",
  refunded: "Dikembalikan",
  cancelled: "Dibatalkan",
};
export function purchaseState(booking) {
  if (booking?.status === "cancelled") return "cancelled";
  const status = booking?.payment?.status;
  if (status === "paid") return "paid";
  if (status === "refunded") return "refunded";
  if (["expired", "failed"].includes(status)) return "expired";
  return "unpaid";
}

// The goods of a purchase, without the delivery fee: "2 × Masker X".
export function purchaseItems(booking) {
  const lines = booking?.payment?.lines;
  if (!Array.isArray(lines) || !lines.length)
    return booking?.payment?.item
      ? [text(booking.payment.item).replace(/^Beli\s+/i, "")]
      : [];
  return lines
    .filter((line) => !/^ongkos antar\b/i.test(text(line.name)))
    .map(
      (line) =>
        `${line.quantity > 1 ? `${line.quantity} × ` : ""}${text(line.name).replace(/^Beli\s+/i, "")}`,
    );
}

// Picked up or delivered, as written in the order's notes.
export function purchaseDelivery(booking) {
  const line = String(booking?.notes ?? "")
    .split("\n")
    .find((row) => /^(Diantar ke|Ambil sendiri)/.test(row.trim()));
  return line ? line.trim() : "";
}
