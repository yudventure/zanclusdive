import {
  requireAdmin,
  currentAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../../src/server/auth.js";
import { updateBooking } from "../../../../../../src/server/store.js";

// The team marks a guest's refund (a Flexi booking cancelled on the
// guest's page) as sent, with an optional note such as the transfer
// reference. The refund then goes out in the cash book on that day.
export const dynamic = "force-dynamic";
export async function POST(request, { params }) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await jsonBody(request, 2000).catch(() => ({}));
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note.length > 300 || /[<>]/.test(note))
      return Response.json(
        { error: "Catatan refund maksimal 300 karakter, tanpa < atau >." },
        { status: 400 },
      );
    const admin = await currentAdmin(request).catch(() => null);
    let missing = false;
    const saved = await updateBooking(id, (current) => {
      if (current.payment?.refund?.status !== "requested") {
        missing = true;
        return null;
      }
      return {
        ...current,
        payment: {
          ...current.payment,
          refund: {
            ...current.payment.refund,
            status: "done",
            doneAt: new Date().toISOString(),
            note,
            ...(admin?.email ? { by: admin.email } : {}),
          },
        },
      };
    });
    if (!saved)
      return Response.json(
        { error: "Reservasi tidak ditemukan." },
        { status: 404 },
      );
    if (missing)
      return Response.json(
        {
          error: "Tidak ada permintaan refund yang menunggu di reservasi ini.",
        },
        { status: 409 },
      );
    return Response.json(saved);
  } catch (error) {
    return apiFailure(error);
  }
}
