import "server-only";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import {
  getContent,
  listBookings,
  createPaymentBooking,
  updateBooking,
} from "./store.js";
import {
  midtransConfigured,
  midtransProduction,
  createTransaction,
  transactionStatus,
  validSignature,
} from "./midtrans.js";
import {
  paymentOutcome,
  paypalAmount,
  withPaymentStatus,
} from "../payment-model.js";
import {
  paypalConfigured,
  paypalLive,
  createPaypalOrder,
  capturePaypalOrder,
} from "./paypal.js";
import { notifyTeam } from "./team-mail.js";
import { priceOrder, PricingError, orderLabel } from "../order-pricing.js";
import {
  BookingError,
  bookingDates,
  bookingReference,
} from "../booking-model.js";
import { validateBooking } from "../cms-model.js";
import { cleanWhatsApp, cleanEmail } from "../contact-fields.js";
import { priceText } from "../price-list.js";
import { visitorLocks } from "../developer.js";
import { isDemo, temporaryFolder } from "../cms-mode.js";
import { demoStorageDirectory } from "./demo-store.js";
import { withCourses, courseProfile } from "../course-model.js";
import { withService } from "../service-model.js";
import { dueAt, invoiceNumber } from "../booking-mail.js";
import { fareNames } from "../fare-model.js";
import { autoMail, later } from "./booking-mail.js";
import { recordShopSales, reserveShopStock } from "./shop-stock.js";

// Online payment is offered when the owner switched it on and the hosting
// has a Midtrans server key. A paid booking must not disappear, so real
// payments need MySQL or the demo store's folder in the hosting account,
// which a redeploy leaves alone. A demo store under /tmp is not enough.
export const paymentsBlockedByDemo = () =>
  midtransProduction() &&
  isDemo() &&
  temporaryFolder(demoStorageDirectory(), tmpdir());
export const midtransReady = (content) =>
  content.payments?.enabled === true &&
  midtransConfigured() &&
  !paymentsBlockedByDemo();
// Bank transfer to the accounts set in the admin, paid outside the
// website and marked paid by the team.
export const transferReady = (content) =>
  content.payments?.transfer === true &&
  (content.payments?.accounts ?? []).length > 0;
// PayPal, once its keys are in the hosting environment and it is on.
export const paypalReady = (content) =>
  content.payments?.paypal?.enabled === true &&
  paypalConfigured() &&
  !(
    paypalLive() &&
    isDemo() &&
    temporaryFolder(demoStorageDirectory(), tmpdir())
  );
// The ways a guest can pay at the checkout, in the order they are offered.
export const payMethods = (content) =>
  [
    midtransReady(content) && "midtrans",
    transferReady(content) && "transfer",
    paypalReady(content) && "paypal",
  ].filter(Boolean);
export const paymentsReady = (content) => payMethods(content).length > 0;

// What the forms need to know: whether to offer payment, how, and test
// modes.
export const paymentOptions = (content) => ({
  ready: paymentsReady(content),
  methods: payMethods(content),
  sandbox: !midtransProduction(),
  paypalSandbox: !paypalLive(),
  paypalRate: content.payments?.paypal?.rate ?? 16000,
});

// The public address of the website, for the page Midtrans returns to.
export function siteOrigin(request) {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

const fail = (message, status = 400) => new BookingError(message, status);

// Checks a pay request against the current CMS prices (activity package,
// Dive Shop order, course or gear service), saves the booking as waiting
// for payment and opens a Midtrans transaction for it.
export async function startPayment(input, { origin, locale = "id" }) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("Data pembayaran tidak valid.");
  if (input.website) throw fail("Permintaan tidak dapat diproses.");
  // Courses and services saved before those parts existed use defaults,
  // as on their pages.
  const content = withService(withCourses((await getContent()).content));
  const methods = payMethods(content);
  if (!methods.length)
    throw fail(
      "Pembayaran online belum tersedia. Silakan chat tim kami lewat WhatsApp.",
      409,
    );
  // Earlier pages send no method: Midtrans, or the only one offered.
  const method =
    input.method ?? (methods.includes("midtrans") ? "midtrans" : methods[0]);
  if (!methods.includes(method))
    throw fail(
      "Cara bayar ini belum tersedia. Pilih cara bayar lain atau chat tim kami lewat WhatsApp.",
      409,
    );
  let order;
  try {
    order = priceOrder(
      content,
      input,
      bookingDates(),
      visitorLocks(content.developer),
    );
  } catch (error) {
    if (error instanceof PricingError) throw fail(error.message, error.status);
    throw error;
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 80) throw fail("Isi nama, maksimal 80 karakter.");
  const whatsapp = cleanWhatsApp(input.whatsapp);
  if (!whatsapp)
    throw fail(
      "Isi nomor WhatsApp yang dapat dihubungi, termasuk kode negara.",
    );
  const email = cleanEmail(input.email);
  if (email === null) throw fail("Format email belum benar.");
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 1000) throw fail("Catatan maksimal 1.000 karakter.");
  const certification =
    order.program === "course" && typeof input.certification === "string"
      ? input.certification.trim().slice(0, 80)
      : "";
  // A course sign-up's answers (birth date, swimming, health, sizes…) go
  // into the booking notes for the team.
  let profile = [];
  if (order.program === "course")
    try {
      profile = courseProfile(
        content.courses.items.find((c) => c.id === input.course),
        { ...input, date: order.startDate },
        "id",
      );
    } catch (error) {
      throw fail(error.message);
    }
  const { amount, lines } = order;
  const single = lines.length === 1 ? lines[0] : null;
  let payload;
  try {
    payload = validateBooking({
      experience: order.program,
      status: "pending",
      source: "website",
      startDate: order.startDate,
      endDate: order.endDate,
      guestName: name,
      phone: whatsapp,
      email,
      participants: order.participants,
      amount,
      lang: locale,
      notes: [
        `${method === "transfer" ? "Transfer bank" : method === "paypal" ? "PayPal" : "Bayar online"} · ${orderLabel(lines, "id")}`,
        order.fare && `Tarif ${fareNames[order.fare.tier]}`,
        order.delivery &&
          (order.delivery.method === "delivery"
            ? `Diantar ke ${order.delivery.zone}, alamat ${order.delivery.address}`
            : "Ambil sendiri di dive center"),
        certification && `Lisensi: ${certification}`,
        ...profile.map(([label, value]) => `${label}: ${value}`),
        notes,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (error) {
    throw fail(error.message);
  }
  const orderId = newOrderId();
  // The guest has the hours set in the admin to pay; then the Midtrans
  // link expires and the booking is cancelled. An unpaid transfer or
  // PayPal order stops holding its places then.
  const dueHours = content.payments?.dueHours ?? 24;
  const paypalRate = content.payments?.paypal?.rate ?? 16000;
  const createdAt = new Date().toISOString();
  // Dive Shop gear that follows the warehouse is checked against its stock
  // as the booking is saved.
  const create = () =>
    createPaymentBooking({
      ...payload,
      payment: {
        ...(method === "transfer"
          ? { provider: "manual", method: "transfer", status: "unpaid" }
          : method === "paypal"
            ? {
                provider: "paypal",
                status: "created",
                currency: "USD",
                rate: paypalRate,
                usd: paypalAmount(amount, paypalRate),
              }
            : { provider: "midtrans", status: "created" }),
        orderId,
        amount,
        // One line keeps the item, quantity and unit fields of earlier
        // payments; every payment also lists its lines.
        ...(single
          ? {
              item: priceText(single.name, "id"),
              itemEn: priceText(single.name, "en"),
              quantity: single.quantity,
              unit: single.unit ? priceText(single.unit, "id") : "",
            }
          : {
              item: orderLabel(lines, "id"),
              itemEn: orderLabel(lines, "en"),
            }),
        lines: lines.map((line) => ({
          name: {
            id: priceText(line.name, "id"),
            en: priceText(line.name, "en"),
          },
          price: line.price,
          quantity: line.quantity,
          ...(line.product
            ? {
                product: line.product,
                mode: line.mode,
                ...(line.size ? { size: line.size } : {}),
              }
            : {}),
        })),
        createdAt,
        dueHours,
        dueAt: dueAt(createdAt, dueHours),
        // The fare and its rules as they were when ordered, and the key to
        // the guest's own page for moving the date or asking for a refund.
        ...(order.fare ? { fare: order.fare } : {}),
        manageToken: randomUUID(),
      },
    });
  // Dive Shop gear, bought or rented (also as an activity's add-on), must
  // still be in stock.
  const booking = await reserveShopStock(order, create);
  const finish = `${origin}/payment/finish?order_id=${encodeURIComponent(orderId)}&lang=${locale}`;
  // Bank transfer: the booking waits for the transfer; the guest sees the
  // accounts on the result page and in the order email.
  if (method === "transfer") {
    if (booking.email) later(() => autoMail(booking, "order"));
    notifyTeam(booking, "new");
    return {
      redirectUrl: finish,
      orderId,
      reference: bookingReference(booking.id),
    };
  }
  if (method === "paypal")
    return startPaypal(booking, { origin, locale, lines });
  try {
    const snap = await createTransaction({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: lines.map((line) => ({
        id: line.id.slice(0, 50),
        price: line.price,
        quantity: line.quantity,
        name: priceText(line.name, locale).slice(0, 50),
      })),
      customer_details: {
        first_name: name.slice(0, 50),
        phone: whatsapp,
        ...(email ? { email } : {}),
      },
      callbacks: { finish: `${origin}/payment/finish?lang=${locale}` },
      expiry: { unit: "hours", duration: dueHours },
    });
    // A notification may already have moved the status on.
    const saved = await updateBooking(booking.id, (current) => ({
      ...current,
      payment: {
        ...current.payment,
        status:
          current.payment.status === "created"
            ? "pending"
            : current.payment.status,
        redirectUrl: snap.redirect_url,
      },
    }));
    // The order and its payment deadline, to the guest's inbox.
    if (saved?.email && saved.payment.status === "pending")
      later(() => autoMail(saved, "order"));
    notifyTeam(saved, "new");
    return {
      redirectUrl: snap.redirect_url,
      orderId,
      reference: bookingReference(booking.id),
    };
  } catch (error) {
    console.error("Midtrans transaction failed:", error.message);
    await updateBooking(booking.id, (current) => ({
      ...current,
      status: "cancelled",
      payment: { ...current.payment, status: "failed" },
    })).catch(() => {});
    throw fail(
      "Pembayaran belum bisa dibuat. Coba lagi sebentar, atau chat tim kami lewat WhatsApp.",
      502,
    );
  }
}

const findOrder = async (orderId) =>
  (await listBookings()).find((b) => b.payment?.orderId === orderId) ?? null;

export const newOrderId = () =>
  `ZC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

// Applies a Midtrans status (from a notification or a status check) after
// checking it belongs to the order and its amount. The change is decided
// inside the locked update, so the invoice or the cancellation goes out
// once even when Midtrans repeats its notification.
async function apply(booking, status) {
  if (Number(status.gross_amount) !== booking.payment.amount)
    throw new Error("MIDTRANS_AMOUNT_MISMATCH");
  const outcome = paymentOutcome(status);
  let changed = null;
  const updated = await updateBooking(booking.id, (current) => {
    const next = withPaymentStatus(current, outcome, {
      method: status.payment_type,
      transactionId: status.transaction_id,
    });
    if (next) {
      changed = next.payment.status;
      if (changed === "paid")
        next.payment.invoiceNumber = invoiceNumber(next, next.payment.paidAt);
    }
    return next;
  });
  if (changed === "paid") {
    later(() => autoMail(updated, "invoice"));
    notifyTeam(updated, "paid");
    // Purchases from the Dive Shop leave the warehouse.
    later(() =>
      recordShopSales(updated).catch((error) =>
        console.error("Dive Shop stock not recorded:", error?.message),
      ),
    );
  }
  if (changed === "expired" && updated?.status === "cancelled")
    later(() => autoMail(updated, "expired"));
  return updated ?? booking;
}

// Midtrans HTTP notification. Returns "ignored" for orders that are not
// ours (such as the dashboard's test notification).
export async function recordNotification(notification) {
  if (!validSignature(notification)) return "forbidden";
  const booking = await findOrder(notification.order_id);
  if (!booking) return "ignored";
  let status = notification;
  // A settled payment is checked once more with Midtrans before the
  // booking is confirmed.
  if (paymentOutcome(notification) === "paid") {
    try {
      status = (await transactionStatus(notification.order_id)) ?? notification;
    } catch (error) {
      console.error("Midtrans status check failed:", error.message);
    }
  }
  await apply(booking, status);
  return "ok";
}

// Asks Midtrans for the latest status, e.g. when the guest returns from the
// payment page before the notification arrived.
export async function syncPayment(orderId) {
  const booking = await findOrder(orderId);
  if (!booking) return null;
  // An approved PayPal order is taken now, when the guest came back some
  // other way or the team checks it.
  if (
    booking.payment?.provider === "paypal" &&
    booking.payment.status === "pending" &&
    paypalConfigured()
  )
    return completePaypal(orderId);
  if (booking.payment?.provider !== "midtrans" || !midtransConfigured())
    return booking;
  try {
    const status = await transactionStatus(orderId);
    return status && status.order_id === orderId
      ? await apply(booking, status)
      : booking;
  } catch (error) {
    console.error("Midtrans status check failed:", error.message);
    return booking;
  }
}

// PayPal: the order is created at PayPal and the guest approves it there.
// PayPal sends the guest back to /api/payments/paypal/return, where the
// money is taken; a guest who leaves without paying comes back through
// /api/payments/paypal/cancel.
async function startPaypal(booking, { origin, locale, lines }) {
  const orderId = booking.payment.orderId;
  const back = (path) =>
    `${origin}/api/payments/paypal/${path}?order_id=${encodeURIComponent(orderId)}&lang=${locale}`;
  try {
    const order = await createPaypalOrder({
      orderId,
      usd: booking.payment.usd,
      description: `Zanclus Dive Center ${orderLabel(lines, "en")}`,
      returnUrl: back("return"),
      cancelUrl: back("cancel"),
      locale,
    });
    const saved = await updateBooking(booking.id, (current) => ({
      ...current,
      payment: {
        ...current.payment,
        status: "pending",
        paypalId: order.id,
        redirectUrl: order.approveUrl,
      },
    }));
    notifyTeam(saved, "new");
    return {
      redirectUrl: order.approveUrl,
      orderId,
      reference: bookingReference(booking.id),
    };
  } catch (error) {
    console.error("PayPal order failed:", error.message);
    await updateBooking(booking.id, (current) => ({
      ...current,
      status: "cancelled",
      payment: { ...current.payment, status: "failed" },
    })).catch(() => {});
    throw fail(
      "Pembayaran PayPal belum bisa dibuat. Coba cara bayar lain, atau chat tim kami lewat WhatsApp.",
      502,
    );
  }
}

// The guest approved the order on PayPal: the money is taken, checked
// against the order, and the booking confirmed with its invoice.
export async function completePaypal(orderId) {
  const booking = await findOrder(orderId);
  if (!booking || booking.payment?.provider !== "paypal") return null;
  if (booking.payment.status === "paid" || !booking.payment.paypalId)
    return booking;
  let result;
  try {
    result = await capturePaypalOrder(booking.payment.paypalId);
  } catch (error) {
    console.error("PayPal capture failed:", error.message);
    return booking;
  }
  const done =
    result.status === "COMPLETED" &&
    result.captureStatus === "COMPLETED" &&
    result.currency === "USD" &&
    Number(result.usd) >= Number(booking.payment.usd);
  if (!done) {
    if (result.status === "COMPLETED" || result.captureStatus === "DECLINED")
      console.error("PayPal capture does not match the order:", orderId);
    return booking;
  }
  let changed = false;
  const updated = await updateBooking(booking.id, (current) => {
    if (current.payment?.status === "paid") return current;
    const next = withPaymentStatus(current, "paid", {
      method: "paypal",
      transactionId: result.captureId,
    });
    if (!next) return current;
    changed = true;
    next.payment.invoiceNumber = invoiceNumber(next, next.payment.paidAt);
    return next;
  });
  if (changed) {
    later(() => autoMail(updated, "invoice"));
    notifyTeam(updated, "paid");
    later(() =>
      recordShopSales(updated).catch((error) =>
        console.error("Dive Shop stock not recorded:", error?.message),
      ),
    );
  }
  return updated ?? booking;
}

// The guest left PayPal without paying: the order no longer holds places.
export async function cancelPaypal(orderId) {
  const booking = await findOrder(orderId);
  if (!booking || booking.payment?.provider !== "paypal") return null;
  if (booking.payment.status === "paid") return booking;
  return (
    (await updateBooking(
      booking.id,
      (current) => withPaymentStatus(current, "failed") ?? current,
    )) ?? booking
  );
}
