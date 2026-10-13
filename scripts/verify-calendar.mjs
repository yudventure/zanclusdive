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
  // Event banner: off by default, shown on the homepage only while the
  // event is on, with its flyer.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".event-banner").count(), 0);
  await page.goto(base + "/admin/events", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Banner event" }).click();
  const banner = page.locator("fieldset.admin-price-item").first();
  assert.equal(
    await banner.getByLabel("Judul (Indonesia)").inputValue(),
    "Dive Trip with Zanclus",
  );
  assert.match(await banner.locator("legend").textContent(), /Tidak tampil/);
  const days = (n) =>
    new Date(Date.parse(today + "T12:00:00Z") + n * 864e5)
      .toISOString()
      .slice(0, 10);
  await banner.getByLabel("Tampilkan di beranda").check();
  await banner.getByLabel("Tanggal mulai event").fill(days(10));
  await banner
    .getByLabel("Tanggal selesai event (banner hilang setelahnya)")
    .fill(days(17));
  await page.getByRole("button", { name: "Simpan kalender" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  assert.match(await banner.locator("legend").textContent(), /Tampil sekarang/);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const shown = page.locator(".event-banner");
  await shown.scrollIntoViewIfNeeded();
  assert.equal(await shown.count(), 1);
  assert.equal(
    await shown.locator("h3").textContent(),
    "Dive Trip with Zanclus",
  );
  assert.match(
    await shown.textContent(),
    /EVENT[\s\S]*Raja Ampat The Last Paradise · 8 hari 7 malam[\s\S]*\$1\.680 \/ pax[\s\S]*Minimal 4 pax/,
  );
  assert.ok(
    (await shown.boundingBox()).height <= 170,
    "the banner stays short",
  );
  // Between the section title and the experience cards.
  assert.equal(
    await page.evaluate(() =>
      document
        .querySelector("#experiences .section-heading")
        .nextElementSibling.classList.contains("event-banners"),
    ),
    true,
  );
  const book = new URL(
    await shown
      .getByRole("link", { name: "Daftar lewat WhatsApp" })
      .getAttribute("href"),
  );
  assert.equal(book.hostname, "wa.me");
  assert.match(
    book.searchParams.get("text"),
    /tertarik dengan Dive Trip with Zanclus \(.+\)/,
  );
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/event-banner-desktop.png",
    clip: {
      x: 0,
      y: Math.max(0, (await shown.boundingBox()).y - 160),
      width: 1440,
      height: 520,
    },
  });
  await shown.getByRole("button", { name: "Lihat flyer", exact: true }).click();
  const flyer = page.locator(".event-flyer[open]");
  await flyer.waitFor();
  assert.equal(
    await flyer
      .locator("img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".event-flyer[open]").count(), 0);
  // English, and a phone.
  await page.goto(base + "/", { waitUntil: "networkidle" });
  assert.match(
    await page.locator(".event-banner").textContent(),
    /\$1,680 \/ pax[\s\S]*Minimum 4 pax[\s\S]*Book on WhatsApp/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const phone = page.locator(".event-banner");
  await phone.scrollIntoViewIfNeeded();
  assert.ok((await phone.boundingBox()).height <= 260, "short on a phone too");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll with the banner",
  );
  await phone.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/event-banner-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 950 });
  // A new photo is placed and saved in one step.
  await page.goto(base + "/admin/events", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Banner event" }).click();
  const photo = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b4f6c";
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = "#ffd84d";
    ctx.fillRect(60, 60, 480, 200);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page
    .locator("fieldset.admin-price-item")
    .first()
    .locator('input[type="file"]')
    .setInputFiles({
      name: "event.png",
      mimeType: "image/png",
      buffer: Buffer.from(photo),
    });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
  const saved = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  assert.match(saved.content.calendar.banners[0].image, /^\/api\/media\//);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.match(
    await page.locator(".event-banner-photo img").getAttribute("src"),
    /^\/api\/media\//,
  );
  // Unsafe links are refused; after the event the banner is gone.
  const current = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  const unsafe = structuredClone(current.content);
  unsafe.calendar.banners[0].link = "javascript:alert(1)";
  assert.equal(
    (
      await context.request.put(base + "/api/admin/settings", {
        headers,
        data: { content: unsafe, version: current.version },
      })
    ).status(),
    400,
  );
  const over = structuredClone(current.content);
  over.calendar.banners[0].startDate = days(-9);
  over.calendar.banners[0].endDate = days(-1);
  assert.equal(
    (
      await context.request.put(base + "/api/admin/settings", {
        headers,
        data: { content: over, version: current.version },
      })
    ).status(),
    200,
  );
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".event-banner").count(), 0);

  assert.deepEqual(errors, []);
  console.log(
    "PASS event banner (off by default, shown between the experiences title and cards while the event is on, short on desktop and phone, WhatsApp button with the event, flyer window, English, one-step photo upload, unsafe link refused, gone after the event), side calendar: old address redirects to the diving calendar, on every activity page with the best months on diving, daily places, spots, ocean care, admin adds an activity shown on today's cell and in the picked day, month navigation from this month, mobile without horizontal scroll.",
  );
} finally {
  await browser.close();
}
