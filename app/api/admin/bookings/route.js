import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { listBookings } from "../../../../src/server/store.js";
import { validateBooking } from "../../../../src/cms-model.js";
import { saveWithBilling } from "../../../../src/server/admin-booking.js";
export const dynamic = "force-dynamic";
// The reservations alone, without the site content: the admin asks every
// minute or so, to ring when a booking comes in or is paid.
export async function GET(request) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    return Response.json(
      { bookings: await listBookings() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  let body, payload;
  try {
    body = await jsonBody(request);
    payload = validateBooking(body);
  } catch (error) {
    return Response.json(
      { error: error.message || "Reservasi tidak valid." },
      { status: 400 },
    );
  }
  try {
    return await saveWithBilling({ request, payload, body });
  } catch (error) {
    return apiFailure(error);
  }
}
