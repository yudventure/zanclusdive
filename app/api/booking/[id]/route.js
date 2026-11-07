import { sameOrigin, jsonBody } from "../../../../src/server/auth.js";
import { allowBookingRequest } from "../../../../src/server/public-booking.js";
import { BookingError } from "../../../../src/booking-model.js";
import {
  GuestError,
  changeAsGuest,
  guestMessage,
} from "../../../../src/server/own-booking.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

// A guest moving the date of their paid booking, or cancelling it for a
// refund, from the page linked in their invoice. The key in the link is
// checked again with the fare's rules inside the store lock.
export async function POST(request, { params }) {
  const locale =
    new URL(request.url).searchParams.get("locale") === "en" ? "en" : "id";
  const { id } = await params;
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
      throw new GuestError(
        "Data tidak valid.",
        "The request is not valid.",
        400,
      );
    }
    const view = await changeAsGuest(id, input);
    return Response.json({ view }, { headers });
  } catch (error) {
    if (error instanceof GuestError || error instanceof BookingError)
      return Response.json(
        { error: guestMessage(error, locale) },
        {
          status: error.status ?? 409,
          headers: {
            ...headers,
            ...(error.status === 429 ? { "Retry-After": "900" } : {}),
          },
        },
      );
    console.error(
      "Guest booking change failed:",
      error?.code || error?.message || "STORAGE_UNAVAILABLE",
    );
    return Response.json(
      {
        error:
          locale === "en"
            ? "The change could not be saved. Please try again or contact our team on WhatsApp."
            : "Perubahan belum bisa disimpan. Coba lagi atau hubungi tim kami lewat WhatsApp.",
      },
      { status: 503, headers },
    );
  }
}
