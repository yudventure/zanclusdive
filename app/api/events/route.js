import { sameOrigin, jsonBody } from "../../../src/server/auth.js";
import { getContent, createBookingRequest } from "../../../src/server/store.js";
import {
  BookingError,
  bookingErrorMessage,
} from "../../../src/booking-model.js";
import {
  allowBookingRequest,
  bookingFingerprint,
} from "../../../src/server/public-booking.js";
import { validateEventSignup } from "../../../src/event-signup.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const requestLocale = (request) =>
  new URL(request.url).searchParams.get("locale") === "en" ? "en" : "id";

// A sign-up for the event on a homepage banner, saved as a reservation
// request for the team to confirm.
export async function POST(request) {
  const locale = requestLocale(request);
  if (!sameOrigin(request))
    return Response.json(
      { error: "Permintaan dari origin lain ditolak." },
      { status: 403, headers },
    );
  try {
    allowBookingRequest(request);
    let input;
    try {
      input = await jsonBody(request);
    } catch {
      throw new BookingError("Data booking tidak valid atau terlalu besar.");
    }
    const { content } = await getContent();
    const { requestId, booking } = validateEventSignup(
      content,
      input,
      undefined,
      locale,
    );
    const result = await createBookingRequest(
      booking,
      requestId,
      bookingFingerprint(booking),
    );
    return Response.json(
      {
        ...result.receipt,
        endDate: booking.endDate,
        participants: booking.participants,
        amount: booking.amount,
      },
      { status: result.created ? 201 : 200, headers },
    );
  } catch (error) {
    if (error instanceof BookingError)
      return Response.json(
        { error: bookingErrorMessage(error.message, locale) },
        {
          status: error.status,
          headers: {
            ...headers,
            ...(error.status === 429 ? { "Retry-After": "900" } : {}),
          },
        },
      );
    console.error(
      "Event sign-up storage unavailable:",
      error?.code || "STORAGE_UNAVAILABLE",
    );
    return Response.json(
      {
        error: bookingErrorMessage(
          "Booking belum dapat disimpan. Coba lagi atau hubungi tim melalui WhatsApp.",
          locale,
        ),
      },
      { status: 503, headers },
    );
  }
}
