import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  saveBooking,
  deleteBooking,
  listBookings,
} from "../../../../../src/server/store.js";
import { validateBooking } from "../../../../../src/cms-model.js";
export async function PUT(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  const { id } = await params;
  let payload;
  try {
    payload = validateBooking(await jsonBody(request));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  try {
    // Online payment details come from Midtrans and are not edited here.
    const current = (await listBookings()).find((b) => b.id === id);
    if (current?.payment) payload = { ...payload, payment: current.payment };
    const result = await saveBooking(payload, id);
    return result
      ? Response.json(result)
      : Response.json({ error: "Reservasi tidak ditemukan." }, { status: 404 });
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
