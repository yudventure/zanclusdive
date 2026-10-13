import { sameOrigin, jsonBody } from "../../../src/server/auth.js";
import { allowBookingRequest } from "../../../src/server/public-booking.js";
import { startPayment, siteOrigin } from "../../../src/server/payments.js";
import {
  BookingError,
  bookingErrorMessage,
} from "../../../src/booking-model.js";

// Pay now: saves the booking and returns the Midtrans payment page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(request) {
  const locale =
    new URL(request.url).searchParams.get("locale") === "en" ? "en" : "id";
  if (!sameOrigin(request))
    return Response.json(
      { error: "Permintaan dari origin lain ditolak." },
      { status: 403, headers },
    );
  try {
    allowBookingRequest(request);
    let input;
    try {
      input = await jsonBody(request, 16000);
    } catch {
      throw new BookingError("Data pembayaran tidak valid.");
    }
    const result = await startPayment(input, {
      origin: siteOrigin(request),
      locale,
    });
    return Response.json(result, { status: 201, headers });
  } catch (error) {
    if (error instanceof BookingError)
      return Response.json(
        { error: bookingErrorMessage(error.message, locale) },
        { status: error.status, headers },
      );
    console.error(
      "Payment storage unavailable:",
      error?.code || error?.message,
    );
    return Response.json(
      {
        error: bookingErrorMessage(
          "Pembayaran belum bisa dibuat. Coba lagi sebentar, atau chat tim kami lewat WhatsApp.",
          locale,
        ),
      },
      { status: 503, headers },
    );
  }
}
