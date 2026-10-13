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
  // Switched off: only the WhatsApp form.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".pay-switch").count(), 0);

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
  assert.match(await page.locator(".pay-hint").textContent(), /WhatsApp/);
  await page.getByRole("button", { name: "Pay now" }).click();
  assert.match(await page.locator(".pay-hint").textContent(), /pay in full/);
  assert.match(
    await page.locator("#pay-item option").first().textContent(),
    /Discovery Dive · IDR\s?1,200,000/,
  );
  await fillForm("Tamu Lunas");
  assert.equal(await page.locator("#pay-quantity").inputValue(), "2");
  assert.match(
    await page.locator(".pay-total").textContent(),
    /IDR\s?2,400,000/,
  );
  assert.match(await page.locator(".pay-sandbox").textContent(), /test mode/);
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
  await page.getByRole("button", { name: "Bayar sekarang" }).click();
  await fillForm("Tamu Batal", "1");
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
  await page.getByRole("button", { name: "Pay now" }).click();
  await fillForm("Tamu Cek", "1");
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

  // Asking first still prepares the WhatsApp message.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await fillForm("Tamu Ragu", "3");
  await page.getByRole("button", { name: /Prepare WhatsApp message/ }).click();
  assert.match(
    await page.locator(".activity-message-preview").textContent(),
    /Tamu Ragu/,
  );
  // Switched off again: no pay option.
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a.locator(".admin-dev-switch").click();
  await a.getByRole("button", { name: "Simpan pengaturan pembayaran" }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".pay-switch").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS payments: off by default, admin switch with key status and Midtrans URLs, pay now with package, quantity per person and total, Midtrans order and items, settled payment confirms the booking on its date and shows in the calendar and payment list, signed notifications only, unknown orders ignored, expiry cancels, tampered amount refused, status check without notification, WhatsApp path unchanged. Nothing sent to Midtrans.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
