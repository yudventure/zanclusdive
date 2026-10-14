import "server-only";
import { createTransaction } from "./midtrans.js";
import { paymentsReady, newOrderId } from "./payments.js";
import { isManual, midtransLocked, validateBilling } from "../payment-model.js";
import { dueAt, programName } from "../booking-mail.js";
import { bookingDates } from "../booking-model.js";

export class BillingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => new BillingError(message, status);

// When a booking from WhatsApp, an agent or a walk-in is saved in the
// admin: works out its payment from the team's choice. Returns the booking
// to save and the email to send the guest (order, invoice or none).
export async function withBilling({
  payload,
  current,
  input,
  content,
  origin,
}) {
  const today = bookingDates().today;
  const billing = validateBilling(input, today);
  const now = new Date().toISOString();
  const before = current?.payment ?? null;
  const settings = content.payments ?? {};
  const booking = {
    ...payload,
    ...(current?.mails ? { mails: current.mails } : {}),
  };
  const amount = payload.amount;
  const hours = billing.dueHours ?? settings.dueHours ?? 24;
  const done = (payment, mail = null) => ({
    booking: payment ? { ...booking, payment } : booking,
    mail: billing.notify && booking.email ? mail : null,
    notify: billing.notify,
  });

  // An open or paid Midtrans payment changes only through Midtrans.
  if (midtransLocked(before)) {
    if (billing.action !== "keep")
      throw fail(
        "Pembayaran Midtrans reservasi ini masih berjalan atau sudah lunas, jadi tidak bisa diganti dari sini.",
        409,
      );
    return done(before);
  }
  if (billing.action === "keep") {
    if (!before) return done(null);
    // An unpaid bill follows the amount of the booking.
    if (isManual(before) && before.status === "unpaid")
      return done({ ...before, amount });
    return done(before);
  }
  if (billing.action === "none") return done(null);

  if (["closed", "cancelled"].includes(payload.status))
    throw fail("Reservasi yang ditutup atau dibatalkan tidak bisa ditagih.");
  if (!(amount > 0))
    throw fail(
      "Isi nilai reservasi lebih dari Rp 0 untuk menagih atau mencatat pembayaran.",
    );

  if (billing.action === "paid") {
    const paidAt =
      billing.paidOn === today ? now : `${billing.paidOn}T12:00:00+09:00`;
    const already = isManual(before) && before.status === "paid";
    const payment = already
      ? { ...before, method: billing.method, amount }
      : {
          ...(isManual(before) ? before : {}),
          provider: "manual",
          method: billing.method,
          status: "paid",
          amount,
          createdAt: before?.createdAt ?? now,
          paidAt: new Date(paidAt).toISOString(),
          updatedAt: now,
        };
    const next = done(payment, already ? null : "invoice");
    if (next.booking.status === "pending") next.booking.status = "confirmed";
    return next;
  }

  if (billing.action === "transfer") {
    if (!(settings.accounts ?? []).length)
      throw fail(
        "Isi dulu rekening transfer di Pembayaran → Email tamu & invoice.",
      );
    const open =
      isManual(before) &&
      before.status === "unpaid" &&
      before.method === "transfer";
    if (open && !billing.extend) return done({ ...before, amount });
    return done(
      {
        provider: "manual",
        method: "transfer",
        status: "unpaid",
        amount,
        createdAt: now,
        dueHours: hours,
        dueAt: dueAt(now, hours),
      },
      "order",
    );
  }

  // A Midtrans payment link for this booking, sent to the guest.
  if (!paymentsReady(content))
    throw fail(
      "Link Midtrans belum bisa dibuat. Aktifkan pembayaran Midtrans dan pastikan server key terpasang.",
      409,
    );
  const orderId = newOrderId();
  const lang = payload.lang === "en" ? "en" : "id";
  const label = (l) =>
    programName(content, payload.experience, l) +
    (["shop", "service"].includes(payload.experience)
      ? ""
      : l === "en"
        ? ` · ${payload.participants} guests`
        : ` · ${payload.participants} peserta`);
  let snap;
  try {
    snap = await createTransaction({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [
        {
          id: payload.experience,
          price: amount,
          quantity: 1,
          name: label(lang).slice(0, 50),
        },
      ],
      customer_details: {
        first_name: payload.guestName.slice(0, 50),
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.email ? { email: payload.email } : {}),
      },
      callbacks: { finish: `${origin}/payment/finish?lang=${lang}` },
      expiry: { unit: "hours", duration: hours },
    });
  } catch (error) {
    console.error("Midtrans transaction failed:", error.message);
    throw fail(
      "Midtrans belum bisa membuat link pembayaran. Coba lagi, atau cek Pembayaran → Tes koneksi Midtrans.",
      502,
    );
  }
  return done(
    {
      provider: "midtrans",
      orderId,
      status: "pending",
      amount,
      item: label("id"),
      itemEn: label("en"),
      createdAt: now,
      createdBy: "admin",
      dueHours: hours,
      dueAt: dueAt(now, hours),
      redirectUrl: snap.redirect_url,
    },
    "order",
  );
}
