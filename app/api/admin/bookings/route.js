import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { getContent, saveBooking } from "../../../../src/server/store.js";
import { validateBooking } from "../../../../src/cms-model.js";
import { saveWithBilling } from "../../../../src/server/admin-booking.js";
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
