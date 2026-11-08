import "server-only";
import { createHash } from "node:crypto";
import { getContent, listBookings } from "./store.js";
import { priceOrder, PricingError } from "../order-pricing.js";
import { BookingError, bookingDates } from "../booking-model.js";
import { visitorLocks } from "../developer.js";
import { cleanEmail, cleanWhatsApp } from "../contact-fields.js";
import { withCourses } from "../course-model.js";
import { withService } from "../service-model.js";
import {
  checkVoucherUses,
  cleanCode,
  voucherText,
  voucherUses,
} from "../voucher-model.js";

// Codes are guessable by trying, so each address may check 30 in 15
// minutes (process-local, like the booking guard).
export function allowVoucherCheck(request, now = Date.now()) {
  const address =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local";
  const key = createHash("sha256").update(address.slice(0, 200)).digest("hex");
  const limits = (globalThis.__zanclusVoucherLimits ||= new Map());
  for (const [id, entry] of limits)
    if (now - entry.start >= 900000) limits.delete(id);
  const entry = limits.get(key) || { start: now, attempts: 0 };
  if (entry.attempts >= 30 || (!limits.has(key) && limits.size >= 10000))
    throw new BookingError(
      "Terlalu banyak percobaan kode kupon. Coba lagi dalam 15 menit.",
      429,
    );
  entry.attempts++;
  limits.set(key, entry);
}

// A voucher code tried on an order before paying or sending it (a Dive
// Shop cart, activity packages, a course or gear servicing): the discount
// the server would give, priced like the payment itself. How the gear is
// received and the date do not change the discount, so they do not stop
// the check.
export async function checkVoucher(input, locale = "id") {
  const t = voucherText(locale);
  // Messages already in the guest's language.
  const said = (message, status = 400) =>
    Object.assign(new BookingError(message, status), { localized: true });
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw said(t.unknown);
  const code = cleanCode(input.voucher);
  if (!code) throw said(t.unknown);
  // Courses and services saved before those parts existed use defaults,
  // as on their pages and at payment.
  const content = withService(withCourses((await getContent()).content));
  const window = bookingDates();
  const kind = ["shop", "activity", "course", "service"].includes(input.kind)
    ? input.kind
    : "shop";
  const day = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= window.today &&
    value <= window.last
      ? value
      : window.today;
  let order;
  try {
    order = priceOrder(
      content,
      {
        ...input,
        kind,
        voucher: code,
        startDate: day(input.startDate),
        date: day(input.date),
        delivery:
          content.shop?.delivery?.pickup === false
            ? input.delivery
            : { method: "pickup" },
      },
      window,
      visitorLocks(content.developer),
      locale,
    );
  } catch (error) {
    if (!(error instanceof PricingError)) throw error;
    if (/harganya dikonfirmasi tim/.test(error.message))
      throw said(t.priced, error.status);
    throw Object.assign(new BookingError(error.message, error.status), {
      localized: Boolean(error.voucher),
    });
  }
  try {
    checkVoucherUses(
      order.voucher,
      voucherUses(await listBookings(), order.voucher, {
        phone: cleanWhatsApp(input.whatsapp) || "",
        email: cleanEmail(input.email) || "",
      }),
      locale,
    );
  } catch (error) {
    throw said(error.message, 409);
  }
  return { code: order.voucher.code, discount: order.voucher.discount };
}
