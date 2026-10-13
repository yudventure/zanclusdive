import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Midtrans Snap and Core API. Keys come from the hosting environment:
// MIDTRANS_SERVER_KEY, and MIDTRANS_PRODUCTION=true for real payments
// (sandbox otherwise). MIDTRANS_SNAP_URL / MIDTRANS_API_URL point local
// tests at a stand-in server.
const key = () => process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
export const midtransConfigured = () => key().length > 0;
export const midtransProduction = () =>
  process.env.MIDTRANS_PRODUCTION === "true";
function base(kind) {
  const custom =
    kind === "snap"
      ? process.env.MIDTRANS_SNAP_URL
      : process.env.MIDTRANS_API_URL;
  if (custom) return custom.replace(/\/+$/, "");
  const host = kind === "snap" ? "app" : "api";
  return midtransProduction()
    ? `https://${host}.midtrans.com`
    : `https://${host}.sandbox.midtrans.com`;
}
const headers = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: "Basic " + Buffer.from(key() + ":").toString("base64"),
});

// Creates a Snap transaction; returns { token, redirect_url }.
export async function createTransaction(body) {
  const response = await fetch(base("snap") + "/snap/v1/transactions", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.redirect_url)
    throw new Error(
      "MIDTRANS_SNAP_" + response.status + " " + (data.error_messages ?? ""),
    );
  return data;
}

// The current state of an order, or null when Midtrans has no transaction
// yet (the guest has not chosen a payment method).
export async function transactionStatus(orderId) {
  const response = await fetch(
    base("api") + `/v2/${encodeURIComponent(orderId)}/status`,
    { headers: headers(), signal: AbortSignal.timeout(15000) },
  );
  const data = await response.json().catch(() => ({}));
  if (response.status === 404 || data.status_code === "404") return null;
  if (!response.ok) throw new Error("MIDTRANS_STATUS_" + response.status);
  return data;
}

// Notifications are signed with SHA512(order_id + status_code +
// gross_amount + server key).
export function validSignature(notification) {
  const { order_id, status_code, gross_amount, signature_key } =
    notification ?? {};
  if (![order_id, status_code, gross_amount, signature_key].every(Boolean))
    return false;
  const expected = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${key()}`)
    .digest();
  const given = Buffer.from(String(signature_key), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
