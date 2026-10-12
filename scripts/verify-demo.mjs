import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3172";
// The Indonesian website (/id); English is served at the root.
const site = base + "/id";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Run demo mutation tests only on a local test server.");
const origin = new URL(base).origin;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Asia/Jayapura" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const api = context.request;
const headers = { Origin: origin };
let originals, bookingID;
async function state() {
  const response = await api.get(base + "/api/admin/state");
  assert.equal(response.status(), 200);
  return response.json();
}
async function save(content, version) {
  return api.put(base + "/api/admin/settings", { headers, data: { content, version } });
}
try {
  assert.equal((await api.get(base + "/api/admin/state")).status(), 401);
  assert.equal((await api.post(base + "/api/admin/login", { headers: { Origin: "https://other.example" }, data: demoAccount })).status(), 403);
  await page.goto(base + "/admin", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Selamat datang kembali." }).waitFor();
  assert.equal(await page.locator('input[name="email"]').inputValue(), demoAccount.email);
  assert.equal(await page.getByRole("button", { name: "Periksa koneksi database", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await page.getByRole("heading", { name: /^Selamat (pagi|siang|sore|malam), tim Zanclus\.$/ }).waitFor();
  assert.equal(await page.locator(".admin-kpi-grid .admin-stat").count(), 6);
  assert.equal(await page.locator(".admin-bar").count(), 7);
  await page.getByRole("button", { name: "30 hari", exact: true }).click();
  assert.equal(await page.locator(".admin-bar").count(), 30);
  assert.ok(await page.getByRole("link", { name: "Kalender kegiatan", exact: true }).first().isVisible());
  assert.equal(await page.getByRole("link", { name: "Teks website", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Pengaturan situs", exact: true }).click();
  // Nothing in the admin or on the public pages reads as a demo.
  assert.equal(await page.locator(".admin-demo-banner").count(), 0);
  assert.doesNotMatch((await page.locator(".admin-root").innerText()).replace(/Tamu Demo \d+/g, ""), /\bdemo\b|contoh/i);
  for (const path of ["/", "/id", "/diving", "/id/snorkeling", "/dive-shop", "/id/dive-shop"]) {
    const visitor = await context.newPage();
    await visitor.goto(base + path, { waitUntil: "domcontentloaded" });
    const text = (await visitor.locator("body").innerText()).replace(/Tamu Demo \d+/g, "");
    assert.doesNotMatch(text, /\bdemo\b|contoh demo|sample demo/i, path);
    await visitor.close();
  }
  const initial = await state();
  assert.equal(initial.mode, "demo");
  assert.equal(initial.bookings.length, 3);
  assert.ok(initial.bookings.every((booking) => booking.guestName.includes("Demo")));
  originals = initial.content;
  const guard = await api.post(base + "/api/admin/database-check", { headers, data: demoAccount });
  assert.equal(guard.status(), 400);
  assert.equal((await guard.json()).target, undefined);
  assert.equal((await api.put(base + "/api/admin/settings", { headers: { Origin: "https://other.example" }, data: initial })).status(), 403);

  await page.getByRole("link", { name: "Teks website", exact: true }).click();
  await page.getByLabel("Judul hero — baris 1", { exact: true }).fill("Demo Zanclus siap dipakai.");
  await page.getByRole("button", { name: "Simpan & tampilkan di website", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Perubahan sudah tersimpan" }).waitFor();
  const publicPage = await context.newPage();
  await publicPage.goto(site, { waitUntil: "networkidle" });
  assert.ok((await publicPage.locator("#hero-title").textContent()).includes("Demo Zanclus siap dipakai."));
  assert.equal((await save(originals, initial.version)).status(), 409);
  let snapshot = await state();
  const edited = structuredClone(snapshot.content);
  edited.contact.whatsapp = "6285111112222";
  edited.experiences.beginner.price = 1250000;
  edited.experiences.specialty.enabled = false;
  assert.equal((await save(edited, snapshot.version)).status(), 200);
  await publicPage.reload({ waitUntil: "networkidle" });
  assert.ok((await publicPage.locator(".quick-service").getAttribute("href")).includes("6285111112222"));
  assert.equal((await state()).content.experiences.beginner.price, 1250000);
  assert.equal(await publicPage.locator('select[name="experience"] option[value="specialty"]').count(), 0);

  const picture = await readFile("public/assets/reef.webp");
  const upload = await api.post(base + "/api/admin/media", { headers, multipart: { file: { name: "demo-upload.webp", mimeType: "image/webp", buffer: picture } } });
  assert.equal(upload.status(), 201);
  const media = await upload.json();
  const download = await api.get(base + media.url);
  assert.equal(download.status(), 200);
  assert.deepEqual(await download.body(), picture);
  assert.equal((await api.post(base + "/api/admin/media", { headers, multipart: { file: { name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') } } })).status(), 400);
  snapshot = await state();
  assert.ok(!Object.hasOwn(snapshot.media[0], "data"));
  const withImage = structuredClone(snapshot.content);
  withImage.images.hero = media.url;
  assert.equal((await save(withImage, snapshot.version)).status(), 200);
  await publicPage.reload({ waitUntil: "networkidle" });
  assert.ok((await publicPage.locator(".page-shell").getAttribute("style")).includes(media.url));

  await page.getByRole("link", { name: "Kalender reservasi", exact: true }).click();
  const month = await page.locator(".admin-title-row>span").textContent();
  await page.getByRole("button", { name: "Bulan berikut" }).click();
  assert.notEqual(await page.locator(".admin-title-row>span").textContent(), month);
  await page.getByRole("button", { name: "Bulan ini", exact: true }).click();
  await page.getByLabel("Nama tamu", { exact: true }).fill("Tamu Uji Demo Baru");
  await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
  await page.getByLabel("Jumlah peserta").fill("2");
  await page.getByLabel("Nilai reservasi (Rp)").fill("1500000");
  await page.getByRole("button", { name: "Simpan reservasi", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Reservasi tersimpan" }).waitFor();
  snapshot = await state();
  const created = snapshot.bookings.find((booking) => booking.guestName === "Tamu Uji Demo Baru");
  assert.ok(created);
  bookingID = created.id;
  assert.equal((await api.put(base + "/api/admin/bookings/" + bookingID, { headers, data: { ...created, participants: 3 } })).status(), 200);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal((await state()).bookings.find((booking) => booking.id === bookingID).participants, 3);
  await page.getByRole("link", { name: "Tamu", exact: true }).click();
  await page.locator(".admin-table").getByText("Tamu Uji Demo Baru", { exact: true }).waitFor();
  assert.equal((await api.post(base + "/api/admin/bookings", { headers, data: { ...created, startDate: "2026-02-31" } })).status(), 400);
  assert.equal((await api.delete(base + "/api/admin/bookings/" + bookingID, { headers })).status(), 200);
  bookingID = undefined;

  snapshot = await state();
  assert.equal((await save(originals, snapshot.version)).status(), 200);
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/demo-calendar.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("button", { name: "Menu admin", exact: true }).click();
  await page.getByRole("link", { name: "Reservasi", exact: true }).click();
  await page.getByLabel("Cari reservasi").fill("Tamu Demo");
  await page.screenshot({ path: "artifacts/demo-mobile.png", fullPage: true });
  const finalState = await state();
  await writeFile("artifacts/demo-verification.json", JSON.stringify({ version: finalState.version, bookingIDs: finalState.bookings.map((booking) => booking.id), mediaID: media.id }));
  assert.deepEqual(errors, []);
  assert.equal((await api.post(base + "/api/admin/logout", { headers, data: {} })).status(), 200);
  assert.equal((await api.get(base + "/api/admin/state")).status(), 401);
  console.log("PASS demo: prefilled login without MySQL, isolated examples, CSRF/auth, live content/contact/prices/images, upload, optimistic conflicts, booking CRUD, calendar, guests, reload persistence, mobile and logout. No WhatsApp messages sent.");
} finally {
  if (bookingID) await api.delete(base + "/api/admin/bookings/" + bookingID, { headers }).catch(() => {});
  await browser.close();
}
