import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { slotCalendar } from "../src/booking-model.js";
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
// The checkout date is picked from the days with their places left.
async function pickDate(date) {
  const day = page.locator(`.plan-dates .slot-day[data-date="${date}"]`);
  if (!(await day.count()))
    await page
      .locator(".plan-dates")
      .getByRole("button", { name: "Next month" })
      .click();
  if ((await day.getAttribute("aria-pressed")) !== "true") await day.click();
}
async function fillForm(name, participants = "2") {
  await page.locator("#inquiry-name").fill(name);
  await page.locator("#inquiry-whatsapp").fill("081234567890");
  await page.locator("#inquiry-email").fill("tamu@example.com");
  await pickDate(today);
  await page.locator("#inquiry-participants").fill(participants);
}
try {
  // Switched off: the summary leads to WhatsApp.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".plan-steps li").last().textContent(),
    "3WhatsApp",
  );
  assert.match(
    await page.locator(".plan-next").textContent(),
    /^Continue to summary\b/,
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
    await a.locator(".admin-dev-master .admin-pay-checks").textContent(),
    /Server key Midtrans terpasang[\s\S]*Mode sandbox/,
  );
  assert.match(
    await a.locator(".admin-pay-urls").textContent(),
    /\/api\/payments\/midtrans/,
  );
  await a.locator(".admin-dev-master .admin-dev-switch").click();
  await a.getByRole("button", { name: "Simpan pengaturan pembayaran" }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();
  // The admin checks that Midtrans accepts the server key.
  await a.getByRole("button", { name: "Tes koneksi Midtrans" }).click();
  await a.getByText("Berhasil: Midtrans menerima server key ini.").waitFor();

  // A guest who is sure pays for two Discovery Dives for today.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.deepEqual(await page.locator(".plan-steps li").allTextContents(), [
    "1Your details",
    "2Summary",
    "3Payment",
  ]);
  // Packages go into a cart from the price cards, like the Dive Shop; the
  // cart bar and its checkout appear with the first package.
  assert.equal(await page.locator(".activity-cart-bar").count(), 0);
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  assert.match(
    await page.locator(".plan-cart").textContent(),
    /Discovery Dive\s*IDR\s?1,200,000 \/ person/,
  );
  assert.match(
    await page.locator(".activity-cart-bar").textContent(),
    /Cart · 1 package[\s\S]*Total to pay IDR\s?1,200,000/,
  );
  await page.locator(".activity-cart-bar .button").click();
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
  await page
    .getByRole("button", { name: "Tambahkan Discovery Dive ke keranjang" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
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
  // It is also an order of two packages, added from the cards and the panel,
  // and an add-on from the checkout.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
  // Without a date, the checkout starts at the days and their places.
  assert.equal(
    await page.evaluate(() =>
      Boolean(document.activeElement.closest("#inquiry-date .slot-grid")),
    ),
    true,
  );
  await page.locator(".plan-add").selectOption({ index: 1 });
  assert.equal(await page.locator(".plan-cart li").count(), 2);
  await page
    .getByRole("button", { name: "Add the Documentation add-on" })
    .click();
  assert.equal(await page.locator(".plan-cart li").count(), 3);
  await fillForm("Tamu Cek", "1");
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  assert.equal(
    (await page.locator(".plan-summary-list dd").nth(1).textContent()).split(
      "\n",
    ).length,
    2,
  );
  assert.equal(
    await page.locator(".plan-summary-list dd").nth(2).textContent(),
    "Documentation × 1 day",
  );
  await page.locator(".pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const checkId = new URL(page.url()).pathname.split("/").pop();
  assert.equal(mock.orders.get(checkId).items.length, 3);
  assert.deepEqual(
    mock.orders
      .get(checkId)
      .items.filter((item) => item.id.startsWith("addon-"))
      .map((item) => [item.id, item.price, item.quantity]),
    [["addon-extras-dokumentasi", 500000, 1]],
  );
  assert.equal(
    mock.orders.get(checkId).amount,
    mock.orders
      .get(checkId)
      .items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  mock.orders.get(checkId).status = "settlement";
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a
    .locator("tr", { hasText: checkId })
    .getByRole("button", { name: "Cek status" })
    .click();
  await a.getByText("Status pembayaran diperbarui dari Midtrans.").waitFor();
  assert.equal((await order(checkId)).payment.status, "paid");
  // An add-on alone, or one renamed since the page loaded, is refused.
  for (const [lines, status, error] of [
    [
      [{ addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 }],
      400,
      "Add-ons come with at least one main package.",
    ],
    [
      [
        { item: 0, itemName: "Discovery Dive", quantity: 1 },
        { addOn: "extras-dokumentasi", itemName: "Foto", quantity: 1 },
      ],
      409,
      "The price list was just updated. Please reload the page.",
    ],
  ]) {
    const refused = await page.request.post(base + "/api/payments?locale=en", {
      headers: { Origin: base, "x-real-ip": "203.0.113.7" },
      data: {
        activity: "diving",
        lines,
        name: "Tamu Add-on",
        whatsapp: "081234567890",
        email: "",
        notes: "",
        date: today,
        participants: 1,
      },
    });
    assert.equal(refused.status(), status);
    assert.equal((await refused.json()).error, error);
  }

  // Every other form pays with Midtrans too. pay() opens the payment page
  // from a summary and returns the Midtrans order.
  async function pay(tab, settle = true) {
    await tab.locator(".pay-panel .pay-submit").click();
    await tab.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
    const id = new URL(tab.url()).pathname.split("/").pop();
    if (settle) {
      await tab.locator("#settle").click();
      await tab.waitForURL(/\/payment\/finish/);
      assert.equal(
        await tab.locator("[data-status]").getAttribute("data-status"),
        "paid",
      );
    }
    return id;
  }
  const plusDays = (n) =>
    new Date(Date.parse(today + "T00:00:00Z") + n * 864e5)
      .toISOString()
      .slice(0, 10);

  // Homepage Dive Shop: buy a dive computer and rent a mask for 2 days.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await page.locator("#dive-shop").scrollIntoViewIfNeeded();
  await page
    .locator(".shop-item", { hasText: "Dive computer" })
    .locator("button")
    .first()
    .click();
  await page.getByRole("tab").nth(1).click();
  const rental = page.locator(".shop-item").first();
  const rentalName = await rental.locator("h4").textContent();
  await rental.locator("button").first().click();
  await page.locator(".shop-cart-bar .button").click();
  const checkout = page.locator(".shop-checkout");
  await checkout.waitFor({ state: "visible" });
  assert.match(await checkout.textContent(), /bayar online lewat Midtrans/);
  await checkout.locator('input[autocomplete="name"]').fill("Tamu Toko");
  await checkout.locator('input[type="tel"]').fill("081234567890");
  await checkout.locator('input[type="number"]').fill("2");
  await checkout.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  assert.equal(await checkout.locator(".pay-total").count(), 0);
  const shopTotal = await checkout
    .locator(".shop-checkout-totals div")
    .last()
    .textContent();
  assert.match(shopTotal, /^Total dibayar/);
  const shopId = await pay(page);
  const shopOrder = mock.orders.get(shopId);
  assert.equal(shopOrder.items.length, 2);
  assert.deepEqual(
    [
      shopOrder.items[0].name,
      shopOrder.items[0].price,
      shopOrder.items[0].quantity,
    ],
    ["Beli Dive computer", 4200000, 1],
  );
  assert.equal(
    shopOrder.items[1].name,
    `Sewa ${rentalName} (2 hari)`.slice(0, 50),
  );
  assert.equal(
    shopOrder.amount,
    shopOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  );
  assert.equal(shopTotal.replace(/\D/g, ""), String(shopOrder.amount));
  assert.match(
    await page.locator(".zs-details").textContent(),
    /Dive Shop[\s\S]*Beli Dive computer × 1, Sewa/,
  );
  booking = await order(shopId);
  assert.deepEqual(
    [booking.experience, booking.status, booking.startDate, booking.endDate],
    ["shop", "confirmed", today, plusDays(1)],
  );

  // Dive course: two people, paid for both.
  await page.goto(base + "/id/course", { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    Object.keys(document.querySelector(".course-item") ?? {}).some((key) =>
      key.startsWith("__reactFiber"),
    ),
  );
  // "Choose this course" opens the full sign-up; when sure, pay in full.
  await page.getByRole("button", { name: "Pilih kursus ini" }).first().click();
  await page.locator("#course-date").waitFor({ state: "visible" });
  const courseName = await page
    .locator("#course-select option:checked")
    .textContent();
  await page.locator("#course-date").fill(plusDays(3));
  await page.locator("#course-participants").fill("2");
  await page.locator("#course-name").fill("Tamu Kursus");
  await page.locator("#course-birth").fill("1998-02-03");
  await page.locator("#course-whatsapp").fill("081234567890");
  await page.locator("#course-email").fill("tamu.kursus@example.com");
  await page.locator("#course-swim").selectOption("basic");
  await page.getByLabel("Sehat, tidak ada kondisi medis").check();
  await page.locator("#course-wetsuit").selectOption("L");
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pembayaran" })
    .click();
  assert.equal(
    await page.locator("#plan-summary-title").textContent(),
    "Ringkasan pembayaran",
  );
  assert.match(
    await page.locator(".course-checkout .pay-submit").textContent(),
    /^Yakin\? Bayar penuh Rp/,
  );
  assert.match(
    await page.locator(".course-checkout .pay-unsure").textContent(),
    /^Belum yakin\? Tanya dulu lewat WhatsApp/,
  );
  const courseId = await pay(page);
  const courseOrder = mock.orders.get(courseId);
  assert.equal(courseOrder.items[0].quantity, 2);
  assert.ok(courseName.startsWith(courseOrder.items[0].name));
  booking = await order(courseId);
  assert.deepEqual(
    [booking.experience, booking.startDate, booking.participants],
    ["course", plusDays(3), 2],
  );
  // The answers are kept on the booking for the team.
  assert.match(
    booking.notes,
    /Tanggal lahir: 1998-02-03[\s\S]*Berenang: Bisa, tapi belum lancar[\s\S]*Kesehatan: Sehat, tidak ada kondisi medis[\s\S]*Ukuran wetsuit: L/,
  );
  assert.equal(booking.email, "tamu.kursus@example.com");

  // Gear service: the regulator, dropped off in two days.
  await page.goto(base + "/id/service#regulator", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector('input[value="regulator"]')?.checked,
  );
  await page.locator("#service-name").fill("Tamu Servis");
  await page.locator("#service-whatsapp").fill("081234567890");
  await page.locator("#service-date").fill(plusDays(2));
  await page.getByRole("button", { name: /Lanjut ke pembayaran/ }).click();
  const serviceId = await pay(page, false);
  assert.equal(mock.orders.get(serviceId).amount, 650000);
  booking = await order(serviceId);
  assert.deepEqual(
    [booking.experience, booking.status, booking.payment.status],
    ["service", "pending", "pending"],
  );

  // Dive Shop page: a refused transaction shows in the admin with its cause.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  await page.getByLabel("Nama kamu").fill("Tamu Halaman Shop");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  mock.failNext = {
    status: 401,
    message:
      "Access denied due to unauthorized transaction, please check client or server key",
  };
  await page.locator(".pay-panel .pay-submit").click();
  await page
    .locator(".pay-panel .activity-error", {
      hasText: "Pembayaran belum bisa dibuat",
    })
    .waitFor();
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  assert.match(
    await a.locator(".admin-pay-last-error").textContent(),
    /saat membuat pembayaran[\s\S]*401 · Access denied[\s\S]*Midtrans menolak server key/,
  );
  // Trying again goes through, and the refusal is no longer shown.
  const pageShopId = await pay(page, false);
  assert.equal(mock.orders.get(pageShopId).amount, 650000);
  assert.equal((await order(pageShopId)).experience, "shop");
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  assert.equal(await a.locator(".admin-pay-last-error").count(), 0);

  // Still unsure: the same summary goes to WhatsApp instead.
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
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
  // Diving takes 30 people a day: 29 booked leaves one place, shown in the
  // calendar and checked on the server; a full day cannot be chosen.
  // An open day with no divers booked yet in the demo data.
  const current = await state();
  const slots = slotCalendar(current.content, current.bookings, "diving", {
    today,
    last: "2099-12-31",
  });
  const taken = (date) =>
    date === today ||
    slots.used[date] ||
    slots.closed.some(([from, to]) => date >= from && date <= to);
  let busy = today;
  for (let n = 3; taken(busy); n++)
    busy = new Date(Date.parse(today + "T12:00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const walkIn = (participants) =>
    admin.request.post(base + "/api/admin/bookings", {
      headers: { Origin: base },
      data: {
        experience: "beginner",
        status: "confirmed",
        source: "walkin",
        startDate: busy,
        endDate: busy,
        guestName: "Rombongan",
        phone: "",
        participants,
        amount: 0,
        notes: "",
      },
    });
  assert.equal((await walkIn(29)).status(), 201);
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  const slotDay = page.locator(`.slot-calendar .slot-day[data-date="${busy}"]`);
  if (busy.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole("button", { name: "Next month" }).click();
  assert.match(await slotDay.getAttribute("class"), /is-low/);
  assert.equal(await slotDay.locator("small").textContent(), "1");
  await slotDay.click();
  assert.match(
    await page.locator(".slot-picked").textContent(),
    /1 of 30 places left/,
  );
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.getByRole("button", { name: "Checkout for this date" }).click();
  await fillForm("Tamu Penuh", "2");
  await pickDate(busy);
  assert.match(
    await page.locator(".plan-dates .slot-note").textContent(),
    /\. 1 of 30 places left\.$/,
  );
  assert.equal(
    await page
      .locator(`.plan-dates .slot-day[data-date="${busy}"] small`)
      .textContent(),
    "1",
  );
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  assert.equal(
    await page.locator(".activity-error").textContent(),
    "Only 1 place is left on this date. Choose fewer participants or another date.",
  );
  const crowded = await page.request.post(base + "/api/payments?locale=en", {
    headers: { Origin: base, "x-real-ip": "203.0.113.9" },
    data: {
      activity: "diving",
      lines: [{ item: 0, itemName: "Discovery Dive", quantity: 2 }],
      name: "Tamu Penuh",
      whatsapp: "081234567890",
      email: "",
      notes: "",
      date: busy,
      participants: 2,
    },
  });
  assert.equal(crowded.status(), 409);
  assert.equal(
    (await crowded.json()).error,
    "Only 1 place is left on this date. Choose fewer participants or another date.",
  );
  assert.equal(
    (await state()).bookings.filter((b) => b.guestName === "Tamu Penuh").length,
    0,
  );
  assert.equal((await walkIn(1)).status(), 201);
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  if (busy.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole("button", { name: "Next month" }).click();
  assert.match(await slotDay.getAttribute("class"), /is-full/);
  assert.equal(await slotDay.isDisabled(), true);
  assert.equal(await slotDay.locator("small").textContent(), "Full");
  // Snorkeling has no daily limit unless the owner sets one.
  await page.goto(base + "/snorkeling", { waitUntil: "networkidle" });
  if (busy.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole("button", { name: "Next month" }).click();
  assert.match(
    await page
      .locator(`.slot-calendar .slot-day[data-date="${busy}"]`)
      .getAttribute("class"),
    /is-open/,
  );

  // Switched off again: no pay option.
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  await a.locator(".admin-dev-master .admin-dev-switch").click();
  await a.getByRole("button", { name: "Simpan pengaturan pembayaran" }).click();
  await a.getByText("Pengaturan pembayaran tersimpan.").waitFor();
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".plan-steps li").last().textContent(),
    "3WhatsApp",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS payments: daily limit of 30 divers in the calendar, checkout and server, off by default (summary then WhatsApp), Midtrans connection test, admin switch with key status and Midtrans URLs, package cart from the price cards and the panel (like the Dive Shop) with the cart bar, per-person quantity following participants, 30-participant limit, a two-package order, payment summary before Midtrans, Midtrans order and items, settled payment confirms the booking on its date and shows in the calendar and payment list, signed notifications only, unknown orders ignored, expiry cancels, tampered amount refused, status check without notification, homepage shop cart (buy + rent) priced on the server and confirmed on its dates, course for two from the sign-up window with its answers on the booking, gear service, Dive Shop page with a refused transaction shown in the admin with its cause and a retry, still-unsure summary to WhatsApp with package and estimate, back to paying and editing keeps details. Nothing sent to Midtrans.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
