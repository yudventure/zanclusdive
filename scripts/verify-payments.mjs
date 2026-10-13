import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { startMockMidtrans } from "./mock-midtrans.mjs";

// Online payment with a stand-in Midtrans. Start the demo server with:
// CMS_MODE=demo CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// MIDTRANS_SERVER_KEY=SB-Mid-server-TEST
// MIDTRANS_SNAP_URL=http://127.0.0.1:3499 MIDTRANS_API_URL=http://127.0.0.1:3499
// npm start. Nothing is sent to Midtrans.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const port = Number(process.env.MIDTRANS_MOCK_PORT || 3499);
const mock = await startMockMidtrans({
  port,
  serverKey: "SB-Mid-server-TEST",
  appUrl: base,
});
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const admin = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const a = await admin.newPage();
const state = async () =>
  (await admin.request.get(base + "/api/admin/state")).json();
const order = async (orderId) =>
  (await state()).bookings.find((b) => b.payment?.orderId === orderId);
async function fillForm(name, participants = "2") {
  await page.locator("#inquiry-name").fill(name);
  await page.locator("#inquiry-whatsapp").fill("081234567890");
  await page.locator("#inquiry-email").fill("tamu@example.com");
  await page.locator("#inquiry-date").fill(today);
  await page.locator("#inquiry-participants").fill(participants);
}
try {
  // Switched off: the summary leads to WhatsApp.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".plan-steps li").last().textContent(),
    "3WhatsApp",
  );
  assert.equal(
    await page.getByRole("button", { name: "Continue to summary" }).count(),
    1,
  );

  // Admin switches payments on and sees the key and the URLs to paste.
  assert.equal(
    (
      await admin.request.post(base + "/api/admin/login", {
        headers: { Origin: base },
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a
    .getByRole("heading", { name: "Bayar langsung dengan Midtrans" })
    .waitFor();
  assert.match(
    await a.locator(".admin-pay-checks").textContent(),
    /Server key Midtrans terpasang[\s\S]*Mode sandbox/,
  );
  assert.match(
    await a.locator(".admin-pay-urls").textContent(),
    /\/api\/payments\/midtrans/,
  );
  await a.locator(".admin-dev-switch").click();
  await a.getByRole("button", { name: "Simpan pengaturan pembayaran" }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();

  // A guest who is sure pays for two Discovery Dives for today.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.deepEqual(await page.locator(".plan-steps li").allTextContents(), [
    "1Your details",
    "2Summary",
    "3Payment",
  ]);
  assert.equal(
    await page.locator("#pay-item option").first().textContent(),
    "Discovery Dive",
  );
  assert.match(
    await page.locator(".plan-package-info strong").textContent(),
    /IDR\s?1,200,000 \/ person/,
  );
  await fillForm("Tamu Lunas");
  // Per-person packages follow the number of participants.
  assert.equal(await page.locator("#pay-quantity").count(), 0);
  assert.match(
    await page.locator(".pay-total").textContent(),
    /^Total to pay\s*IDR\s?1,200,000 × 2 people\s*IDR\s?2,400,000$/,
  );
  // Over 30 participants is for WhatsApp, not online payment.
  await page.locator("#inquiry-participants").fill("31");
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  assert.match(
    await page.locator(".activity-error").textContent(),
    /up to 30 participants/,
  );
  await page.locator("#inquiry-participants").fill("2");
  // The summary comes before Midtrans.
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  assert.equal(
    await page.locator("#plan-summary-title").textContent(),
    "Payment summary",
  );
  assert.match(
    await page.locator(".plan-summary-list").textContent(),
    /ActivityDiving[\s\S]*PackageDiscovery Dive[\s\S]*Participants2 people[\s\S]*NameTamu Lunas[\s\S]*Emailtamu@example.com/,
  );
  assert.match(
    await page.locator(".plan-summary-total").textContent(),
    /IDR\s?2,400,000$/,
  );
  assert.match(await page.locator(".pay-sandbox").textContent(), /test mode/);
  if (process.env.SHOT_DIR)
    await page.locator("#inquiry").screenshot({
      path: process.env.SHOT_DIR + "/pay-summary-desktop.png",
    });
  await page.getByRole("button", { name: /Pay IDR\s?2,400,000/ }).click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const paidId = new URL(page.url()).pathname.split("/").pop();
  const sent = mock.orders.get(paidId);
  assert.equal(sent.amount, 2400000);
  assert.deepEqual(
    sent.items.map((i) => [i.price, i.quantity]),
    [[1200000, 2]],
  );
  assert.equal(sent.customer.email, "tamu@example.com");
  let booking = await order(paidId);
  assert.equal(booking.status, "pending");
  assert.equal(booking.payment.status, "pending");
  await page.locator("#settle").click();
  await page.waitForURL(/\/payment\/finish/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "paid",
  );
  assert.match(
    await page.locator(".zs-details").textContent(),
    /Diving[\s\S]*Discovery Dive × 2[\s\S]*IDR\s?2,400,000/,
  );
  booking = await order(paidId);
  assert.equal(booking.status, "confirmed");
  assert.equal(booking.payment.status, "paid");
  assert.equal(booking.experience, "diving");
  assert.equal(booking.startDate, today);
  assert.equal(booking.amount, 2400000);
  // It is on today's date in the admin calendar and overview.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  assert.ok((await a.locator(".calendar-booking.paid").count()) >= 1);
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  assert.match(
    await a.locator(".admin-table").textContent(),
    /Tamu Lunas[\s\S]*Discovery Dive × 2[\s\S]*Lunas/,
  );

  // Notifications must be signed and match the amount.
  let response = await page.request.post(base + "/api/payments/midtrans", {
    data: { ...mock.status(mock.orders.get(paidId)), signature_key: "00" },
  });
  assert.equal(response.status(), 403);
  mock.orders.set("ZC-OTHER", {
    id: "ZC-OTHER",
    amount: 5,
    status: "settlement",
  });
  response = await mock.notify("ZC-OTHER");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ignored, true);

  // An unpaid order that expires cancels its booking.
  await page.goto(base + "/id/diving", { waitUntil: "networkidle" });
  await fillForm("Tamu Batal", "1");
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pembayaran" })
    .click();
  assert.equal(
    await page.locator("#plan-summary-title").textContent(),
    "Ringkasan pembayaran",
  );
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const expiredId = new URL(page.url()).pathname.split("/").pop();
  await page.locator("#expire").click();
  await page.waitForURL(/\/payment\/finish/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "paymentFailed",
  );
  assert.match(await page.locator("h1").textContent(), /dibatalkan/);
  booking = await order(expiredId);
  assert.equal(booking.status, "cancelled");
  assert.equal(booking.payment.status, "expired");

  // A tampered amount is refused and changes nothing.
  mock.orders.get(expiredId).status = "settlement";
  mock.orders.get(expiredId).gross = "1.00";
  response = await mock.notify(expiredId);
  assert.equal(response.status, 400);
  assert.equal((await order(expiredId)).payment.status, "expired");
  delete mock.orders.get(expiredId).gross;

  // A payment finished without a notification is picked up by "Cek status".
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await fillForm("Tamu Cek", "1");
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const checkId = new URL(page.url()).pathname.split("/").pop();
  mock.orders.get(checkId).status = "settlement";
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a
    .locator("tr", { hasText: checkId })
    .getByRole("button", { name: "Cek status" })
    .click();
  await a.getByText("Status pembayaran diperbarui dari Midtrans.").waitFor();
  assert.equal((await order(checkId)).payment.status, "paid");

  // Still unsure: the same summary goes to WhatsApp instead.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await fillForm("Tamu Ragu", "3");
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  await page
    .getByRole("button", {
      name: "Still unsure? Send this summary on WhatsApp",
    })
    .click();
  assert.equal(
    await page.locator("#plan-summary-title").textContent(),
    "Plan summary",
  );
  assert.equal(await page.locator(".pay-submit").count(), 0);
  const ask = new URL(
    await page
      .getByRole("link", { name: "Continue to WhatsApp" })
      .getAttribute("href"),
  ).searchParams.get("text");
  assert.match(
    ask,
    /Tamu Ragu[\s\S]*Package: Discovery Dive × 3 people\nEstimated cost: IDR\s?3,600,000/,
  );
  // And back to paying online.
  await page.getByRole("button", { name: "Ready? Pay online now" }).click();
  assert.equal(
    await page.locator("#plan-summary-title").textContent(),
    "Payment summary",
  );
  await page.getByRole("button", { name: "← Edit details" }).click();
  assert.equal(await page.locator("#inquiry-name").inputValue(), "Tamu Ragu");
  // Switched off again: no pay option.
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a.locator(".admin-dev-switch").click();
  await a.getByRole("button", { name: "Simpan pengaturan pembayaran" }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".plan-steps li").last().textContent(),
    "3WhatsApp",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS payments: off by default (summary then WhatsApp), admin switch with key status and Midtrans URLs, package card with price and total, per-person quantity, 30-participant limit, payment summary before Midtrans, Midtrans order and items, settled payment confirms the booking on its date and shows in the calendar and payment list, signed notifications only, unknown orders ignored, expiry cancels, tampered amount refused, status check without notification, still-unsure summary to WhatsApp with package and estimate, back to paying and editing keeps details. Nothing sent to Midtrans.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
