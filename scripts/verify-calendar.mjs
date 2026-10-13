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
  // The calendar lives on the diving page; the old address redirects there.
  for (const [path, target] of [
    ["/calendar", "/diving#calendar"],
    ["/id/calendar", "/id/diving#calendar"],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(page.url(), base + target);
  }
  await page.goto(base + "/", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('#navigation a[href$="/calendar"]').count(),
    0,
  );
  await page.goto(base + "/id/diving", { waitUntil: "networkidle" });
  await page.locator('.activity-jump-links a[href="#calendar"]').click();
  // The side calendar replaced the plan panel and the events calendar.
  assert.equal(
    await page.locator("#calendar h2").textContent(),
    "Pilih tanggal diving.",
  );
  assert.equal(await page.locator(".calendar-grid").count(), 0);
  assert.equal(await page.locator(".activity-inquiry").count(), 0);
  assert.equal(await page.locator(".season-strip").count(), 0);
  // Every activity has the calendar; the best months are for diving.
  for (const path of ["/snorkeling", "/trip"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".slot-calendar").count(), 1, path);
    assert.equal(await page.locator(".slot-seasons").count(), 0, path);
  }
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".slot-seasons h3").textContent(),
    "The best months to dive",
  );
  assert.equal(await page.locator(".slot-seasons li").count(), 12);
  assert.equal(await page.locator(".slot-seasons li.is-current").count(), 1);
  assert.match(
    await page.locator(".slot-intro").textContent(),
    /up to 30 people for diving a day/,
  );
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
  await page.goto(base + "/diving", { waitUntil: "networkidle" });
  const cell = page.locator(".slot-day.is-today");
  assert.match(await cell.getAttribute("class"), /has-events/);
  assert.match(await cell.locator("small").textContent(), /^\d+$/);
  await cell.click();
  assert.match(
    await page.locator(".slot-picked").textContent(),
    /of 30 places left/,
  );
  assert.match(
    await page.locator(".slot-events").textContent(),
    /Waisai jetty clean-up · Waisai/,
  );
  // Months from this one to a year ahead.
  const before = await page.locator(".slot-month-bar h3").textContent();
  assert.equal(
    await page.getByRole("button", { name: "Previous month" }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Next month" }).click();
  assert.notEqual(
    await page.locator(".slot-month-bar h3").textContent(),
    before,
  );
  await page.getByRole("button", { name: "Previous month" }).click();
  assert.equal(await page.locator(".slot-month-bar h3").textContent(), before);
  await page.goto(base + "/id/diving", { waitUntil: "networkidle" });
  await page.locator(".slot-day.is-today").click();
  assert.match(
    await page.locator(".slot-events").textContent(),
    /Bersih dermaga Waisai/,
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
    "PASS side calendar: old address redirects to the diving calendar, on every activity page with the best months on diving, daily places, spots, ocean care, admin adds an activity shown on today's cell and in the picked day, month navigation from this month, mobile without horizontal scroll.",
  );
} finally {
  await browser.close();
}
