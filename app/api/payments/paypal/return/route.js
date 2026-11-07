import {
  completePaypal,
  siteOrigin,
} from "../../../../../src/server/payments.js";

// PayPal sends the guest back here after approving: the money is taken
// and the guest lands on the payment result page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") ?? "";
  const lang = url.searchParams.get("lang") === "en" ? "en" : "id";
  if (/^[\w.~-]{1,50}$/.test(orderId))
    await completePaypal(orderId).catch((error) =>
      console.error("PayPal return failed:", error?.message),
    );
  return Response.redirect(
    `${siteOrigin(request)}/payment/finish?order_id=${encodeURIComponent(orderId)}&lang=${lang}`,
    303,
  );
}
