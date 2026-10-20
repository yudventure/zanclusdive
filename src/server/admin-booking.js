import "server-only";
import { getContent, listBookings, saveBooking } from "./store.js";
import { withBilling, BillingError } from "./billing.js";
import { sendBookingMail, later } from "./booking-mail.js";
import { siteOrigin } from "./payments.js";
import { recordShopSales } from "./shop-stock.js";

// Saves a booking from the admin with its payment, then emails the guest
// when asked: the order with its deadline for a new bill, the invoice when
// it was just recorded as paid. The answer says whether the email went.
export async function saveWithBilling({ request, payload, body, id }) {
  const [{ content }, bookings] = await Promise.all([
    getContent(),
    id ? listBookings() : [],
  ]);
  const current = id ? bookings.find((b) => b.id === id) : null;
  if (id && !current)
    return Response.json(
      { error: "Reservasi tidak ditemukan." },
      { status: 404 },
    );
  let result;
  try {
    result = await withBilling({
      payload,
      current,
      input: body.billing,
      content,
      origin: siteOrigin(request),
    });
  } catch (error) {
    if (error instanceof BillingError)
      return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
  const saved = await saveBooking(result.booking, id);
  if (!saved)
    return Response.json(
      { error: "Reservasi tidak ditemukan." },
      { status: 404 },
    );
  // A website order the team marks paid (a bank transfer that arrived):
  // its Dive Shop purchases leave the warehouse.
  if (saved.payment?.status === "paid" && current?.payment?.status !== "paid")
    later(() =>
      recordShopSales(saved).catch((error) =>
        console.error("Dive Shop stock not recorded:", error?.message),
      ),
    );
  let mail = null;
  if (result.mail) {
    const sent = await sendBookingMail(saved, result.mail, content);
    mail = { kind: result.mail, ...sent };
  } else if (result.notify && !saved.email && saved.payment)
    mail = {
      ok: false,
      error: "Email tamu belum diisi, jadi tidak ada email yang dikirim.",
    };
  return Response.json({ ...saved, mail }, { status: id ? 200 : 201 });
}
