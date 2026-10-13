import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { syncPayment } from "../../../../src/server/payments.js";

// "Cek status" in the admin: asks Midtrans for an order's latest status.
export const dynamic = "force-dynamic";
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { orderId } = await jsonBody(request, 2000);
    if (typeof orderId !== "string" || !/^[\w.~-]{1,50}$/.test(orderId))
      return Response.json({ error: "Order tidak valid." }, { status: 400 });
    const booking = await syncPayment(orderId);
    return booking
      ? Response.json({ payment: booking.payment, status: booking.status })
      : Response.json({ error: "Order tidak ditemukan." }, { status: 404 });
  } catch (error) {
    return apiFailure(error);
  }
}
