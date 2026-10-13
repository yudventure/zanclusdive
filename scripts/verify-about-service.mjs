import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// The About page, the dive gear service page with its WhatsApp request, the
// menu that leads to them on every screen width, and their admin editors.
// Run against a local test server with CMS_DEMO_LOGIN=true.
const base = process.env.BASE_URL || "http://127.0.0.1:3124";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const uploadPhoto = async (slot, name) => {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#14506b";
    ctx.fillRect(0, 0, 1200, 700);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await slot.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(bytes),
  });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
};

try {
  // About: story, values, every service with its page, WhatsApp and map.
  await page.goto(base + "/id/about", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Dive center di jantung Raja Ampat.",
  );
  assert.equal(
    await page
      .locator('#about-navigation a[aria-current="page"]')
      .textContent(),
    "Tentang kami",
  );
  assert.equal(await page.locator(".about-story p").count(), 3);
  assert.equal(await page.locator(".about-values li").count(), 3);
  assert.deepEqual(
    await page
      .locator(".about-service")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
    [
      "/id/diving",
      "/id/snorkeling",
      "/id/trip",
      "/id/course",
      "/id/dive-shop",
      "/id/service",
    ],
  );
  assert.match(
    await page.locator(".about-visit a.button").getAttribute("href"),
    /^https:\/\/wa\.me\/\d+\?text=/,
  );
  assert.equal(
    await page.locator(".about-visit-link").getAttribute("href"),
    "/id#contact",
  );
  await page.goto(base + "/about", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "A dive center in the heart of Raja Ampat.",
  );
  assert.equal(
    await page.locator(".about-service strong").last().textContent(),
    "Gear service",
  );

  // Menu: About us on its own, the gear service under Dive Shop, footer.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('#navigation a[href="/id/about"]').textContent(),
    "Tentang kami",
  );
  assert.equal(
    await page
      .locator('#navigation .nav-sub a[href="/id/service"]')
      .textContent(),
    "Servis alat selam",
  );
  assert.equal(
    await page
      .locator('#navigation .nav-sub a[href="/id/dive-shop"]')
      .textContent(),
    "Katalog & rental",
  );
  assert.equal(
    await page.locator('.site-footer a[href="/id/service"]').count(),
    1,
  );
  assert.equal(
    await page.locator('.site-footer a[href="/id/about"]').count(),
    1,
  );
  // The homepage Dive Shop and the Dive Shop page lead to the service.
  assert.equal(
    await page.locator('.shop-teaser a[href="/id/service"]').count(),
    1,
  );
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  await page.locator(".shop-hero-service").click();
  await page.waitForURL(base + "/id/service");

  // The whole menu stays on one line from 1181px, a menu button below that,
  // on every kind of page.
  for (const path of ["/id", "/id/about", "/id/service", "/id/dive-shop"])
    for (const width of [1100, 1181, 1280, 1366, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(base + path, { waitUntil: "networkidle" });
      const header = await page.evaluate(() => {
        const nav = document.querySelector(".site-header nav");
        const tops = new Set(
          [...nav.children].map((c) =>
            Math.round(c.getBoundingClientRect().top),
          ),
        );
        return {
          hidden: getComputedStyle(nav).display === "none",
          oneLine: tops.size === 1,
          clear:
            nav.getBoundingClientRect().right <=
            document.querySelector(".header-actions").getBoundingClientRect()
              .left,
        };
      });
      if (width < 1181) assert.ok(header.hidden, `menu button at ${width}`);
      else
        assert.ok(
          header.oneLine && header.clear,
          `${path} menu on one line at ${width}`,
        );
    }
  await page.setViewportSize({ width: 1440, height: 900 });

  // Service: list with starting prices, choose, estimate, WhatsApp message.
  await page.goto(base + "/id/service", { waitUntil: "networkidle" });
  await page.locator("#service-date[min]").waitFor({ state: "attached" });
  assert.equal(await page.locator(".service-item").count(), 6);
  assert.match(
    await page.locator("#regulator .service-item-price").textContent(),
    /Mulai\s*Rp\s?650\.000\s*\/ set/,
  );
  assert.equal(
    await page.locator("#service-navigation .nav-sub a.current").textContent(),
    "Servis alat selam",
  );
  await page.getByRole("button", { name: "Siapkan pesan WhatsApp" }).click();
  await page.getByText("Pilih minimal satu servis.").waitFor();
  await page
    .locator("#regulator")
    .getByRole("button", { name: "Pilih servis ini" })
    .click();
  assert.equal(
    await page.locator('input[name="services"][value="regulator"]').isChecked(),
    true,
  );
  await page.locator('input[name="services"][value="bcd"]').check();
  assert.equal(
    await page.locator("#bcd").getAttribute("class"),
    "service-item is-selected",
  );
  assert.match(
    await page.locator(".service-request .activity-price").textContent(),
    /Perkiraan biaya mulai\s*Rp\s?950\.000/,
  );
  assert.equal(
    await page.locator(".service-next").textContent(),
    "Lanjut ke formulir (2 servis dipilih) ↓",
  );
  // A #service link ticks that service, also on the open page.
  await page.goto(base + "/id/service#tank", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector('input[value="tank"]').checked,
  );
  await page.locator("#service-name").fill("Tamu Servis");
  await page.locator("#service-whatsapp").fill("081234567890");
  const date = await page.evaluate(() =>
    new Date(Date.now() + 5 * 864e5).toLocaleDateString("en-CA"),
  );
  await page.locator("#service-date").fill(date);
  await page.locator("#service-notes").fill("Regulator Mares, berat");
  await page.getByRole("button", { name: "Siapkan pesan WhatsApp" }).click();
  const link = page.getByRole("link", { name: "Lanjutkan ke WhatsApp" });
  const message = new URL(await link.getAttribute("href")).searchParams.get(
    "text",
  );
  assert.match(
    message,
    /Servis: Servis regulator, Servis BCD, Inspeksi visual tabung/,
  );
  assert.match(message, new RegExp("Rencana antar alat: " + date));
  assert.match(message, /Alat dan keluhan: Regulator Mares, berat/);
  assert.doesNotMatch(message, /demo|contoh/i);
  await page.goto(base + "/service", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Well-kept gear, calmer dives.",
  );

  // Admin: prices, visibility, the cover photo and the About texts.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/service", { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "Servis alat selam" })
    .first()
    .waitFor();
  await page.getByLabel("Harga mulai (Rp)").first().fill("700000");
  await page.getByLabel("Tampilkan di website").last().uncheck();
  await page.getByRole("button", { name: "Simpan servis" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await uploadPhoto(page.locator(".admin-image-slot").first(), "bengkel.jpg");
  await page.goto(base + "/id/service", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".service-item").count(), 5);
  assert.match(
    await page.locator("#regulator .service-item-price").textContent(),
    /Rp\s?700\.000/,
  );
  assert.match(
    await page.locator(".activity-hero-photo").getAttribute("src"),
    /^\/api\/media\//,
  );

  await page.goto(base + "/admin/about", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Halaman Tentang kami" }).waitFor();
  await page.getByLabel("Judul (Indonesia)").first().fill("Tentang Zanclus.");
  await page.getByRole("button", { name: "+ Tambah poin" }).click();
  await page.getByLabel("Judul (Indonesia)").last().fill("Ramah keluarga");
  await page
    .getByLabel("Keterangan (Indonesia)")
    .last()
    .fill("Anak-anak ikut.");
  await page.getByRole("button", { name: "Simpan poin" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await uploadPhoto(page.locator(".admin-image-slot").first(), "tim.jpg");
  await page.goto(base + "/id/about", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "Tentang Zanclus.");
  assert.equal(await page.locator(".about-values li").count(), 4);
  assert.match(
    await page.locator(".activity-hero-photo").getAttribute("src"),
    /^\/api\/media\//,
  );

  // Phones: no sideways scroll, the menu opens with both new pages.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/id/about", "/id/service", "/about", "/service"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no sideways scroll on " + path,
    );
  }
  await page.goto(base + "/id/service", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  assert.ok(
    await page
      .locator("#service-navigation")
      .getByRole("link", { name: "Tentang kami" })
      .isVisible(),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS about & service: About story, values and six services with their pages, English copy, menu links (About us, Dive Shop › gear service), footer and Dive Shop links, one-line menu from 1181px and menu button below, service prices, choose and tick, estimate, #service link, WhatsApp request message, English service page, admin price, visibility and cover photo, About title, values and photo, 390px without sideways scroll. No messages sent.",
  );
} finally {
  await browser.close();
}
