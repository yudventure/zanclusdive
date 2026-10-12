import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Run against a local demo server: CMS_MODE=demo npm start
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
try {
  // Linked from the homepage menu, in both languages.
  for (const [path, link, heading] of [
    ["/", "/calendar", "The Zanclus activity calendar."],
    ["/id", "/id/calendar", "Kalender kegiatan Zanclus."],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.locator(`#navigation a[href="${link}"]`).click();
    await page.waitForURL(base + link);
    assert.equal(await page.locator("h1").textContent(), heading);
    assert.equal(
      await page
        .locator('#calendar-navigation a[aria-current="page"]')
        .getAttribute("href"),
      link,
    );
  }
  assert.equal(await page.locator(".season-strip li").count(), 12);
  assert.equal(await page.locator(".season-strip li.is-current").count(), 1);
  assert.equal(await page.locator(".spot-grid li").count(), 6);
  assert.equal(await page.locator(".eco-grid li").count(), 5);
  assert.match(
    await page.locator(".eco-section > a.button").getAttribute("href"),
    /^https:\/\/wa\.me\/\d+\?text=/,
  );
  // The admin adds an activity today; it shows on today's cell and in the list.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/events", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "+ Tambah kegiatan" }).click();
  const item = page.locator("fieldset").last();
  await item.getByLabel("Tanggal").fill(today);
  await item.getByLabel("Jenis kegiatan").selectOption("eco");
  await item.getByLabel("Tempat").fill("Waisai");
  await item
    .getByLabel("Nama kegiatan (Indonesia)")
    .fill("Bersih dermaga Waisai");
  await item
    .getByLabel("Nama kegiatan (English)")
    .fill("Waisai jetty clean-up");
  await page.getByRole("button", { name: "Simpan kalender" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await page.goto(base + "/calendar", { waitUntil: "networkidle" });
  const cell = page.locator(".calendar-day.is-today");
  assert.match(await cell.getAttribute("class"), /has-events/);
  await cell.click();
  assert.match(
    await page.locator(".calendar-events-head h3").textContent(),
    /^Activities on /,
  );
  const event = page.locator(".calendar-event", {
    hasText: "Waisai jetty clean-up",
  });
  assert.equal(await event.count(), 1);
  assert.match(
    await event.locator(".calendar-chip").textContent(),
    /Ocean care/,
  );
  assert.match(
    decodeURIComponent(await event.locator("a").getAttribute("href")),
    /I'd like to join Waisai jetty clean-up on /,
  );
  await page.getByRole("button", { name: "Show the whole month" }).click();
  const before = await page.locator(".calendar-month-bar h3").textContent();
  await page.getByRole("button", { name: "Next month" }).click();
  assert.notEqual(
    await page.locator(".calendar-month-bar h3").textContent(),
    before,
  );
  await page.getByRole("button", { name: "Previous month" }).click();
  assert.equal(
    await page.locator(".calendar-month-bar h3").textContent(),
    before,
  );
  await page.goto(base + "/id/calendar", { waitUntil: "networkidle" });
  await page.locator(".calendar-day.is-today").click();
  assert.equal(
    await page
      .locator(".calendar-event", { hasText: "Bersih dermaga Waisai" })
      .count(),
    1,
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
  }
  assert.equal(
    (await context.request.get(base + "/id/calendar/x")).status(),
    404,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS calendar: menu link in both languages, season guide, spots, ocean care, admin adds an activity shown on today's cell and in the list, WhatsApp join link, month navigation, mobile without horizontal scroll.",
  );
} finally {
  await browser.close();
}
