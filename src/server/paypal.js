import "server-only";

// PayPal Checkout (Orders API v2). The keys come from the hosting
// environment, like Midtrans: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET
// from the PayPal developer dashboard (My Apps & Credentials), and
// PAYPAL_MODE=live for real payments (sandbox otherwise). PAYPAL_API_URL
// points local tests at a stand-in server. PayPal has no rupiah, so the
// order is charged in US dollars.
const clean = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
const clientId = () => clean(process.env.PAYPAL_CLIENT_ID);
const secret = () => clean(process.env.PAYPAL_CLIENT_SECRET);
export const paypalConfigured = () =>
  clientId().length > 0 && secret().length > 0;
export const paypalLive = () =>
  clean(process.env.PAYPAL_MODE).toLowerCase() === "live";
export const paypalKeyEnding = () => clientId().slice(-4);
function base() {
  const custom = process.env.PAYPAL_API_URL;
  if (custom) return custom.replace(/\/+$/, "");
  return paypalLive()
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// The last answer PayPal refused, shown in the admin to find the cause.
export const lastPaypalError = () => globalThis.__zanclusPaypalError ?? null;
function remember(stage, status, message) {
  globalThis.__zanclusPaypalError = {
    at: new Date().toISOString(),
    stage,
    status,
    message: String(message ?? "").slice(0, 300),
  };
}
const paypalMessage = (data) =>
  [data?.error_description, data?.message, data?.details?.[0]?.description]
    .filter(Boolean)
    .join(" ");

async function call(path, { method = "GET", body, token, stage }) {
  let response;
  try {
    response = await fetch(base() + path, {
      method,
      headers: token
        ? {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          }
        : {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " +
              Buffer.from(clientId() + ":" + secret()).toString("base64"),
          },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    remember(stage, 0, "Tidak bisa terhubung ke PayPal. " + error.message);
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    remember(stage, response.status, paypalMessage(data));
    const error = new Error(
      `PAYPAL_${stage.toUpperCase()}_${response.status} ${paypalMessage(data)}`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

// An access token for the calls below, kept until shortly before it ends.
async function accessToken() {
  const kept = globalThis.__zanclusPaypalToken;
  if (kept && kept.key === clientId() && kept.until > Date.now())
    return kept.token;
  const data = await call("/v1/oauth2/token", {
    method: "POST",
    body: "grant_type=client_credentials",
    stage: "token",
  });
  globalThis.__zanclusPaypalToken = {
    key: clientId(),
    token: data.access_token,
    until: Date.now() + Math.max(60, (data.expires_in ?? 300) - 60) * 1000,
  };
  return data.access_token;
}

// Creates an order the guest approves on PayPal; returns { id, approveUrl }.
export async function createPaypalOrder({
  orderId,
  usd,
  description,
  returnUrl,
  cancelUrl,
  locale,
}) {
  const token = await accessToken();
  const data = await call("/v2/checkout/orders", {
    method: "POST",
    token,
    stage: "order",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          custom_id: orderId,
          invoice_id: orderId,
          description: description.slice(0, 127),
          amount: { currency_code: "USD", value: usd },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Zanclus Dive Center",
            locale: locale === "en" ? "en-US" : "id-ID",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    }),
  });
  const approveUrl = data.links?.find((l) =>
    ["payer-action", "approve"].includes(l.rel),
  )?.href;
  if (!data.id || !approveUrl) {
    remember("order", 0, "PayPal tidak mengirim link persetujuan.");
    throw new Error("PAYPAL_NO_APPROVE_LINK");
  }
  globalThis.__zanclusPaypalError = null;
  return { id: data.id, approveUrl };
}

// Takes the money of an approved order; returns { status, usd, captureId }.
// An order already captured answers with its completed capture.
export async function capturePaypalOrder(paypalId) {
  const token = await accessToken();
  let data;
  try {
    data = await call(
      `/v2/checkout/orders/${encodeURIComponent(paypalId)}/capture`,
      { method: "POST", token, stage: "capture", body: "{}" },
    );
  } catch (error) {
    if (error.status !== 422) throw error;
    data = await call(`/v2/checkout/orders/${encodeURIComponent(paypalId)}`, {
      token,
      stage: "capture",
    });
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureStatus: capture?.status ?? "",
    usd: capture?.amount?.value ?? "",
    currency: capture?.amount?.currency_code ?? "",
    captureId: capture?.id ?? "",
    orderId: data.purchase_units?.[0]?.custom_id ?? "",
  };
}

// Asks PayPal for an access token: proves the Client ID and Secret.
export async function testPaypal() {
  if (!paypalConfigured()) return { ok: false, reason: "missing" };
  globalThis.__zanclusPaypalToken = null;
  try {
    await accessToken();
    globalThis.__zanclusPaypalError = null;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error.status === 401 ? "key" : error.status ? "other" : "network",
      status: error.status ?? 0,
      message: lastPaypalError()?.message ?? error.message,
    };
  }
}
