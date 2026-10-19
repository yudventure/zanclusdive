import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { syncPayment } from "../../../../src/server/payments.js";
import {
  midtransConfigured,
  testConnection,
} from "../../../../src/server/midtrans.js";
import { testPaypal } from "../../../../src/server/paypal.js";

// "Cek status" in the admin asks Midtrans for an order's latest status;
// { action: "test" } checks that Midtrans accepts the server key, and
// { action: "paypal-test" } that PayPal accepts the Client ID and Secret.
export const dynamic = "force-dynamic";
export async function POST(request) {
  const denied = await requireAdmin(request, "payments");
  if (denied) return denied;
  try {
    const { orderId, action } = await jsonBody(request, 2000);
    if (action === "paypal-test") return Response.json(await testPaypal());
    if (action === "test")
      return Response.json(
        midtransConfigured()
          ? await testConnection()
          : { ok: false, reason: "missing" },
      );
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
