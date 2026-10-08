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
} from "../../../src/booking-model.js";
import {
  allowBookingRequest,
  bookingFingerprint,
} from "../../../src/server/public-booking.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error) {
  if (error instanceof BookingError)
    return Response.json(
      { error: error.message },
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
      error:
        "Booking belum dapat disimpan. Coba lagi atau hubungi tim melalui WhatsApp.",
    },
    { status: 503, headers },
  );
}

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
    return failure(error);
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
    return failure(error);
  }
}
