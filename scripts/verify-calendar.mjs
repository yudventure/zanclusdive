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
  const cell = page.locator(".slot-calendar .slot-day.is-today");
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
  await page.locator(".slot-calendar .slot-day.is-today").click();
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
  // Event banners: two with the owner's photos are on from the start; the
  // dive trip draft shows only while its event is on, with its flyer.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const shown = page.locator(".event-banner");
  await shown.first().scrollIntoViewIfNeeded();
  assert.equal(await shown.count(), 2);
  assert.equal(await page.locator(".event-banner.has-photo").count(), 2);
  for (const bg of await page.locator(".event-banner-bg").all()) {
    await bg.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (img) => img.complete && img.naturalWidth > 0,
      await bg.elementHandle(),
    );
  }
  assert.match(
    await shown.first().textContent(),
    /DISCOVERY DIVE[\s\S]*Menyelam pertama di Raja Ampat[\s\S]*Rp 1\.200\.000 \/ orang/,
  );
  assert.equal(
    await shown
      .first()
      .getByRole("link", { name: "Info lengkap" })
      .getAttribute("href"),
    "/id/diving#prices",
  );
  for (const box of await Promise.all(
    (await shown.all()).map((b) => b.boundingBox()),
  ))
    assert.ok(box.height <= 180, "photo banners stay short");
  // Between the section title and the experience cards.
  assert.equal(
    await page.evaluate(() =>
      document
        .querySelector("#experiences .section-heading")
        .nextElementSibling.classList.contains("event-banners"),
    ),
    true,
  );
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/photo-banners-desktop.png",
    clip: {
      x: 0,
      y: Math.max(0, (await shown.first().boundingBox()).y - 160),
      width: 1440,
      height: 560,
    },
  });
  await page.goto(base + "/admin/events", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Banner event" }).click();
  const banners = page.locator("fieldset.admin-price-item");
  assert.equal(await banners.count(), 3);
  assert.match(
    await banners.first().locator("legend").textContent(),
    /Tampil sekarang/,
  );
  const banner = banners.nth(2);
  assert.equal(
    await banner.getByLabel("Judul (Indonesia)").inputValue(),
    "Dive Trip with Zanclus",
  );
  assert.match(await banner.locator("legend").textContent(), /Tidak tampil/);
  const days = (n) =>
    new Date(Date.parse(today + "T12:00:00Z") + n * 864e5)
      .toISOString()
      .slice(0, 10);
  // The fun dive banner off, the dive trip on with its dates.
  await banners.nth(1).getByLabel("Tampilkan di beranda").uncheck();
  await banner.getByLabel("Tampilkan di beranda").check();
  await banner.getByLabel("Tanggal mulai event").fill(days(10));
  await banner
    .getByLabel("Tanggal selesai event (banner hilang setelahnya)")
    .fill(days(17));
  await page.getByRole("button", { name: "Simpan kalender" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  assert.match(await banner.locator("legend").textContent(), /Tampil sekarang/);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await shown.first().scrollIntoViewIfNeeded();
  // The event with dates comes first, beside the discovery dive.
  assert.deepEqual(await shown.locator("h3").allTextContents(), [
    "Dive Trip with Zanclus",
    "Menyelam pertama di Raja Ampat",
  ]);
  const trip = shown.first();
  assert.match(
    await trip.textContent(),
    /EVENT[\s\S]*Raja Ampat The Last Paradise · 8 hari 7 malam[\s\S]*\$1\.680 \/ pax[\s\S]*Minimal 4 pax/,
  );
  // Dates are written tight, without spaces round the dash.
  assert.doesNotMatch(
    await trip.locator(".event-banner-dates").textContent(),
    /\s–|–\s/,
  );
  assert.ok((await trip.boundingBox()).height <= 170, "the banner stays short");
  const book = new URL(
    await trip
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
      y: Math.max(0, (await trip.boundingBox()).y - 160),
      width: 1440,
      height: 560,
    },
  });
  await trip.getByRole("button", { name: "Lihat flyer", exact: true }).click();
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
    await page.locator(".event-banner").first().textContent(),
    /\$1,680 \/ pax[\s\S]*Minimum 4 pax[\s\S]*Book on WhatsApp/,
  );
  assert.match(
    await page.locator(".event-banner").nth(1).textContent(),
    /Your first dive in Raja Ampat[\s\S]*IDR 1,200,000 \/ person/,
  );
  assert.equal(
    await page
      .locator(".event-banner")
      .nth(1)
      .getByRole("link", { name: "Full details" })
      .getAttribute("href"),
    "/diving#prices",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const phone = page.locator(".event-banners");
  await phone.scrollIntoViewIfNeeded();
  for (const box of await Promise.all(
    (await page.locator(".event-banner").all()).map((b) => b.boundingBox()),
  ))
    assert.ok(box.height <= 260, "short on a phone too");
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
  // Into the discovery dive's background photo.
  await page
    .locator("fieldset.admin-price-item")
    .first()
    .locator('input[type="file"]')
    .first()
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
  assert.match(saved.content.calendar.banners[0].background, /^\/api\/media\//);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.match(
    await page
      .locator(".event-banner.has-photo .event-banner-bg")
      .getAttribute("src"),
    /^\/api\/media\//,
  );
  // Unsafe links are refused; after the event the banner is gone.
  const current = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  for (const [field, value] of [
    ["link", "javascript:alert(1)"],
    ["background", "http://example.com/a.jpg"],
  ]) {
    const unsafe = structuredClone(current.content);
    unsafe.calendar.banners[0][field] = value;
    assert.equal(
      (
        await context.request.put(base + "/api/admin/settings", {
          headers,
          data: { content: unsafe, version: current.version },
        })
      ).status(),
      400,
    );
  }
  const over = structuredClone(current.content);
  for (const b of over.calendar.banners) {
    b.startDate = days(-9);
    b.endDate = days(-1);
  }
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
    "PASS event banners (two photo banners on by default, the dive trip draft off until switched on with dates, event first, shown between the experiences title and cards while the event is on, short on desktop and phone, WhatsApp button with the event, flyer window, English, one-step background photo upload, unsafe link and photo refused, gone after the event), side calendar: old address redirects to the diving calendar, on every activity page with the best months on diving, daily places, spots, ocean care, admin adds an activity shown on today's cell and in the picked day, month navigation from this month, mobile without horizontal scroll.",
  );
} finally {
  await browser.close();
}
