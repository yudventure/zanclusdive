import "server-only";
import { createHash } from "node:crypto";
import { BookingError } from "../booking-model.js";

// Bounded process-local guard. Booking idempotency is persisted separately.
export function allowBookingRequest(request, now = Date.now()) {
  const address =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local";
  const key = createHash("sha256").update(address.slice(0, 200)).digest("hex");
  const limits = (globalThis.__zanclusBookingLimits ||= new Map());
  for (const [id, entry] of limits)
    if (now - entry.start >= 900000) limits.delete(id);
  const entry = limits.get(key) || { start: now, attempts: 0 };
  if (entry.attempts >= 20 || (!limits.has(key) && limits.size >= 10000))
    throw new BookingError(
      "Terlalu banyak percobaan booking. Coba lagi dalam 15 menit atau hubungi WhatsApp.",
      429,
    );
  entry.attempts++;
  limits.set(key, entry);
}

export const bookingFingerprint = (booking) =>
  createHash("sha256").update(JSON.stringify(booking)).digest("hex");
