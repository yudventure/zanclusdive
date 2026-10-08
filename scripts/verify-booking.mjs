import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { bookingDates, bookingReference } from "../src/booking-model.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3202";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Mutations require a local test server.",
);
if (process.env.CMS_MODE === "mysql")
  assert.ok(
    process.env.MYSQL_DATABASE?.endsWith("_test"),
    "Use a dedicated MySQL test database.",
  );
const origin = new URL(base).origin,
  headers = { Origin: origin };
const credentials =
  process.env.CMS_MODE === "mysql"
    ? { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    : demoAccount;
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  timezoneId: "America/Los_Angeles",
});
const page = await context.newPage(),
  api = context.request;
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const prefix = "Booking Test " + randomUUID().slice(0, 8);
const addDays = (days) => {
  const date = new Date(bookingDates().today + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const date = addDays(3),
  closedDate = addDays(2),
  created = new Set();
let originals;
const state = async () => {
  const response = await api.get(base + "/api/admin/state");
  assert.equal(response.status(), 200);
  return response.json();
};
const post = (data) => api.post(base + "/api/bookings", { headers, data });
const request = () => ({
  requestId: randomUUID(),
  name: prefix + " API",
  phone: "+62 851 9084 9237",
  date,
  people: "2",
  experience: "beginner",
  notes: "Data contoh pengujian",
});
async function chooseDate(target) {
  const month = target.slice(0, 7);
  for (let i = 0; i < 13; i++) {
    const present = await page
      .locator("#calendar-grid button")
      .first()
      .getAttribute("data-date");
    if (present.startsWith(month)) break;
    await page.locator("#next-month").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#calendar-grid").getAttribute("aria-busy") ===
        "false",
    );
  }
  await page.locator(`#calendar-grid [data-date="${target}"]`).click();
  assert.equal(
    await page.evaluate(() => document.activeElement.dataset.date),
    target,
    "Date selection preserves keyboard focus",
  );
}
async function fillBooking(name) {
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="phone"]').fill("+62 851 9084 9237");
  await page.locator('input[name="people"]').fill("2");
  await page
    .locator('textarea[name="notes"]')
    .fill("Pemula, perlu perlengkapan diving.");
}
async function centered() {
  assert.equal(
    await page.locator("#booking-dialog").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        Math.abs(r.x + r.width / 2 - innerWidth / 2) < 2 &&
        Math.abs(r.y + r.height / 2 - innerHeight / 2) < 2
      );
    }),
    true,
  );
}
try {
  assert.equal((await api.get(base + "/api/admin/state")).status(), 401);
  assert.equal(
    (
      await api.post(base + "/api/admin/bookings", { headers, data: {} })
    ).status(),
    401,
  );
  assert.equal(
    (
      await api.post(base + "/api/bookings", {
        headers: { Origin: "https://other.example" },
        data: request(),
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await api.post(base + "/api/admin/login", { headers, data: credentials })
    ).status(),
    200,
  );
  originals = structuredClone((await state()).content);

  for (const patch of [
    { date: addDays(-1) },
    { people: 31 },
    { phone: "abc" },
    { date: "2026-02-31" },
  ]) {
    assert.equal((await post({ ...request(), ...patch })).status(), 400);
  }
  const duplicate = {
    ...request(),
    status: "confirmed",
    source: "agent",
    amount: 999999,
  };
  const responses = await Promise.all([
    post(duplicate),
    post(duplicate),
    post(duplicate),
  ]);
  assert.deepEqual(responses.map((r) => r.status()).sort(), [200, 200, 201]);
  const receipts = await Promise.all(responses.map((r) => r.json()));
  assert.deepEqual(receipts[0], receipts[1]);
  const bookings = (await state()).bookings.filter(
    (b) => b.guestName === duplicate.name,
  );
  assert.equal(bookings.length, 1, "Concurrent retries create one CMS booking");
  const booking = bookings[0];
  created.add(booking.id);
  assert.equal(booking.status, "pending");
  assert.equal(booking.source, "website");
  assert.equal(booking.amount, 0);
  assert.equal(receipts[0].reference, bookingReference(booking.id));
  assert.equal(receipts[0].demo, process.env.CMS_MODE !== "mysql");
  for (const field of ["guestName", "phone", "notes", "id", "bookings"])
    assert.equal(receipts[0][field], undefined);
  assert.equal((await post({ ...duplicate, name: "Changed" })).status(), 409);

  const closure = await api.post(base + "/api/admin/bookings", {
    headers,
    data: {
      experience: "beginner",
      status: "closed",
      source: "walkin",
      startDate: closedDate,
      endDate: closedDate,
      guestName: "",
      phone: "",
      participants: 1,
      amount: 0,
      notes: prefix + " Closed",
    },
  });
  assert.equal(closure.status(), 201);
  created.add((await closure.json()).id);
  const availability = await api.get(
    base + `/api/bookings?experience=beginner&month=${closedDate.slice(0, 7)}`,
  );
  assert.equal(availability.status(), 200);
  assert.equal(availability.headers()["cache-control"], "no-store");
  const calendar = await availability.json();
  assert.equal(
    calendar.today,
    bookingDates().today,
    "Calendar uses WIT despite overseas browser timezone",
  );
  assert.ok(calendar.closed.some((b) => b.startDate === closedDate));
  assert.equal(
    JSON.stringify(calendar).includes(prefix),
    false,
    "Availability does not disclose guest details",
  );
  assert.equal((await post({ ...request(), date: closedDate })).status(), 409);
  const snapshot = await state(),
    disabled = structuredClone(snapshot.content);
  disabled.experiences.beginner.enabled = false;
  assert.equal(
    (
      await api.put(base + "/api/admin/settings", {
        headers,
        data: { content: disabled, version: snapshot.version },
      })
    ).status(),
    200,
  );
  assert.equal((await post(request())).status(), 409);
  assert.equal(
    (
      await api.put(base + "/api/admin/settings", {
        headers,
        data: { content: originals, version: (await state()).version },
      })
    ).status(),
    200,
  );

  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#calendar-book").isDisabled(), true);
  await chooseDate(date);
  assert.equal(
    await page
      .locator(`#calendar-grid [data-date="${closedDate}"]`)
      .isDisabled(),
    true,
  );
  await page.locator("#calendar-experience").selectOption("explorer");
  await page.waitForFunction(
    () =>
      document.querySelector("#calendar-grid").getAttribute("aria-busy") ===
      "false",
  );
  assert.equal(
    await page
      .locator(`#calendar-grid [data-date="${closedDate}"]`)
      .isDisabled(),
    false,
    "Closure affects its own program",
  );
  await page.locator("#calendar-experience").selectOption("beginner");
  await page.waitForFunction(
    () =>
      document.querySelector("#calendar-grid").getAttribute("aria-busy") ===
      "false",
  );
  await chooseDate(date);
  await page
    .locator("#calendar")
    .screenshot({ path: "artifacts/booking-calendar-desktop.png" });
  await page.locator("#calendar-book").click();
  await centered();
  assert.equal(await page.locator('input[name="date"]').inputValue(), date);
  await fillBooking(prefix + " Desktop");
  await page
    .locator("#booking-dialog")
    .screenshot({ path: "artifacts/booking-form-desktop.png" });

  // Commit on the server, then lose the response: retry must recover the receipt.
  const route = async (r) => {
    if (r.request().method() !== "POST") return r.continue();
    assert.equal((await r.fetch()).status(), 201);
    await r.abort("connectionfailed");
  };
  await page.route("**/api/bookings", route);
  await page.locator('#booking-form button[type="submit"]').click();
  await page.locator("#booking-error").waitFor({ state: "visible" });
  assert.equal(await page.locator("#booking-result").isVisible(), false);
  assert.equal(
    await page.locator('input[name="name"]').inputValue(),
    prefix + " Desktop",
  );
  await page.unroute("**/api/bookings", route);
  await page.locator('#booking-form button[type="submit"]').click();
  await page.locator("#booking-result").waitFor({ state: "visible" });
  await centered();
  const desktop = (await state()).bookings.filter(
    (b) => b.guestName === prefix + " Desktop",
  );
  assert.equal(desktop.length, 1);
  created.add(desktop[0].id);
  const reference = bookingReference(desktop[0].id);
  assert.ok(
    (await page.locator("#booking-reference").textContent()).includes(
      reference,
    ),
  );
  assert.ok(
    decodeURIComponent(
      await page.locator("#send-whatsapp").getAttribute("href"),
    ).includes(reference),
  );
  assert.equal(await page.locator("#booking-summary script").count(), 0);
  await page
    .locator("#booking-dialog")
    .screenshot({ path: "artifacts/booking-success-desktop.png" });
  const download = page.waitForEvent("download");
  await page.locator("#download-plan").click();
  assert.match((await download).suggestedFilename(), /^zanclus-rencana-/);
  await page.locator("#booking-dialog .close-modal").click();

  await page.goto(base + "/admin/reservations", { waitUntil: "networkidle" });
  await page
    .locator(".admin-table")
    .getByText(reference, { exact: true })
    .waitFor();
  await page.screenshot({
    path: "artifacts/booking-cms-reservations.png",
    fullPage: true,
  });
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  if (date.slice(0, 7) !== bookingDates().today.slice(0, 7))
    await page.getByRole("button", { name: "Bulan berikut" }).click();
  await page
    .locator(".calendar-booking.pending")
    .filter({ hasText: prefix + " Desktop" })
    .waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "networkidle" });
  await chooseDate(date);
  await page.locator("#calendar-book").click();
  await centered();
  await fillBooking(prefix + " Mobile");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator("#booking-dialog")
    .screenshot({ path: "artifacts/booking-form-mobile.png" });
  await page.locator('#booking-form button[type="submit"]').click();
  await page.locator("#booking-result").waitFor({ state: "visible" });
  await centered();
  await page
    .locator("#booking-dialog")
    .screenshot({ path: "artifacts/booking-success-mobile.png" });
  await page.locator("#edit-plan").click();
  assert.equal(
    await page.locator('input[name="name"]').inputValue(),
    "",
    "New booking is an explicit fresh form",
  );
  await page.keyboard.press("Escape");
  for (const b of (await state()).bookings)
    if (b.guestName.startsWith(prefix)) created.add(b.id);

  let blockCalendar = true;
  await page.route("**/api/bookings?**", (r) =>
    blockCalendar
      ? r.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Test unavailable"}',
        })
      : r.continue(),
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#calendar-book").isDisabled(), true);
  assert.equal(await page.locator("#calendar-retry").isVisible(), true);
  blockCalendar = false;
  await page.locator("#calendar-retry").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#calendar-grid").getAttribute("aria-busy") ===
      "false",
  );
  assert.equal(await page.locator("#calendar-retry").isVisible(), false);
  await chooseDate(date);
  assert.equal(await page.locator("#calendar-book").isEnabled(), true);
  let throttled = false;
  for (let i = 0; i < 25; i++) {
    const response = await post(duplicate);
    if (response.status() === 429) {
      assert.equal(response.headers()["retry-after"], "900");
      throttled = true;
      break;
    }
    assert.equal(response.status(), 200);
  }
  assert.equal(throttled, true, "Repeated submissions are rate limited");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: calendar booking, WIT, private availability, admin closures, disabled programs, validation, concurrent and lost-response deduplication, CMS pending reservations, WhatsApp references, download, centered desktop/mobile and calendar retry.",
  );
} finally {
  if (originals) {
    const latest = await state();
    await api.put(base + "/api/admin/settings", {
      headers,
      data: { content: originals, version: latest.version },
    });
    for (const b of latest.bookings)
      if (b.guestName.startsWith(prefix) || b.notes === prefix + " Closed")
        created.add(b.id);
    for (const id of created)
      await api.delete(base + "/api/admin/bookings/" + id, { headers });
  }
  await browser.close();
}
