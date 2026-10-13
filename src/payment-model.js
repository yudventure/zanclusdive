// Online payment of activity packages with Midtrans. A guest who is ready
// picks a package from the activity's price list and pays the full amount;
// once Midtrans reports it settled, the booking is confirmed for its date.
// Guests who still have questions are pointed to WhatsApp instead.

export const paymentActivities = ["diving", "snorkeling", "trip"];
export const quantityLimit = 30;

export const defaultPayments = { enabled: false };
export function validatePayments(input) {
  if (input === undefined || input === null) return { ...defaultPayments };
  if (typeof input !== "object")
    throw new Error("Pengaturan pembayaran tidak valid.");
  return { enabled: input.enabled === true };
}

// Packages of an activity that have a price, with their place in the list.
export function payableItems(priceList, activity) {
  if (!paymentActivities.includes(activity)) return [];
  return (priceList?.[activity] ?? [])
    .map((item, index) => ({ ...item, index }))
    .filter((item) => Number.isSafeInteger(item.price) && item.price > 0);
}

// What a Midtrans transaction status means for the booking.
export function paymentOutcome({ transaction_status: status, fraud_status }) {
  if (status === "settlement") return "paid";
  if (status === "capture")
    return !fraud_status || fraud_status === "accept"
      ? "paid"
      : fraud_status === "challenge"
        ? "pending"
        : "failed";
  if (status === "pending" || status === "authorize") return "pending";
  if (status === "expire") return "expired";
  if (["deny", "cancel", "failure"].includes(status)) return "failed";
  if (status === "refund" || status === "partial_refund") return "refunded";
  return null;
}

// The booking after a payment update, or null when nothing changes. Paid
// confirms the booking for its date; an expired or failed payment cancels
// a booking that was still waiting for it. A paid booking only moves on to
// refunded.
export function withPaymentStatus(booking, outcome, details = {}) {
  const payment = booking.payment;
  if (!payment || !outcome || payment.status === outcome) return null;
  if (payment.status === "paid" && outcome !== "refunded") return null;
  if (payment.status === "refunded") return null;
  const at = details.at ?? new Date().toISOString();
  const next = {
    ...booking,
    payment: {
      ...payment,
      status: outcome,
      updatedAt: at,
      ...(details.method ? { method: details.method } : {}),
      ...(details.transactionId
        ? { transactionId: details.transactionId }
        : {}),
    },
  };
  if (outcome === "paid") {
    next.status = "confirmed";
    next.payment.paidAt = at;
  }
  if (
    (outcome === "expired" || outcome === "failed") &&
    booking.status === "pending"
  )
    next.status = "cancelled";
  return next;
}

export const paymentStatusLabels = {
  created: "Dibuat",
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal / dibatalkan",
  refunded: "Dikembalikan",
};
