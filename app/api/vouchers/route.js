import { sameOrigin, jsonBody } from "../../../src/server/auth.js";
import {
  allowVoucherCheck,
  checkVoucher,
} from "../../../src/server/vouchers.js";
import {
  BookingError,
  bookingErrorMessage,
} from "../../../src/booking-model.js";

// A voucher code tried on a Dive Shop cart: its discount, or why not.
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
    allowVoucherCheck(request);
    let input;
    try {
      input = await jsonBody(request, 16000);
    } catch {
      throw new BookingError("Data kupon tidak valid.");
    }
    return Response.json(await checkVoucher(input, locale), { headers });
  } catch (error) {
    if (error instanceof BookingError)
      return Response.json(
        {
          error: error.localized
            ? error.message
            : bookingErrorMessage(error.message, locale),
        },
        { status: error.status, headers },
      );
    console.error("Voucher check failed:", error?.code || error?.message);
    return Response.json(
      {
        error:
          locale === "en"
            ? "The voucher cannot be checked right now. Try again shortly."
            : "Kupon belum bisa dicek. Coba lagi sebentar.",
      },
      { status: 503, headers },
    );
  }
}
