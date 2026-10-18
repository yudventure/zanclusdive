// Fares Standard, Comfort and Flexi, from the checkout to the guest's own
// booking page and the admin. Run against a demo server started with
// CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// MIDTRANS_SERVER_KEY=SB-Mid-server-TEST
// MIDTRANS_SNAP_URL=http://127.0.0.1:3499 MIDTRANS_API_URL=http://127.0.0.1:3499
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { startMockMidtrans } from "./mock-midtrans.mjs";
import { intlLocale } from "../src/i18n.js";

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
const plus = (n) =>
  new Date(Date.parse(today + "T00:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);
const longDate = (date) =>
  new Date(date + "T12:00:00Z").toLocaleDateString(intlLocale.en, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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
const byOrder = async (orderId) =>
  (await state()).bookings.find((b) => b.payment?.orderId === orderId);
const byId = async (id) => (await state()).bookings.find((b) => b.id === id);

// A day in a month picker (checkout or the guest page).
async function pickDay(scope, date) {
  const day = scope.locator(`.slot-day[data-date="${date}"]`);
  if (!(await day.count()))
    await scope.getByRole("button", { name: "Next month" }).click();
  await day.click();
}
// Diving packages for the date and people, with the fare; returns the
// Midtrans order id once paid.
async function bookDiving({ fare, date, people, name, check }) {
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
  await page.locator("#inquiry-participants").fill(String(people));
  await page.locator("#inquiry-name").fill(name);
  await page.locator("#inquiry-whatsapp").fill("081234567890");
  await page.locator("#inquiry-email").fill("fare@example.com");
  await pickDay(page.locator(".plan-dates"), date);
  if (fare !== "Standard")
    await page
      .locator(".plan-fare", { hasText: fare })
      .locator("input")
      .check();
  await check?.();
  await page
    .getByRole("button", { name: "Continue to payment summary" })
    .click();
  await page.locator(".plan-summary .pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const orderId = new URL(page.url()).pathname.split("/").pop();
  await page.locator("#settle").click();
  await page.waitForURL(/\/payment\/finish/);
  return orderId;
}

try {
  assert.equal(
    (
      await admin.request.post(base + "/api/admin/login", {
        headers: { Origin: base },
        data: demoAccount,
      })
    ).status(),
    200,
  );
  const first = await state();
  // Content saved before fares gets the defaults: Comfort +10%, Flexi +20%,
  // refund up to 7 days and a new date up to 2 days before.
  assert.deepEqual(first.content.fares, {
    enabled: true,
    comfort: { enabled: true, percent: 10 },
    flexi: { enabled: true, percent: 20 },
    refundDays: 7,
    rescheduleDays: 2,
  });
  first.content.payments.enabled = true;
  assert.equal(
    (
      await admin.request.put(base + "/api/admin/settings", {
        headers: { Origin: base },
        data: { content: first.content, version: first.version },
      })
    ).status(),
    200,
  );

  // Comfort on diving: the picker shows each fare's share of the packages
  // (not of the add-ons), the summary and Midtrans carry the increase.
  const comfortId = await bookDiving({
    fare: "Comfort",
    date: plus(10),
    people: 2,
    name: "Tamu Comfort",
    check: async () => {
      assert.match(
        await page.locator(".plan-fares").textContent(),
        /Choose your fare[\s\S]*Standard[\s\S]*Base price[\s\S]*No refund[\s\S]*Comfort[\s\S]*\+IDR\s?240,000[\s\S]*up to 2 days before[\s\S]*Flexi[\s\S]*\+IDR\s?480,000[\s\S]*refund up to 7 days before/,
      );
      assert.match(
        await page.locator(".plan-package .pay-total").textContent(),
        /Comfort fare \(\+10%\) IDR\s?240,000\s*IDR\s?2,640,000/,
      );
    },
  });
  let sent = mock.orders.get(comfortId);
  assert.equal(sent.amount, 2640000);
  assert.deepEqual(
    sent.items.map((i) => [i.id, i.price, i.quantity]),
    [
      ["diving-0", 1200000, 2],
      ["fare-comfort", 240000, 1],
    ],
  );
  assert.match(
    await page.locator(".zs-details").textContent(),
    /Comfort fare \(\+10%\)[\s\S]*IDR\s?2,640,000/,
  );
  let booking = await byOrder(comfortId);
  assert.deepEqual(booking.payment.fare, {
    tier: "comfort",
    percent: 10,
    markup: 240000,
    refundDays: 7,
    rescheduleDays: 2,
    refundable: 2400000,
  });
  assert.match(booking.notes, /Tarif Comfort/);
  assert.match(booking.payment.manageToken, /^[0-9a-f-]{36}$/);

  // The payment result links to the guest's own page.
  await page.getByRole("link", { name: "Manage booking" }).click();
  await page.waitForURL(/\/booking\//);
  const manageUrl = page.url();
  assert.equal(
    await page.locator("h1").textContent(),
    "Your booking with Zanclus",
  );
  assert.match(
    await page.locator(".manage-fare").textContent(),
    new RegExp(
      `Fare Comfort \\+10%[\\s\\S]*Change the date until ${longDate(plus(8))}`,
    ),
  );
  assert.equal(await page.locator(".manage-refund").count(), 0);
  // A new date two days later, checked against the places that day.
  await pickDay(page.locator(".manage-move"), plus(12));
  await page.getByRole("button", { name: "Save the new date" }).click();
  await page
    .locator(".manage-notice", {
      hasText: `Your date is now ${longDate(plus(12))}`,
    })
    .waitFor();
  booking = await byOrder(comfortId);
  assert.equal(booking.startDate, plus(12));
  assert.equal(booking.endDate, plus(12));
  assert.deepEqual(
    booking.reschedules.map(({ from, to, by }) => [from, to, by]),
    [[plus(10), plus(12), "guest"]],
  );
  assert.match(
    await page.locator(".manage-history").textContent(),
    new RegExp(`${longDate(plus(10))} to ${longDate(plus(12))}`),
  );
  // A wrong key, another site or a full day are refused.
  const id = booking.id;
  const token = booking.payment.manageToken;
  const post = (body, origin = base) =>
    page.request.post(`${base}/api/booking/${id}?locale=en`, {
      headers: { Origin: origin },
      data: body,
    });
  assert.equal(
    (await post({ t: "nope", action: "reschedule", date: plus(14) })).status(),
    404,
  );
  assert.equal(
    (
      await post(
        { t: token, action: "reschedule", date: plus(14) },
        "https://elsewhere.example",
      )
    ).status(),
    403,
  );
  // Comfort has no refund.
  const noRefund = await post({ t: token, action: "refund" });
  assert.equal(noRefund.status(), 409);
  assert.match((await noRefund.json()).error, /can no longer be cancelled/);
  // Fill plus(15) to the 30 daily dive places, then try to move there.
  const full = await admin.request.post(base + "/api/admin/bookings", {
    headers: { Origin: base },
    data: {
      experience: "diving",
      status: "confirmed",
      source: "walkin",
      startDate: plus(15),
      endDate: plus(15),
      guestName: "Rombongan penuh",
      phone: "",
      participants: 30,
      amount: 0,
      notes: "",
    },
  });
  assert.equal(full.status(), 201, await full.text());
  const fullDay = await post({
    t: token,
    action: "reschedule",
    date: plus(15),
  });
  assert.equal(fullDay.status(), 409);
  assert.match((await fullDay.json()).error, /full/);
  await page.goto(base + "/booking/" + id + "?t=nope", {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page.locator("[data-status]").getAttribute("data-status"),
    "404",
  );

  // Flexi on one diver: the guest cancels and gets the base price back.
  const flexiId = await bookDiving({
    fare: "Flexi",
    date: plus(9),
    people: 1,
    name: "Tamu Flexi",
  });
  assert.equal(mock.orders.get(flexiId).amount, 1440000);
  await page.getByRole("link", { name: "Manage booking" }).click();
  await page.waitForURL(/\/booking\//);
  assert.match(
    await page.locator(".manage-fare").textContent(),
    new RegExp(
      `Fare Flexi \\+20%[\\s\\S]*Change the date until ${longDate(plus(7))}[\\s\\S]*Cancel for a refund of IDR\\s?1,200,000 until ${longDate(plus(2))}`,
    ),
  );
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page
    .getByRole("button", { name: /Yes, cancel and refund IDR\s?1,200,000/ })
    .click();
  await page
    .locator(".manage-state", {
      hasText: "The refund of IDR 1,200,000 is being processed",
    })
    .waitFor();
  booking = await byOrder(flexiId);
  assert.equal(booking.status, "cancelled");
  assert.equal(booking.payment.status, "paid");
  assert.equal(booking.payment.refund.status, "requested");
  assert.equal(booking.payment.refund.amount, 1200000);
  // The team marks the refund as sent; it goes out in the cash book.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const row = a.locator("tr", { hasText: "Tamu Flexi" });
  assert.match(await row.textContent(), /Tarif Flexi[\s\S]*Refund diminta/);
  await row.getByRole("button", { name: "Edit" }).click();
  const box = a.locator(".admin-fare-box");
  assert.match(
    await box.textContent(),
    /Tarif Flexi \+20%[\s\S]*Kenaikan tarif Rp\s?240\.000[\s\S]*Refund diminta Rp\s?1\.200\.000/,
  );
  await box.getByLabel("Catatan refund (mis. nomor transfer)").fill("TRF-0042");
  await box
    .getByRole("button", { name: "Tandai refund sudah dikirim" })
    .click();
  await a
    .getByText("Refund ditandai sudah dikirim dan masuk Buku kas.")
    .waitFor();
  booking = await byOrder(flexiId);
  assert.equal(booking.payment.refund.status, "done");
  assert.equal(booking.payment.refund.note, "TRF-0042");
  const month = today.slice(0, 7);
  const cash = await (
    await admin.request.get(
      `${base}/api/admin/finance/transactions?month=${month}`,
    )
  ).json();
  const lines = cash.transactions ?? cash;
  const refundLine = lines.find((tx) => tx.id === "tx:rf:" + booking.id);
  assert.ok(refundLine, "the refund is in the cash book");
  assert.deepEqual(
    [refundLine.kind, refundLine.category, refundLine.amount],
    ["out", "refund", 1200000],
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.match(
    await page.locator(".manage-state").textContent(),
    /the refund of IDR\s?1,200,000 was sent on/,
  );

  // Standard: the date is only moved by the team, nothing to do here.
  await bookDiving({
    fare: "Standard",
    date: plus(4),
    people: 1,
    name: "Tamu Standard",
  });
  assert.equal(
    await page
      .locator(".zs-details")
      .textContent()
      .then((t) => /Standard fare/.test(t)),
    true,
  );
  await page.getByRole("link", { name: "Manage booking" }).click();
  await page.waitForURL(/\/booking\//);
  assert.match(
    await page.locator(".manage-card").textContent(),
    /only moves the date when weather or sea conditions rule the day out/,
  );
  assert.equal(await page.locator(".manage-move").count(), 0);
  assert.equal(await page.locator(".manage-refund").count(), 0);

  // Comfort for tomorrow: the two days' notice has passed.
  await bookDiving({
    fare: "Comfort",
    date: plus(1),
    people: 1,
    name: "Tamu Besok",
  });
  await page.getByRole("link", { name: "Manage booking" }).click();
  await page.waitForURL(/\/booking\//);
  assert.equal(await page.locator(".manage-move").count(), 0);
  assert.match(
    await page.locator(".manage-card").textContent(),
    /Changing the date yourself was possible until/,
  );

  // Dive Shop rentals take a fare too; purchases do not.
  await page.goto(base + "/dive-shop?mode=rental", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: /to rent$/ })
    .first()
    .click();
  await page.locator("#order-name").fill("Tamu Sewa");
  await page.locator("#order-whatsapp").fill("081234567890");
  await page.locator("#order-start").fill(plus(5));
  await page.locator("#order-days").fill("2");
  const shopFares = page.locator(".shop-order-form .plan-fares");
  await shopFares.waitFor();
  await page
    .locator(".shop-order-form .plan-fare", { hasText: "Comfort" })
    .locator("input")
    .check();
  const rentTotal = await page.locator(".shop-total strong").textContent();
  await page.locator(".shop-submit").click();
  await page.locator(".shop-message .pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const rentId = new URL(page.url()).pathname.split("/").pop();
  const rent = mock.orders.get(rentId);
  const rentBase = rent.items
    .filter((i) => !i.id.startsWith("fare-"))
    .reduce((n, i) => n + i.price * i.quantity, 0);
  assert.deepEqual(rent.items.at(-1), {
    id: "fare-comfort",
    price: Math.round(rentBase * 0.1),
    quantity: 1,
    name: "Comfort fare (+10%)",
  });
  assert.match(
    rentTotal,
    new RegExp(String(rent.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")),
  );

  // The admin sets the fares; the checkout follows. Fares can be switched
  // off, and wrong numbers are refused.
  await a.goto(base + "/admin/prices", { waitUntil: "networkidle" });
  const card = a.locator(".admin-fares");
  await card.getByLabel("Kenaikan Comfort (%)").fill("15");
  await card
    .getByLabel("Refund paling lambat (hari sebelum tanggal)")
    .fill("10");
  assert.match(
    await card.locator(".admin-fare-preview").textContent(),
    /Comfort \+15%[\s\S]*Flexi \+20%[\s\S]*refund paling lambat 10 hari/,
  );
  await a
    .getByRole("button", { name: /Simpan/ })
    .first()
    .click();
  await a
    .getByText(/tersimpan/i)
    .first()
    .waitFor();
  assert.equal((await state()).content.fares.comfort.percent, 15);
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
  await page.locator("#inquiry-participants").fill("1");
  assert.match(
    await page.locator(".plan-fares").textContent(),
    /Comfort\+IDR\s?180,000[\s\S]*refund up to 10 days before/,
  );
  const bad = structuredClone((await state()).content);
  bad.fares.flexi.percent = 0;
  const refused = await admin.request.put(base + "/api/admin/settings", {
    headers: { Origin: base },
    data: { content: bad, version: (await state()).version },
  });
  assert.equal(refused.status(), 400);
  assert.match((await refused.json()).error, /Flexi harus 1–100 persen/);
  const off = structuredClone((await state()).content);
  off.fares.enabled = false;
  assert.equal(
    (
      await admin.request.put(base + "/api/admin/settings", {
        headers: { Origin: base },
        data: { content: off, version: (await state()).version },
      })
    ).status(),
    200,
  );
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Add Discovery Dive to the cart" })
    .click();
  await page.locator(".activity-cart-bar .button").click();
  assert.equal(await page.locator(".plan-fares").count(), 0);
  // An old page asking for a fare that is no longer offered is refused.
  const stale = await page.request.post(`${base}/api/payments?locale=en`, {
    headers: { Origin: base },
    data: {
      activity: "diving",
      lines: [{ item: 0, itemName: "Discovery Dive", quantity: 1 }],
      fare: "flexi",
      participants: 1,
      date: plus(6),
      name: "Tamu Lama",
      whatsapp: "081234567890",
    },
  });
  assert.equal(stale.status(), 409);

  // The guest page on a phone: no sideways scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(manageUrl, { waitUntil: "networkidle" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll on the guest page",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: process.env.SHOT_DIR + "/manage-booking-phone.png",
      fullPage: true,
    });
  assert.deepEqual(errors, []);
  console.log(
    "PASS fares: defaults, Comfort priced on the packages and sent to Midtrans, the guest page from the payment result, a new date with places checked, wrong key 404, other site 403, no refund on Comfort, a full day refused, Flexi cancelled for the base price, the team marking the refund sent and the cash book line, Standard without actions, tomorrow's Comfort past its notice, a Dive Shop rental with its fare line, admin percent and days followed by the checkout, a wrong percent refused, fares switched off and a stale fare refused, the guest page on a phone.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
