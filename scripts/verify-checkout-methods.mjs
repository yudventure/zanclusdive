import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { startMockMidtrans } from "./mock-midtrans.mjs";
import { startMockPaypal } from "./mock-paypal.mjs";
import { startMockSmtp } from "./mock-smtp.mjs";

// Bank transfer and PayPal at the checkout, the email to the team and the
// admin's chime, with stand-in Midtrans, PayPal and mail servers. Start the
// demo server as for verify-guest-mail, plus PAYPAL_CLIENT_ID=test-client-AB12
// PAYPAL_CLIENT_SECRET=test-secret PAYPAL_API_URL=http://127.0.0.1:3498.
// Nothing is sent to Midtrans, PayPal or a real mailbox.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR || "";
const smtp = startMockSmtp({
  port: Number(process.env.SMTP_MOCK_PORT || 3525),
});
const midtrans = await startMockMidtrans({
  port: Number(process.env.MIDTRANS_MOCK_PORT || 3499),
  serverKey: "SB-Mid-server-TEST",
  appUrl: base,
});
const paypalPort = Number(process.env.PAYPAL_MOCK_PORT || 3498);
const paypal = await startMockPaypal({
  port: paypalPort,
  clientId: "test-client-AB12",
  secret: "test-secret",
});

// The message as a mail program reads it.
function decodeWords(value) {
  return value.replace(/=\?utf-8\?([qb])\?([^?]*)\?=\s*/gi, (_, kind, text) =>
    kind.toLowerCase() === "b"
      ? Buffer.from(text, "base64").toString("utf8")
      : Buffer.from(
          text
            .replace(/_/g, " ")
            .replace(/=([0-9a-f]{2})/gi, (_, h) =>
              String.fromCharCode(parseInt(h, 16)),
            ),
          "latin1",
        ).toString("utf8"),
  );
}
function read(message) {
  const raw = message.data;
  const split = raw.indexOf("\n\n");
  const head = raw.slice(0, split).replace(/\n[ \t]+/g, " ");
  const header = (name) =>
    decodeWords(new RegExp(`^${name}: (.*)$`, "mi").exec(head)?.[1] ?? "");
  const body = Buffer.from(
    raw
      .slice(split)
      .replace(/=\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      ),
    "latin1",
  ).toString("utf8");
  return { subject: header("Subject"), replyTo: header("Reply-To"), body };
}
async function nextMail(to, after, subject = /./) {
  for (let i = 0; i < 100; i++) {
    const found = smtp.messages
      .slice(after)
      .map((m) => ({ m, mail: m.to.includes(to) && read(m) }))
      .find(({ mail }) => mail && subject.test(mail.subject));
    if (found) return found.mail;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("No email to " + to + " matching " + subject);
}

const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const plusDays = (days) =>
  new Date(Date.parse(today + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const guest = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await guest.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const page = await guest.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const admin = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const a = await admin.newPage();
a.on("pageerror", (error) => errors.push("admin " + error.message));
const state = async () =>
  (await admin.request.get(base + "/api/admin/state")).json();
const order = async (orderId) =>
  (await state()).bookings.find((b) => b.payment?.orderId === orderId);
const card = (heading) =>
  a.locator("form", { has: a.getByRole("heading", { name: heading }) });
async function saved(button) {
  await a.getByRole("button", { name: button }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();
}
async function pickDate(date) {
  const day = page.locator(`.plan-dates .slot-day[data-date="${date}"]`);
  if (!(await day.count()))
    await page
      .locator(".plan-dates")
      .getByRole("button", { name: "Next month" })
      .click();
  if ((await day.getAttribute("aria-pressed")) !== "true") await day.click();
}
// Two Discovery Dives for tomorrow, up to the payment summary.
async function diveSummary(name) {
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
  await page.locator("#inquiry-name").fill(name);
  await page.locator("#inquiry-whatsapp").fill("081234567890");
  await page.locator("#inquiry-email").fill("tamu@example.com");
  await pickDate(plusDays(1));
  await page.locator("#inquiry-participants").fill("2");
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  await page.locator("#plan-summary-title").waitFor();
}
// The admin looks for new bookings now instead of in 45 seconds.
async function look() {
  await a.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
}
const chimes = () => a.evaluate(() => window.chimes);
async function countChimes() {
  await a.evaluate(() => {
    window.chimes = 0;
    window.addEventListener("zanclus-chime", () => window.chimes++);
  });
}

try {
  // Without a login there is nothing to poll.
  assert.equal(
    (await guest.request.get(base + "/api/admin/bookings")).status(),
    401,
  );
  assert.equal(
    (
      await admin.request.post(base + "/api/admin/login", {
        headers: { Origin: base },
        data: demoAccount,
      })
    ).status(),
    200,
  );

  // The payments page: transfer needs an account first.
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  const transferCard = card("Transfer bank di checkout");
  assert.match(
    await transferCard.locator(".admin-pay-checks").textContent(),
    /Belum ada rekening/,
  );
  await a.getByLabel("Bank 1").fill("BCA");
  await a.getByLabel("Nomor rekening").first().fill("123 456 7890");
  await a.getByLabel("Atas nama").first().fill("PT Zanclus Dive Center");
  // Typed in lower case, saved as the bank's SWIFT code.
  await a.getByLabel("Kode SWIFT").first().fill("cenaidja");
  await a.getByRole("button", { name: "Simpan pengaturan email" }).click();
  await a.getByText("Pengaturan email tamu tersimpan.").waitFor();
  await transferCard.locator(".admin-dev-switch").click();
  await saved("Simpan transfer bank");
  assert.match(
    await transferCard.locator(".admin-pay-checks").textContent(),
    /1 rekening tampil ke tamu \(BCA\)/,
  );

  // PayPal: the keys from the hosting, sandbox, the test and the rate.
  const paypalCard = card("PayPal");
  assert.match(
    await paypalCard.locator(".admin-pay-checks").textContent(),
    /Client ID dan Secret PayPal terpasang di hosting, Client ID berakhiran AB12\.[\s\S]*Mode sandbox/,
  );
  await paypalCard.getByRole("button", { name: "Tes koneksi PayPal" }).click();
  await a
    .getByText("Berhasil. PayPal menerima Client ID dan Secret ini.")
    .waitFor();
  await paypalCard.locator(".admin-dev-switch").click();
  await a.getByLabel("Kurs, rupiah per 1 USD").fill("16000");
  assert.match(
    await paypalCard.locator(".admin-field small").textContent(),
    /Rp 1\.500\.000 ditagih USD 93\.75/,
  );
  await saved("Simpan pengaturan PayPal");

  // The notice to the team goes to the address set here.
  const notifyCard = card("Pemberitahuan booking masuk");
  await a.getByLabel("Email penerima 1").fill("tim@zanclus.test");
  await saved("Simpan pemberitahuan");
  await card("Bayar langsung dengan Midtrans")
    .locator(".admin-dev-switch")
    .click();
  await saved("Simpan pengaturan pembayaran");
  const settings = (await state()).content.payments;
  assert.equal(settings.enabled, true);
  assert.equal(settings.transfer, true);
  assert.deepEqual(settings.paypal, { enabled: true, rate: 16000 });
  assert.deepEqual(settings.notify.emails, ["tim@zanclus.test"]);
  if (shots) {
    await a.addStyleTag({
      content:
        ".admin-header{position:static!important}nextjs-portal{display:none!important}",
    });
    await transferCard.screenshot({ path: shots + "/pay-transfer-card.png" });
    await paypalCard.screenshot({ path: shots + "/pay-paypal-card.png" });
    await notifyCard.screenshot({ path: shots + "/pay-notify-card.png" });
  }

  // The admin keeps the calendar open and hears the chime.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await countChimes();

  // A guest picks how to pay; the button and its small print follow.
  await diveSummary("Tamu Transfer");
  const methods = page.locator(".pay-methods");
  assert.equal(
    await methods.locator("legend").textContent(),
    "Choose how to pay",
  );
  assert.deepEqual(
    await methods.locator(".plan-fare-head strong").allTextContents(),
    ["Pay online", "Bank transfer", "PayPal"],
  );
  assert.match(
    await page.locator(".pay-submit").textContent(),
    /^Pay IDR\s?2,400,000/,
  );
  await methods.getByText("PayPal", { exact: true }).click();
  assert.match(
    await page.locator(".pay-submit").textContent(),
    /^Pay USD 150\.00 with PayPal/,
  );
  assert.match(
    await page.locator(".pay-notes").textContent(),
    /About USD 150\.00 on PayPal[\s\S]*PayPal test mode/,
  );
  await methods.getByText("Bank transfer", { exact: true }).click();
  assert.match(
    await page.locator(".pay-submit").textContent(),
    /^Continue to bank transfer/,
  );
  assert.equal(
    await page.locator(".pay-notes").textContent(),
    "Nothing is charged on the website. We hold your date until the transfer deadline.",
  );
  if (shots)
    await page.locator("#inquiry").screenshot({
      path: shots + "/pay-methods-desktop.png",
    });
  let mark = smtp.messages.length;
  await page.locator(".pay-submit").click();
  await page.waitForURL(/\/payment\/finish\?order_id=/);
  const transferId = new URL(page.url()).searchParams.get("order_id");
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "transferPending",
  );
  assert.match(
    await page.locator(".zs-account").textContent(),
    /BCA\s*123 456 7890\s*Account name PT Zanclus Dive Center\s*SWIFT code CENAIDJA/,
  );
  assert.match(
    await page.locator(".zs-details").textContent(),
    /Transfer total\s*IDR\s?2,400,000[\s\S]*Transfer by/,
  );
  assert.match(
    decodeURIComponent(
      await page
        .locator('a[href^="https://wa.me/"]')
        .first()
        .getAttribute("href"),
    ),
    /I've transferred IDR\s?2,400,000 for order ZC-/,
  );
  if (shots)
    await page.screenshot({ path: shots + "/pay-transfer-finish.png" });
  let booking = await order(transferId);
  assert.deepEqual(
    [booking.status, booking.source, booking.payment.provider],
    ["pending", "website", "manual"],
  );
  assert.deepEqual(
    [booking.payment.method, booking.payment.status, booking.payment.amount],
    ["transfer", "unpaid", 2400000],
  );
  assert.ok(Date.parse(booking.payment.dueAt) > Date.now());
  const team = await nextMail("tim@zanclus.test", mark, /^Booking baru/);
  assert.match(team.subject, /^Booking baru · Tamu Transfer · /);
  assert.match(team.body, /Menunggu transfer bank, batas/);
  assert.match(team.body, /admin\/calendar\?booking=/);
  assert.equal(team.replyTo, "tamu@example.com");
  const guestOrder = await nextMail("tamu@example.com", mark);
  assert.match(guestOrder.body, /123 456 7890/);
  assert.match(guestOrder.body, /SWIFT CENAIDJA/);

  // The open admin rings, shows the booking and counts it in the title.
  await look();
  const toast = a.locator(".admin-alert-toast");
  await toast.waitFor();
  assert.match(
    await toast.textContent(),
    /Booking baru masuk dari website[\s\S]*Tamu Transfer/,
  );
  assert.equal(await chimes(), 1);
  assert.match(await a.title(), /^\(1\) /);
  if (shots)
    await toast.screenshot({ path: shots + "/admin-booking-toast.png" });
  // It opens as a short notice, not the full form; once the transfer is
  // in, one button confirms it as paid, without a ring.
  await toast.getByRole("link", { name: /Tamu Transfer/ }).click();
  const notice = a.locator(".admin-notice");
  await notice.waitFor();
  assert.equal(await a.locator("#booking-editor").count(), 0);
  assert.equal(await toast.count(), 0);
  assert.doesNotMatch(await a.title(), /^\(\d+\) /);
  assert.equal(
    await notice.locator(".admin-notice-eyebrow").textContent(),
    "Menunggu transfer bank",
  );
  assert.equal(await notice.locator("h2").textContent(), "Tamu Transfer");
  assert.match(
    await notice.locator(".admin-notice-rows").textContent(),
    /Diving[\s\S]*2 orang[\s\S]*Rp\s?2\.400\.000[\s\S]*Menunggu transfer bank, batas/,
  );
  if (shots)
    await notice.screenshot({ path: shots + "/admin-booking-notice.png" });
  mark = smtp.messages.length;
  await notice
    .getByRole("button", { name: "Transfer sudah masuk, konfirmasi" })
    .click();
  await a
    .getByText(
      "Booking Tamu Transfer dikonfirmasi dan lunas. Invoice terkirim ke tamu@example.com.",
    )
    .waitFor();
  assert.equal(await notice.count(), 0);
  booking = await order(transferId);
  assert.deepEqual(
    [booking.status, booking.payment.status, booking.payment.provider],
    ["confirmed", "paid", "manual"],
  );
  assert.ok(booking.payment.orderId, "the website order keeps its number");
  await nextMail("tamu@example.com", mark, /Invoice/);
  await look();
  await a.waitForTimeout(800);
  assert.equal(await chimes(), 1);
  assert.equal(await toast.count(), 0);

  // PayPal: the guest approves on PayPal and comes back paid.
  await diveSummary("Tamu PayPal");
  await page
    .locator(".pay-methods")
    .getByText("PayPal", { exact: true })
    .click();
  mark = smtp.messages.length;
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${paypalPort}/approve/`));
  assert.equal(await page.locator("#amount").textContent(), "USD 150.00");
  const paypalId = new URL(page.url()).pathname.split("/").pop();
  const sent = paypal.orders.get(paypalId);
  assert.match(sent.description, /Discovery Dive/);
  booking = await order(sent.customId);
  assert.deepEqual(
    [booking.payment.provider, booking.payment.status, booking.payment.usd],
    ["paypal", "pending", "150.00"],
  );
  assert.equal(booking.payment.paypalId, paypalId);
  assert.match(
    (await nextMail("tim@zanclus.test", mark, /^Booking baru/)).body,
    /Menunggu pembayaran PayPal/,
  );
  await page.locator("#pay").click();
  await page.waitForURL(/\/payment\/finish\?order_id=/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "paid",
  );
  booking = await order(sent.customId);
  assert.deepEqual(
    [booking.status, booking.payment.status, booking.payment.method],
    ["confirmed", "paid", "paypal"],
  );
  assert.equal(booking.payment.transactionId, "CAP-" + paypalId);
  assert.ok(booking.payment.invoiceNumber);
  assert.equal(paypal.captures, 1);
  const paidMail = await nextMail("tim@zanclus.test", mark, /^Lunas/);
  assert.match(paidMail.subject, /^Lunas · Tamu PayPal · /);
  assert.match(paidMail.body, /Lunas lewat PayPal/);
  assert.match(
    (await nextMail("tamu@example.com", mark, /Invoice/)).body,
    /PayPal/,
  );
  // Coming back twice takes the money once.
  await page.goto(
    base + `/api/payments/paypal/return?order_id=${sent.customId}&lang=en`,
  );
  assert.equal(paypal.captures, 1);
  await look();
  await a.locator(".admin-alert-toast").waitFor();
  assert.match(
    await a.locator(".admin-alert-toast").textContent(),
    /Tamu PayPal/,
  );
  assert.equal(await chimes(), 2);
  await a.getByRole("button", { name: "Tutup pemberitahuan" }).click();
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  assert.match(
    await a.locator(".admin-table").textContent(),
    /PayPal · USD 150\.00 · /,
  );

  // A guest who cancels on PayPal: nothing is held.
  await diveSummary("Tamu Batal");
  await page
    .locator(".pay-methods")
    .getByText("PayPal", { exact: true })
    .click();
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${paypalPort}/approve/`));
  const cancelled = paypal.orders.get(
    new URL(page.url()).pathname.split("/").pop(),
  );
  await page.locator("#cancel").click();
  await page.waitForURL(/\/payment\/finish\?order_id=/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "paymentFailed",
  );
  booking = await order(cancelled.customId);
  assert.deepEqual(
    [booking.status, booking.payment.status],
    ["cancelled", "failed"],
  );
  // The return address without an approval takes nothing.
  await diveSummary("Tamu Belum Setuju");
  await page
    .locator(".pay-methods")
    .getByText("PayPal", { exact: true })
    .click();
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${paypalPort}/approve/`));
  const unapproved = paypal.orders.get(
    new URL(page.url()).pathname.split("/").pop(),
  );
  await page.goto(
    base +
      `/api/payments/paypal/return?order_id=${unapproved.customId}&lang=en`,
  );
  await page.waitForURL(/\/payment\/finish/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "paymentPending",
  );
  assert.equal((await order(unapproved.customId)).payment.status, "pending");
  assert.equal(paypal.captures, 1);

  // Bank transfer only: no choice to make, in the course checkout too.
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await card("Bayar langsung dengan Midtrans")
    .locator(".admin-dev-switch")
    .click();
  await saved("Simpan pengaturan pembayaran");
  await paypalCard.locator(".admin-dev-switch").click();
  await saved("Simpan pengaturan PayPal");
  assert.equal(
    (
      await guest.request.post(base + "/api/payments?locale=id", {
        headers: { Origin: base },
        data: { method: "paypal", activity: "diving" },
      })
    ).status(),
    409,
  );
  // The admin switches the chime off on this device.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await countChimes();
  await a.getByRole("button", { name: "Notifikasi reservasi" }).click();
  const soundSwitch = a.getByLabel("Bunyi saat booking masuk");
  assert.equal(await soundSwitch.isChecked(), true);
  if (shots)
    await a
      .locator(".admin-popover")
      .screenshot({ path: shots + "/admin-bell-sound.png" });
  await soundSwitch.uncheck();
  assert.equal(
    await a.evaluate(() => localStorage.getItem("zanclus-admin-sound")),
    "off",
  );
  await a.getByRole("button", { name: "Tes bunyi" }).click();
  assert.equal(await chimes(), 1);

  await page.goto(base + "/id/course", { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    Object.keys(document.querySelector(".course-item") ?? {}).some((key) =>
      key.startsWith("__reactFiber"),
    ),
  );
  await page.getByRole("button", { name: "Pilih kursus ini" }).first().click();
  await page.locator("#course-date").waitFor({ state: "visible" });
  await page.locator("#course-date").fill(plusDays(3));
  await page.locator("#course-participants").fill("1");
  await page.locator("#course-name").fill("Tamu Kursus Transfer");
  await page.locator("#course-birth").fill("1998-02-03");
  await page.locator("#course-whatsapp").fill("081234567890");
  await page.locator("#course-email").fill("tamu.kursus@example.com");
  await page.locator("#course-swim").selectOption("basic");
  await page.getByLabel("Sehat, tidak ada kondisi medis").check();
  await page.locator("#course-wetsuit").selectOption("L");
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pembayaran" })
    .click();
  assert.equal(await page.locator(".pay-methods").count(), 0);
  assert.match(
    await page.locator(".course-checkout .pay-submit").textContent(),
    /^Lanjut ke transfer bank/,
  );
  assert.match(
    await page.locator(".course-checkout .pay-notes").textContent(),
    /Nomor rekening tampil setelah ini[\s\S]*Tanggalmu kami tahan sampai batas waktu transfer/,
  );
  await page.locator(".course-checkout .pay-submit").click();
  await page.waitForURL(/\/payment\/finish\?order_id=/);
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "transferPending",
  );
  assert.match(
    await page.locator(".zs-details").textContent(),
    /Total transfer[\s\S]*Batas transfer/,
  );
  assert.match(
    await page.locator(".zs-account").textContent(),
    /a\.n\. PT Zanclus Dive Center/,
  );
  // Without the chime the note still shows.
  await look();
  await a.locator(".admin-alert-toast").waitFor();
  assert.match(
    await a.locator(".admin-alert-toast").textContent(),
    /Tamu Kursus Transfer/,
  );
  assert.equal(await chimes(), 1);

  // On a phone, the note stays inside the screen.
  await a.setViewportSize({ width: 390, height: 844 });
  await a.waitForTimeout(500);
  const box = await a.locator(".admin-alert-toast").boundingBox();
  assert.ok(box.x >= 16 && box.x + box.width <= 374, JSON.stringify(box));
  assert.ok(box.y + box.height <= 844 - 16, JSON.stringify(box));
  if (shots)
    await a.screenshot({ path: shots + "/admin-booking-toast-phone.png" });

  assert.deepEqual(errors, []);
  console.log(
    "PASS checkout-methods: transfer needs an account, PayPal key status and connection test, rate example, team notice address; the guest picks Midtrans, transfer or PayPal with the button and small print following; a transfer order shows the account, total and deadline, holds its date, emails the team (reply to the guest) and the guest; the open admin rings, counts it in the title and opens it in the form; marking it paid sends the invoice without a ring; PayPal charges USD at the rate, captures once on return, confirms with an invoice and a paid notice; cancel on PayPal cancels, an unapproved return takes nothing; with transfer only there is no choice (course checkout); the chime can be switched off per device and tested; the note fits a 390px screen. Nothing sent to Midtrans, PayPal or a mailbox.",
  );
} finally {
  await browser.close();
  smtp.server.close();
  paypal.server.close();
  midtrans.server.close();
}
