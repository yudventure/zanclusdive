import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import mysql from "mysql2/promise";
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3005";
assert.ok(
  process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    process.env.MYSQL_DATABASE,
  "Provide local test environment.",
);
assert.ok(
  process.env.MYSQL_DATABASE.endsWith("_test"),
  "CMS tests require a dedicated database ending in _test.",
);
assert.equal(
  process.env.CMS_MODE,
  "mysql",
  "MySQL CMS tests require CMS_MODE=mysql.",
);
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const origin = new URL(baseURL).origin;
await context.request.get(baseURL);
const { defaultContent } = await import("../src/cms-model.js");
await pool.execute("DELETE FROM zanclus_records WHERE kind='booking'");
await pool.execute(
  "UPDATE zanclus_records SET payload=?,version=1 WHERE id='site'",
  [JSON.stringify(defaultContent)],
);
await pool.execute("DELETE FROM zanclus_media");
await pool.execute("DELETE FROM zanclus_login_attempts");
await mkdir("artifacts", { recursive: true });
await page.goto(baseURL + "/admin", { waitUntil: "networkidle" });
assert.equal(
  await page
    .getByRole("heading", { name: "Selamat datang kembali." })
    .isVisible(),
  true,
);
assert.equal(
  (await context.request.get(baseURL + "/api/admin/state")).status(),
  401,
);
assert.equal(
  (
    await context.request.post(baseURL + "/api/admin/bookings", {
      headers: { Origin: origin },
      data: {},
    })
  ).status(),
  401,
);
assert.equal(
  (
    await context.request.post(baseURL + "/api/admin/login", {
      headers: { Origin: "https://evil.example" },
      data: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      },
    })
  ).status(),
  403,
);
const wrong = await context.request.post(baseURL + "/api/admin/login", {
  headers: { Origin: origin },
  data: { email: process.env.ADMIN_EMAIL, password: "wrong-password" },
});
assert.equal(wrong.status(), 401);
await page.getByLabel("Email admin").fill(process.env.ADMIN_EMAIL);
await page
  .getByLabel("Password", { exact: true })
  .fill(process.env.ADMIN_PASSWORD);
await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
await page.waitForURL("**/admin");
await page.getByText("Reservasi terbaru", { exact: true }).waitFor();
const cookie = (await context.cookies()).find(
  (c) => c.name === "zanclus_admin_session",
);
console.log("CMS login and session passed.");
assert.ok(cookie.httpOnly);
assert.equal(cookie.sameSite, "Lax");
const initial = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
assert.ok(initial.version >= 1);
const originals = structuredClone(initial.content);
await page.getByRole("link", { name: "Teks website", exact: true }).click();
await page
  .getByLabel("Judul hero — baris 1", { exact: true })
  .fill("Jelajahi bersama Zanclus,");
await page
  .getByRole("button", { name: "Simpan & tampilkan di website" })
  .click();
await page
  .getByRole("status")
  .filter({ hasText: "Perubahan sudah tersimpan" })
  .waitFor();
const publicPage = await context.newPage();
await publicPage.goto(baseURL, { waitUntil: "networkidle" });
assert.ok(
  (await publicPage.locator("#hero-title").textContent()).includes(
    "Jelajahi bersama Zanclus,",
  ),
);
const conflict = await context.request.put(baseURL + "/api/admin/settings", {
  headers: { Origin: origin },
  data: { content: originals, version: initial.version },
});
assert.equal(conflict.status(), 409);
console.log("CMS text publication and conflicts passed.");
const blocked = await context.request.put(baseURL + "/api/admin/settings", {
  headers: { Origin: "https://evil.example" },
  data: { content: originals, version: 1 },
});
assert.equal(blocked.status(), 403);
await page
  .getByRole("link", { name: "Kontak & sosial media", exact: true })
  .click();
await page
  .getByLabel("Nomor WhatsApp (kode negara, tanpa +)")
  .fill("6281234567890");
await page.getByLabel("Lokasi / alamat").fill("Lokasi pengujian CMS");
await page.getByRole("button", { name: "Simpan kontak", exact: true }).click();
await page.getByRole("status").waitFor();
await publicPage.reload({ waitUntil: "networkidle" });
assert.ok(
  (await publicPage.locator(".quick-service").getAttribute("href")).includes(
    "6281234567890",
  ),
);
assert.equal(
  await publicPage
    .getByText("Lokasi pengujian CMS", { exact: true })
    .isVisible(),
  true,
);
await page.getByRole("link", { name: "Foto & media", exact: true }).click();
await page.locator("input[type=file]").setInputFiles("public/assets/reef.webp");
await page.getByRole("button", { name: "Unggah gambar" }).click();
await page.getByRole("status").filter({ hasText: "Gambar diunggah" }).waitFor();
let snapshot = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
const asset = snapshot.media[0];
const response = await context.request.get(baseURL + asset.url);
assert.equal(response.status(), 200);
assert.equal(response.headers()["content-type"], "image/webp");
assert.equal(
  (await response.body()).length,
  (await readFile("public/assets/reef.webp")).length,
);
await page
  .getByLabel("Pilih gambar hero", { exact: true })
  .selectOption(asset.url);
await page.getByRole("button", { name: "Simpan gambar website" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Perubahan sudah tersimpan" })
  .waitFor();
await publicPage.reload({ waitUntil: "networkidle" });
assert.ok(
  (await publicPage.locator(".page-shell").getAttribute("style")).includes(
    asset.url,
  ),
);
const svg = await context.request.post(baseURL + "/api/admin/media", {
  headers: { Origin: origin },
  multipart: {
    file: {
      name: "test.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    },
  },
});
assert.equal(svg.status(), 400);
console.log("CMS contacts and persistent media passed.");
await page
  .getByRole("link", { name: "Pengalaman & harga", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Pengalaman & harga", exact: true })
  .waitFor();
const firstExperience = page.locator(".admin-card").first();
await firstExperience
  .getByLabel("Nama pengalaman", { exact: true })
  .fill("Mulai diving");
await firstExperience
  .getByLabel("Harga mulai (Rp), kosong bila belum ditetapkan")
  .fill("1250000");
await firstExperience.getByLabel("Durasi, opsional").fill("1 hari");
await page
  .locator(".admin-card")
  .nth(2)
  .getByLabel("Tampilkan di website")
  .uncheck();
await page
  .getByRole("button", { name: "Simpan pengalaman & harga", exact: true })
  .click();
await page
  .getByRole("status")
  .filter({ hasText: "Perubahan sudah tersimpan" })
  .waitFor();
await publicPage.reload({ waitUntil: "networkidle" });
assert.equal(
  await publicPage
    .locator('select[name="experience"] option[value="beginner"]')
    .textContent(),
  "Mulai diving",
);
const savedPrograms = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
assert.equal(savedPrograms.content.experiences.beginner.price, 1250000);
assert.equal(
  await publicPage
    .locator('select[name="experience"] option[value="specialty"]')
    .count(),
  0,
);
console.log("CMS prices, durations, and experience visibility passed.");

await page.getByRole("link", { name: "Kalender", exact: true }).click();
const label = await page.locator(".admin-title-row>span").textContent();
await page.getByRole("button", { name: "Bulan berikut" }).click();
assert.notEqual(
  await page.locator(".admin-title-row>span").textContent(),
  label,
);
await page.getByRole("button", { name: "Bulan ini", exact: true }).click();
const today = await page
  .locator("#booking-editor input[type=date]")
  .first()
  .inputValue();
await page.getByLabel("Nama tamu", { exact: true }).fill("Raka — uji CMS");
await page.getByLabel("Telepon / WhatsApp").fill("081234567890");
await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
await page.getByLabel("Jumlah peserta").fill("2");
await page.getByLabel("Nilai reservasi (Rp)").fill("2000000");
await page
  .getByRole("button", { name: "Simpan reservasi", exact: true })
  .click();
await page
  .getByRole("status")
  .filter({ hasText: "Reservasi tersimpan" })
  .waitFor();
assert.ok((await page.locator(".calendar-booking.confirmed").count()) > 0);
await page.reload({ waitUntil: "networkidle" });
await page.locator(".calendar-booking.confirmed").first().waitFor();
await page.screenshot({ path: "artifacts/admin-calendar.png", fullPage: true });
await page.locator(".calendar-booking.confirmed").first().click();
await page.getByLabel("Jumlah peserta").fill("3");
await page
  .getByRole("button", { name: "Simpan perubahan", exact: true })
  .click();
await page.getByRole("status").waitFor();
snapshot = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
assert.equal(
  snapshot.bookings.find((b) => b.guestName === "Raka — uji CMS").participants,
  3,
);
console.log("CMS booking create and update passed.");
await page.getByRole("link", { name: "Tamu", exact: true }).click();
await page.getByRole("heading", { name: "Tamu", exact: true }).waitFor();
await page
  .locator(".admin-table")
  .getByText("Raka — uji CMS", { exact: true })
  .waitFor();
const invalid = await context.request.post(baseURL + "/api/admin/bookings", {
  headers: { Origin: origin },
  data: {
    experience: "beginner",
    status: "confirmed",
    source: "whatsapp",
    startDate: "2026-02-31",
    endDate: "2026-03-02",
    guestName: "Invalid",
    participants: 1,
    amount: 0,
  },
});
assert.equal(invalid.status(), 400);
await page.goto(baseURL + "/admin/calendar", { waitUntil: "networkidle" });
await page.locator(".calendar-booking").first().waitFor();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/admin-mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.getByRole("button", { name: "Menu admin", exact: true }).click();
await page.getByRole("link", { name: "Reservasi", exact: true }).click();
await page.getByLabel("Cari reservasi").fill("Raka");
assert.ok(
  await page
    .locator(".admin-table")
    .getByText("Raka — uji CMS", { exact: true })
    .isVisible(),
);
const id = snapshot.bookings.find((b) => b.guestName === "Raka — uji CMS").id;
assert.equal(
  (
    await context.request.delete(baseURL + "/api/admin/bookings/" + id, {
      headers: { Origin: origin },
    })
  ).status(),
  200,
);
assert.equal(
  (
    await context.request.delete(baseURL + "/api/admin/bookings/" + id, {
      headers: { Origin: origin },
    })
  ).status(),
  404,
);
snapshot = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
const escaped = structuredClone(snapshot.content);
escaped.text.heroTitle1 = "<img src=x onerror=alert(1)>";
assert.equal(
  (
    await context.request.put(baseURL + "/api/admin/settings", {
      headers: { Origin: origin },
      data: { content: escaped, version: snapshot.version },
    })
  ).status(),
  200,
);
await publicPage.reload({ waitUntil: "networkidle" });
assert.ok(
  (await publicPage.locator("#hero-title").textContent()).includes(
    "<img src=x onerror=alert(1)>",
  ),
);
assert.equal(await publicPage.locator("#hero-title img").count(), 0);
snapshot = await (
  await context.request.get(baseURL + "/api/admin/state")
).json();
assert.equal(
  (
    await context.request.put(baseURL + "/api/admin/settings", {
      headers: { Origin: origin },
      data: { content: originals, version: snapshot.version },
    })
  ).status(),
  200,
);
const forged = await browser.newContext();
await forged.addCookies([
  { ...cookie, value: cookie.value.slice(0, -4) + "xxxx" },
]);
assert.equal(
  (await forged.request.get(baseURL + "/api/admin/state")).status(),
  401,
);
await forged.close();
assert.equal(
  (
    await context.request.post(baseURL + "/api/admin/logout", {
      headers: { Origin: origin },
      data: {},
    })
  ).status(),
  200,
);
assert.equal(
  (await context.request.get(baseURL + "/api/admin/state")).status(),
  401,
);
for (let i = 0; i < 8; i++)
  assert.equal(
    (
      await context.request.post(baseURL + "/api/admin/login", {
        headers: { Origin: origin },
        data: { email: process.env.ADMIN_EMAIL, password: "wrong-password" },
      })
    ).status(),
    401,
  );
assert.equal(
  (
    await context.request.post(baseURL + "/api/admin/login", {
      headers: { Origin: origin },
      data: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      },
    })
  ).status(),
  429,
);
await pool.execute("DELETE FROM zanclus_login_attempts WHERE id='owner'");
assert.deepEqual(errors, []);
await browser.close();
await pool.end();
console.log(
  "PASS CMS: MySQL persistence, auth, cookie protection, CSRF, rate limit, content publication, conflict handling, contact update, media upload, booking CRUD, calendar and mobile. No WhatsApp messages sent.",
);
