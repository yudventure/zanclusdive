// Online payment of activity packages with Midtrans. A guest who is ready
// picks a package from the activity's price list and pays the full amount;
// once Midtrans reports it settled, the booking is confirmed for its date.
// Guests who still have questions are pointed to WhatsApp instead.

export const paymentActivities = ["diving", "snorkeling", "trip"];
export const quantityLimit = 30;

// How long a guest has to pay, for website orders (the Midtrans link
// expires then) and for bookings the team bills from the admin.
export const dueHourChoices = [1, 2, 3, 6, 12, 24, 48, 72];
export const accountLimit = 3;
export const defaultPayments = {
  enabled: false,
  dueHours: 24,
  guestEmails: true,
  copyTo: "",
  accounts: [],
  invoiceNote: { id: "", en: "" },
};
const text = (value, label, max) => {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length > max) throw new Error(`${label} maksimal ${max} karakter.`);
  if (/[<>]/.test(clean))
    throw new Error(`${label} tidak boleh berisi < atau >.`);
  return clean;
};
export function validatePayments(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultPayments);
  if (typeof input !== "object" || Array.isArray(input))
    throw new Error("Pengaturan pembayaran tidak valid.");
  const dueHours = dueHourChoices.includes(Number(input.dueHours))
    ? Number(input.dueHours)
    : defaultPayments.dueHours;
  const copyTo = text(input.copyTo, "Email salinan", 200);
  if (copyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(copyTo))
    throw new Error("Email salinan invoice tidak valid.");
  const list = Array.isArray(input.accounts) ? input.accounts : [];
  const accounts = list
    .map((a) => ({
      bank: text(a?.bank, "Nama bank", 40),
      number: text(a?.number, "Nomor rekening", 30),
      holder: text(a?.holder, "Atas nama", 80),
    }))
    .filter((a) => a.bank || a.number || a.holder);
  if (accounts.length > accountLimit)
    throw new Error(`Maksimal ${accountLimit} rekening transfer.`);
  for (const a of accounts) {
    if (!a.bank || !a.number || !a.holder)
      throw new Error("Lengkapi nama bank, nomor rekening, dan atas nama.");
    if (!/^[\d\s.-]{5,30}$/.test(a.number))
      throw new Error("Nomor rekening hanya angka, spasi, titik, atau strip.");
  }
  return {
    enabled: input.enabled === true,
    dueHours,
    guestEmails: input.guestEmails !== false,
    copyTo,
    accounts,
    invoiceNote: {
      id: text(input.invoiceNote?.id, "Catatan invoice", 600),
      en: text(input.invoiceNote?.en, "Catatan invoice (English)", 600),
    },
  };
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

// What was paid for, as one line: "Discovery Dive × 2" or several lines.
export function paymentItemLabel(payment, locale = "id") {
  if (payment?.lines?.length > 1)
    return payment.lines
      .map(
        (line) =>
          `${(locale === "en" && line.name?.en) || line.name?.id} × ${line.quantity}`,
      )
      .join(", ");
  const item = (locale === "en" && payment?.itemEn) || payment?.item || "";
  return payment?.quantity ? `${item} × ${payment.quantity}` : item;
}

export const paymentStatusLabels = {
  created: "Dibuat",
  pending: "Menunggu pembayaran",
  unpaid: "Belum dibayar",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal / dibatalkan",
  refunded: "Dikembalikan",
};

// Payments the team records itself, for bookings from WhatsApp, agents or
// walk-ins: billed by bank transfer, or already paid.
export const manualMethods = {
  transfer: "Transfer bank",
  cash: "Tunai",
  card: "Kartu di lokasi (EDC)",
  qris: "QRIS",
  other: "Lainnya",
};
export const isManual = (payment) => payment?.provider === "manual";
// A Midtrans payment that is still open or paid is Midtrans' to change.
export const midtransLocked = (payment) =>
  Boolean(payment) &&
  !isManual(payment) &&
  ["created", "pending", "paid", "refunded"].includes(payment.status);
// A bill whose deadline passed while still unpaid.
export const overdue = (payment, now = new Date()) =>
  Boolean(payment?.dueAt) &&
  ["unpaid", "pending", "created"].includes(payment.status) &&
  new Date(payment.dueAt) < now;

// What the admin asks for when saving a booking: keep the payment as it
// is, remove a bill, bill by Midtrans link or bank transfer, or record it
// as paid; and whether to email the guest about it.
export const billingActions = ["keep", "none", "midtrans", "transfer", "paid"];
export function validateBilling(input, today) {
  if (input === undefined || input === null)
    return { action: "keep", notify: false };
  if (typeof input !== "object" || !billingActions.includes(input.action))
    throw new Error("Pilihan pembayaran tidak valid.");
  const paidOn =
    typeof input.paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)
      ? input.paidOn
      : today;
  if (input.action === "paid" && today && paidOn > today)
    throw new Error("Tanggal bayar tidak boleh setelah hari ini.");
  return {
    action: input.action,
    dueHours: dueHourChoices.includes(Number(input.dueHours))
      ? Number(input.dueHours)
      : null,
    method: Object.hasOwn(manualMethods, input.method)
      ? input.method
      : "transfer",
    paidOn,
    extend: input.extend === true,
    notify: input.notify === true,
  };
}

// Which email fits a payment now: the order with its deadline while it is
// open, the invoice once paid, the cancellation after it expired.
export function mailFor(payment) {
  if (!payment) return null;
  if (payment.status === "paid") return "invoice";
  if (payment.status === "expired") return "expired";
  if (["unpaid", "pending"].includes(payment.status) && payment.dueAt)
    return "order";
  return null;
}
