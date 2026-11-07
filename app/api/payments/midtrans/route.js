import { jsonBody } from "../../../../src/server/auth.js";
import { recordNotification } from "../../../../src/server/payments.js";

// Midtrans payment notification (set as the Notification URL in the
// Midtrans dashboard). Signed by Midtrans, or checked with Midtrans when
// signed with another key; a settled payment confirms the booking for its
// date.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  let notification;
  try {
    notification = await jsonBody(request, 20000);
  } catch {
    return Response.json({ error: "Invalid notification." }, { status: 400 });
  }
  try {
    const result = await recordNotification(notification);
    return Response.json(
      result === "ignored" ? { ok: true, ignored: true } : { ok: true },
    );
  } catch (error) {
    console.error("Midtrans notification failed:", error.message);
    const mismatch = error.message === "MIDTRANS_AMOUNT_MISMATCH";
    return Response.json(
      { error: mismatch ? "Amount mismatch." : "Try again later." },
      { status: mismatch ? 400 : 503 },
    );
  }
}
