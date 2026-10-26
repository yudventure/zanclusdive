import "server-only";
import { timingSafeEqual } from "node:crypto";
import {
  BookingError,
  bookingDates,
  bookingErrorMessage,
  bookingReference,
} from "../booking-model.js";
import { fareActions, shiftDate } from "../fare-model.js";
import { changeOwnBooking, listBookings } from "./store.js";
import { later, autoMail } from "./booking-mail.js";
import { guardShopMove } from "./shop-stock.js";

// A guest's own page for a paid booking: the link in the invoice email and
// on the payment result carries a key made when the booking was ordered.
// With a Comfort or Flexi fare the guest moves the date there, and with
// Flexi cancels for a refund, within the days the fare allows.

export class GuestError extends Error {
  constructor(id, en, status = 409) {
    super(id);
    this.en = en;
    this.status = status;
  }
}
export const guestMessage = (error, locale) =>
  error instanceof GuestError
    ? locale === "en"
      ? error.en
      : error.message
    : bookingErrorMessage(error.message, locale);

const sameKey = (a, b) => {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  return left.length === right.length && timingSafeEqual(left, right);
};
export const ownsBooking = (booking, token) =>
  Boolean(booking?.payment?.manageToken) &&
  typeof token === "string" &&
  sameKey(booking.payment.manageToken, token);

// The booking for its page, or null when the key does not match.
export async function findOwnBooking(id, token) {
  if (typeof id !== "string" || typeof token !== "string") return null;
  const booking = (await listBookings()).find((b) => b.id === id);
  return ownsBooking(booking, token) ? booking : null;
}

// What the guest's page shows: no internal notes, no other bookings.
export function bookingView(booking, today) {
  const payment = booking.payment ?? {};
  return {
    id: booking.id,
    reference: bookingReference(booking.id),
    experience: booking.experience,
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    participants: booking.participants,
    guestName: booking.guestName,
    paymentStatus: payment.status ?? "",
    amount: payment.amount ?? booking.amount ?? 0,
    lines: payment.lines ?? [],
    item: payment.item ?? "",
    itemEn: payment.itemEn ?? "",
    fare: payment.fare ?? null,
    refund: payment.refund ?? null,
    reschedules: (booking.reschedules ?? []).map(({ from, to, at, by }) => ({
      from,
      to,
      at,
      by,
    })),
    actions: fareActions(booking, today),
    today,
  };
}

const validDate = (date) =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date;

// Moves the date or cancels for a refund, with the fare's rules checked
// again inside the store lock (and the daily places for a new date).
// Returns the new view; the guest gets an email about it.
export async function changeAsGuest(id, input, now = new Date()) {
  const { today, last } = bookingDates(now);
  const action = input?.action;
  if (!["reschedule", "refund"].includes(action))
    throw new GuestError("Permintaan tidak dikenal.", "Unknown request.", 400);
  if (action === "reschedule") {
    const date = input.date;
    if (!validDate(date) || date <= today || date > last)
      throw new GuestError(
        "Pilih tanggal baru mulai besok hingga satu tahun ke depan.",
        "Choose a new date from tomorrow up to one year ahead.",
        400,
      );
  }
  const at = now.toISOString();
  const change = () =>
    changeOwnBooking(id, (current) => {
      if (!ownsBooking(current, input.t))
        throw new GuestError(
          "Link pesanan ini tidak berlaku.",
          "This booking link is not valid.",
          404,
        );
      const can = fareActions(current, today);
      if (action === "reschedule") {
        if (!can.canReschedule)
          throw new GuestError(
            "Tanggal pesanan ini sudah tidak bisa diganti sendiri. Hubungi tim kami lewat WhatsApp.",
            "The date of this booking can no longer be changed here. Please contact our team on WhatsApp.",
          );
        if (input.date === current.startDate)
          throw new GuestError(
            "Pilih tanggal yang berbeda dari tanggal sekarang.",
            "Choose a date other than the current one.",
            400,
          );
        const length = Math.round(
          (Date.parse(current.endDate) - Date.parse(current.startDate)) /
            86400000,
        );
        return {
          ...current,
          startDate: input.date,
          endDate: shiftDate(input.date, Math.max(0, length)),
          reschedules: [
            ...(current.reschedules ?? []),
            { from: current.startDate, to: input.date, at, by: "guest" },
          ].slice(-10),
        };
      }
      if (!can.canRefund)
        throw new GuestError(
          "Pesanan ini sudah tidak bisa dibatalkan dengan refund. Hubungi tim kami lewat WhatsApp.",
          "This booking can no longer be cancelled for a refund. Please contact our team on WhatsApp.",
        );
      return {
        ...current,
        status: "cancelled",
        payment: {
          ...current.payment,
          refund: {
            status: "requested",
            amount: can.refundAmount,
            requestedAt: at,
          },
        },
      };
    });
  // Dive Shop rentals that follow the warehouse must be free on the new
  // dates; the key is checked first so a wrong link learns nothing.
  const saved =
    action === "reschedule" && (await findOwnBooking(id, input.t))
      ? await guardShopMove(id, input.date, change, now)
      : await change();
  if (!saved)
    throw new GuestError(
      "Link pesanan ini tidak berlaku.",
      "This booking link is not valid.",
      404,
    );
  later(() => autoMail(saved, action === "refund" ? "refund" : "rescheduled"));
  return bookingView(saved, today);
}

export { BookingError };
