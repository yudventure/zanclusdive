import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../../src/server/auth.js";
import {
  getContent,
  listBookings,
} from "../../../../../../src/server/store.js";
import { sendBookingMail } from "../../../../../../src/server/booking-mail.js";
import { bookingMail } from "../../../../../../src/booking-mail.js";
import { mailFor } from "../../../../../../src/payment-model.js";
import { siteUrl } from "../../../../../../src/seo.js";

// The email that fits a booking's payment now: GET shows it, POST sends it
// (again) to the guest.
export const dynamic = "force-dynamic";
async function find(params) {
  const { id } = await params;
  const [{ content }, bookings] = await Promise.all([
    getContent(),
    listBookings(),
  ]);
  return { content, booking: bookings.find((b) => b.id === id) };
}
export async function GET(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    const { content, booking } = await find(params);
    const kind = booking && mailFor(booking.payment);
    if (!kind)
      return new Response("Belum ada email untuk reservasi ini.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    const { html } = bookingMail(kind, { booking, content, base: siteUrl() });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "script-src 'none'",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    await jsonBody(request, 1000).catch(() => ({}));
    const { content, booking } = await find(params);
    if (!booking)
      return Response.json(
        { error: "Reservasi tidak ditemukan." },
        { status: 404 },
      );
    const kind = mailFor(booking.payment);
    if (!kind)
      return Response.json(
        { error: "Reservasi ini belum punya tagihan atau pembayaran." },
        { status: 409 },
      );
    if (!booking.email)
      return Response.json(
        { error: "Isi email tamu dulu, lalu simpan reservasi." },
        { status: 409 },
      );
    return Response.json({
      kind,
      ...(await sendBookingMail(booking, kind, content)),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
