import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import { deleteBooking } from "../../../../../src/server/store.js";
import { validateBooking } from "../../../../../src/cms-model.js";
import { saveWithBilling } from "../../../../../src/server/admin-booking.js";
export async function PUT(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  const { id } = await params;
  let body, payload;
  try {
    body = await jsonBody(request);
    payload = validateBooking(body);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  try {
    return await saveWithBilling({ request, payload, body, id });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  const { id } = await params;
  try {
    return (await deleteBooking(id))
      ? Response.json({ ok: true })
      : Response.json({ error: "Reservasi tidak ditemukan." }, { status: 404 });
  } catch (error) {
    return apiFailure(error);
  }
}
