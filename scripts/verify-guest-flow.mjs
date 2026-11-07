// The guests beside the reservation calendar: who came in the last seven
// days, who is out today and who arrives in the next seven, with the
// activity filter, a tap that opens the reservation, and the narrow screen.
// Run against a demo server started with CMS_DEMO_LOGIN=true
// CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const plus = (n) =>
  new Date(Date.parse(today + "T00:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const api = (path, method = "GET", data) =>
  context.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const book = (patch) =>
  api("/api/admin/bookings", "POST", {
    status: "confirmed",
    source: "whatsapp",
    phone: "",
    amount: 0,
    notes: "",
    email: "",
    lang: "id",
    participants: 2,
    experience: "diving",
    ...patch,
  });
const on = (n, patch) => ({ startDate: plus(n), endDate: plus(n), ...patch });

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  for (const patch of [
    on(-1, {
      guestName: "Grup Kemarin",
      participants: 12,
      endDate: plus(1),
      phone: "0812 3456 7890",
    }),
    on(-3, { guestName: "Tamu Tiga Hari Lalu", experience: "snorkeling" }),
    on(-9, { guestName: "Tamu Lama" }),
    on(0, { guestName: "Keluarga Hari Ini", participants: 4 }),
    on(1, {
      guestName: "Rombongan Besok",
      experience: "trip",
      status: "pending",
    }),
    on(5, { guestName: "Tamu Lima Hari", experience: "snorkeling" }),
    on(10, { guestName: "Tamu Jauh" }),
    on(2, { guestName: "Tamu Batal", status: "cancelled" }),
  ])
    assert.equal((await book(patch)).status(), 201);

  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const flow = page.locator(".admin-guest-flow");
  await flow.waitFor();
  assert.equal(await flow.locator("h2").textContent(), "Sudah dan akan datang");
  const tab = (name) =>
    flow.getByRole("button", { name: new RegExp("^" + name) });
  const names = () => flow.locator(".admin-day-name").allTextContents();
  const days = () => flow.locator(".admin-flow-day h3").allTextContents();

  // Today first: who arrives today, then who is still out.
  assert.equal(await tab("Hari ini").getAttribute("aria-pressed"), "true");
  const now = await names();
  assert.ok(now.indexOf("Keluarga Hari Ini") >= 0, now.join());
  assert.ok(
    now.indexOf("Keluarga Hari Ini") < now.indexOf("Grup Kemarin"),
    now.join(),
  );
  assert.match(
    await flow
      .locator(".admin-day-person", { hasText: "Grup Kemarin" })
      .textContent(),
    /Diving · 12 orang · hari 2 dari 3 · WhatsApp/,
  );
  assert.match((await days())[0], /Hari ini/);
  if (shots) await flow.screenshot({ path: `${shots}/guest-flow-today.png` });

  // Arrived in the last seven days, yesterday first.
  await tab("Sudah datang").click();
  const past = await names();
  assert.ok(
    past.indexOf("Grup Kemarin") >= 0 &&
      past.indexOf("Grup Kemarin") < past.indexOf("Tamu Tiga Hari Lalu"),
    past.join(),
  );
  assert.ok(!past.includes("Tamu Lama"), "nine days ago is left out");
  assert.ok(!past.includes("Keluarga Hari Ini"));
  assert.match((await days())[0], /Kemarin · 12 orang$/);
  if (shots) await flow.screenshot({ path: `${shots}/guest-flow-past.png` });

  // Arriving in the next seven days, tomorrow first; cancelled and later
  // ones left out.
  await tab("Akan datang").click();
  const next = await names();
  assert.ok(
    next.indexOf("Rombongan Besok") >= 0 &&
      next.indexOf("Rombongan Besok") < next.indexOf("Tamu Lima Hari"),
    next.join(),
  );
  assert.ok(!next.includes("Tamu Jauh") && !next.includes("Tamu Batal"));
  assert.match((await days())[0], /Besok · 2 orang$/);
  assert.match(
    await flow
      .locator(".admin-day-person", { hasText: "Rombongan Besok" })
      .textContent(),
    /Belum dikonfirmasi/,
  );
  const count = Number(await tab("Akan datang").locator("b").textContent());
  assert.equal(count, next.length);
  if (shots) await flow.screenshot({ path: `${shots}/guest-flow-next.png` });

  // The activity picked above the calendar narrows the list.
  await page.getByLabel("Filter kegiatan").selectOption("snorkeling");
  assert.deepEqual(await names(), ["Tamu Lima Hari"]);
  assert.match(await flow.textContent(), /Hanya Snorkeling\./);
  await tab("Sudah datang").click();
  assert.deepEqual(await names(), ["Tamu Tiga Hari Lalu"]);
  await page.getByLabel("Filter kegiatan").selectOption("all");

  // A tap opens the reservation in the full form.
  await tab("Hari ini").click();
  await flow.getByRole("button", { name: "Keluarga Hari Ini" }).click();
  const form = page.locator("#booking-editor");
  await form.waitFor();
  assert.equal(
    await form.getByLabel("Nama tamu").inputValue(),
    "Keluarga Hari Ini",
  );

  // Phones: the list sits under the day's agenda, without sideways scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await flow.scrollIntoViewIfNeeded();
  assert.ok(await flow.isVisible());
  const box = await flow.boundingBox();
  const agenda = await page.locator(".admin-day-side").boundingBox();
  assert.ok(box.y > agenda.y, "under the agenda");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll",
  );
  if (shots) await page.screenshot({ path: `${shots}/guest-flow-390.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS guest flow: today with arrivals first and the day of the trip, last 7 days from yesterday, next 7 days from tomorrow, cancelled and farther ones left out, counts on the tabs, activity filter, tap opens the reservation, 390px under the agenda.",
  );
} finally {
  await browser.close();
}
