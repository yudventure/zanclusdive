import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  cleanKey,
  keyEnding,
  keyIssues as keyIssuesFor,
  productionOn,
} from "../midtrans-key.js";

// Midtrans Snap and Core API. Keys come from the hosting environment:
// MIDTRANS_SERVER_KEY, and MIDTRANS_PRODUCTION=true for real payments
// (sandbox otherwise). MIDTRANS_SNAP_URL / MIDTRANS_API_URL point local
// tests at a stand-in server.
// Spaces or quotes pasted around the key in hPanel are ignored.
const key = () => cleanKey(process.env.MIDTRANS_SERVER_KEY);
export const midtransConfigured = () => key().length > 0;
export const midtransProduction = () =>
  productionOn(process.env.MIDTRANS_PRODUCTION);
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

// Mistakes in the hosting settings that Midtrans would reject: a client key
// in place of the server key, text pasted with the key, or a key for the
// other mode.
export const keyIssues = () =>
  keyIssuesFor(
    process.env.MIDTRANS_SERVER_KEY,
    process.env.MIDTRANS_PRODUCTION,
  );
export const midtransKeyEnding = () =>
  keyEnding(process.env.MIDTRANS_SERVER_KEY);

// The last answer Midtrans refused, shown in the admin to find the cause.
export const lastMidtransError = () =>
  globalThis.__zanclusMidtransError ?? null;
function remember(stage, status, message) {
  globalThis.__zanclusMidtransError = {
    at: new Date().toISOString(),
    stage,
    status,
    message: String(message ?? "").slice(0, 300),
  };
}
const midtransMessage = (data) =>
  [data?.error_messages, data?.status_message]
    .flat()
    .filter(Boolean)
    .join("; ");

// Creates a Snap transaction; returns { token, redirect_url }.
export async function createTransaction(body) {
  let response;
  try {
    response = await fetch(base("snap") + "/snap/v1/transactions", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    remember("snap", 0, "Tidak bisa terhubung ke Midtrans: " + error.message);
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.redirect_url) {
    remember("snap", response.status, midtransMessage(data));
    throw new Error(
      "MIDTRANS_SNAP_" + response.status + " " + midtransMessage(data),
    );
  }
  globalThis.__zanclusMidtransError = null;
  return data;
}

// Asks Midtrans about an order that does not exist: "not found" means the
// server key was accepted; 401 means it was refused.
export async function testConnection() {
  let response;
  try {
    response = await fetch(
      base("api") + `/v2/zanclus-test-${Date.now()}/status`,
      { headers: headers(), signal: AbortSignal.timeout(15000) },
    );
  } catch (error) {
    return { ok: false, reason: "network", message: error.message };
  }
  const data = await response.json().catch(() => ({}));
  const code = String(data.status_code ?? response.status);
  if (code === "404") {
    globalThis.__zanclusMidtransError = null;
    return { ok: true };
  }
  const message = midtransMessage(data);
  remember("test", Number(code) || response.status, message);
  return {
    ok: false,
    reason: code === "401" ? "key" : "other",
    status: Number(code) || response.status,
    message,
  };
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
