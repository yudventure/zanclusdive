import {
  cancelPaypal,
  siteOrigin,
} from "../../../../../src/server/payments.js";

// The guest left PayPal without paying: the booking stops holding its
// places and the result page says so.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") ?? "";
  const lang = url.searchParams.get("lang") === "en" ? "en" : "id";
  if (/^[\w.~-]{1,50}$/.test(orderId))
    await cancelPaypal(orderId).catch((error) =>
      console.error("PayPal cancel failed:", error?.message),
    );
  return Response.redirect(
    `${siteOrigin(request)}/payment/finish?order_id=${encodeURIComponent(orderId)}&lang=${lang}`,
    303,
  );
}
