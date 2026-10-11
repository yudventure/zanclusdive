import { sameOrigin, jsonBody } from "../../../src/server/auth.js";
import {
  getContent,
  listBookings,
  createBookingRequest,
} from "../../../src/server/store.js";
import {
  BookingError,
  validateBookingRequest,
  calendarAvailability,
  bookingErrorMessage,
} from "../../../src/booking-model.js";
import {
  allowBookingRequest,
  bookingFingerprint,
} from "../../../src/server/public-booking.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error, locale) {
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
    "Public booking storage unavailable:",
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

// Visitors on the English site send ?locale=en to get English errors.
const requestLocale = (request) =>
  new URL(request.url).searchParams.get("locale") === "en" ? "en" : "id";

export async function GET(request) {
  try {
    const query = new URL(request.url).searchParams;
    const [{ content }, bookings] = await Promise.all([
      getContent(),
      listBookings(),
    ]);
    return Response.json(
      calendarAvailability(
        content,
        bookings,
        query.get("experience"),
        query.get("month"),
      ),
      { headers },
    );
  } catch (error) {
    return failure(error, "id");
  }
}

export async function POST(request) {
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
    const { requestId, booking } = validateBookingRequest(input);
    const result = await createBookingRequest(
      booking,
      requestId,
      bookingFingerprint(booking),
    );
    return Response.json(result.receipt, {
      status: result.created ? 201 : 200,
      headers,
    });
  } catch (error) {
    return failure(error, requestLocale(request));
  }
}
