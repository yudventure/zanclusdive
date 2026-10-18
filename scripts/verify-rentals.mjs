// Rental gear as Dive Shop products, and its capacity in the reservation
// calendar: the homepage rents the gear of the old price list, the team
// books gear by hand on a reservation, the calendar's Sewa alat view shows
// what is out against the rental stock, online orders stop at what is
// left, and an activity's rental add-on holds its gear on the day. Run
// against a demo server started with CMS_DEMO_LOGIN=true
// CMS_COOKIE_SECURE=false MIDTRANS_SERVER_KEY=SB-Mid-server-TEST
// MIDTRANS_SNAP_URL=http://127.0.0.1:3499 MIDTRANS_API_URL=http://127.0.0.1:3499
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { startMockMidtrans } from "./mock-midtrans.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
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
// A day in this month's grid, a few days ahead when the month allows.
const day = plus(today.slice(8) > "25" ? 0 : 3);
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const api = (path, method = "GET", data) =>
  context.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const state = async () => (await api("/api/admin/state")).json();
let visitor = 0;
const pay = (data) =>
  page.request.post(base + "/api/payments?locale=en", {
    headers: { Origin: base, "x-real-ip": `10.0.2.${++visitor}` },
    data: {
      name: "Tamu Sewa",
      whatsapp: "081234567890",
      email: "",
      notes: "",
      fare: "standard",
      ...data,
    },
  });
const rentMasks = (quantity, startDate = day) =>
  pay({
    kind: "shop",
    lines: [{ source: "product", id: "sewa-masker", mode: "rental", quantity }],
    days: 1,
    startDate,
  });
const noSideScroll = async () =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  // Online payment on, and three masks for rent that the website follows.
  const first = await state();
  const content = first.content;
  content.payments.enabled = true;
  content.shop.products = content.shop.products.map((p) =>
    p.id === "sewa-masker"
      ? { ...p, availability: "stock", stockCounts: { rental: { "": "3" } } }
      : p,
  );
  assert.equal(
    (
      await api("/api/admin/settings", "PUT", {
        content,
        version: first.version,
      })
    ).status(),
    200,
  );

  // The old rental lists are Dive Shop products: the homepage rents them
  // in the same tabs, with what is left.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await page.locator("#dive-shop").scrollIntoViewIfNeeded();
  assert.deepEqual(await page.getByRole("tab").allTextContents(), [
    "Beli alat selam & aksesori",
    "Sewa masker, snorkel & fin",
    "Sewa BCD, regulator & wetsuit",
    "Tabung & isi ulang",
    "Dive computer, senter & pelampung",
    "Sewa kamera bawah air",
  ]);
  await page.getByRole("tab", { name: "Sewa kamera bawah air" }).click();
  assert.deepEqual(await page.locator(".shop-item h4").allTextContents(), [
    "Kamera bawah air TG-5",
    "Kamera TG-5 + perlengkapan",
    "GoPro Hero 11 + housing",
  ]);
  assert.match(
    await page.locator(".shop-item").first().textContent(),
    /Rp\s650\.000\s*\/ hari/,
  );
  // The Daftar harga editor no longer has rental lists.
  await page.goto(base + "/admin/prices", { waitUntil: "networkidle" });
  assert.equal(
    await page.getByRole("button", { name: "Sewa kamera bawah air" }).count(),
    0,
  );
  assert.match(
    await page.locator(".admin-addon-group").first().textContent(),
    /Sewa alat dari Dive Shop[\s\S]*Perlengkapan scuba/,
  );

  // The Dive Shop editor lists rental gear apart from gear for sale, with
  // its price per day.
  await page.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Barang sewa/ }).click();
  await page.getByLabel("Cari produk").fill("kamera");
  assert.deepEqual(
    await page.locator(".admin-shop-item strong").allTextContents(),
    ["Kamera bawah air TG-5", "Kamera TG-5 + perlengkapan"],
  );
  await page.locator(".admin-shop-item", { hasText: "TG-5 +" }).click();
  assert.equal(await page.getByLabel("Harga jual (Rp)").count(), 0);
  assert.equal(
    await page.getByLabel("Harga sewa per hari (Rp)").inputValue(),
    "1500000",
  );
  assert.equal(
    await page.getByLabel("Ketersediaan di website").inputValue(),
    "available",
  );

  // A walk-in guest rents two masks, booked by the team in the full form
  // of Reservasi. The form says what is left on those dates.
  await page.goto(base + "/admin/reservations", { waitUntil: "networkidle" });
  const form = page.locator("#booking-editor");
  await form.getByLabel("Pengalaman").selectOption("shop");
  await form.getByLabel("Status").selectOption("confirmed");
  await form.getByLabel("Tanggal mulai").fill(day);
  await form.getByLabel("Tanggal selesai (termasuk hari ini)").fill(day);
  await form.getByLabel("Sumber reservasi").selectOption("walkin");
  await form.getByLabel("Nama tamu").fill("Tamu Datang");
  const gear = form.locator(".admin-booking-gear");
  await gear.getByRole("button", { name: "+ Tambah alat sewa" }).click();
  await gear
    .getByLabel("Alat sewa 1", { exact: true })
    .selectOption({ label: "Masker" });
  await gear.getByLabel("Jumlah 1").fill("4");
  assert.equal(
    await gear.locator(".admin-gear-line small").textContent(),
    "Hanya 3 set tersedia pada tanggal ini.",
  );
  await gear.getByLabel("Jumlah 1").fill("2");
  assert.equal(
    await gear.locator(".admin-gear-line small").textContent(),
    "Tersedia 3 set pada tanggal ini.",
  );
  shots &&
    (await gear.screenshot({ path: `${shots}/83-reservasi-alat-sewa.png` }));
  await form.getByRole("button", { name: "Simpan reservasi" }).click();
  await page.getByText("Reservasi tersimpan.", { exact: true }).waitFor();
  const walkin = (await state()).bookings.find(
    (b) => b.guestName === "Tamu Datang",
  );
  assert.deepEqual(walkin.gear, [{ product: "sewa-masker", quantity: 2 }]);

  // Online, only one mask is left that day.
  let response = await rentMasks(2);
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "Only 1 left of Masker for those dates. Choose fewer or other dates.",
  );
  response = await rentMasks(1);
  assert.equal(response.status(), 201);
  // Another day still has three.
  response = await rentMasks(3, plus(40));
  assert.equal(response.status(), 201);

  // A dive with the camera as an add-on holds the camera on its day.
  response = await pay({
    activity: "diving",
    lines: [
      { item: 0, itemName: "Discovery Dive", quantity: 1 },
      {
        addOn: "shop:sewa-kamera-bawah-air-tg-5",
        itemName: "Underwater camera TG-5",
        quantity: 1,
      },
    ],
    participants: 1,
    date: day,
  });
  assert.equal(response.status(), 201);
  const dive = (await state()).bookings.find(
    (b) => b.experience === "diving" && b.guestName === "Tamu Sewa",
  );
  assert.deepEqual(
    dive.payment.lines.filter((l) => l.product).map((l) => [l.product, l.mode]),
    [["sewa-kamera-bawah-air-tg-5", "rental"]],
  );

  // The calendar's Sewa alat view: the masks are full that day.
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sewa alat", exact: true }).click();
  const cell = page.locator(`.admin-month-day[data-date="${day}"]`);
  await cell.locator(".calendar-gear", { hasText: "Masker" }).waitFor();
  assert.match(await cell.getAttribute("class"), /has-full/);
  assert.equal(
    await cell.locator(".calendar-gear", { hasText: "Masker" }).textContent(),
    "Masker 3/3",
  );
  assert.match(
    await cell.locator(".calendar-gear.is-free").textContent(),
    /Kamera bawah air TG-5 1/,
  );
  await cell.locator(".admin-month-date").click();
  const panel = page.locator(".admin-gear-day");
  const masks = panel.locator(".admin-gear-list li", { hasText: "Masker" });
  assert.match(await masks.textContent(), /^MaskerPenuh, 3 dari 3 disewa/);
  // The walk-in and the online order hold them.
  assert.deepEqual((await masks.locator("button").allTextContents()).sort(), [
    "Tamu Datang · Dive Shop",
    "Tamu Sewa · Dive Shop",
  ]);
  shots &&
    (await page
      .locator(".admin-month-card")
      .screenshot({ path: `${shots}/84-kalender-sewa.png` }));
  shots && (await panel.screenshot({ path: `${shots}/85-sewa-hari-ini.png` }));
  await panel.locator("summary").click();
  assert.equal(
    await panel
      .locator(".admin-gear-left li", { hasText: "Masker" })
      .locator("b")
      .textContent(),
    "Penuh",
  );
  // Another booking on that day hears the masks are full.
  await panel.getByRole("button", { name: "Catat sewa tanggal ini" }).click();
  assert.equal(await form.getByLabel("Pengalaman").inputValue(), "shop");
  await gear.getByRole("button", { name: "+ Tambah alat sewa" }).click();
  await gear
    .getByLabel("Alat sewa 1", { exact: true })
    .selectOption({ label: "Masker" });
  assert.equal(
    await gear.locator(".admin-gear-line small").textContent(),
    "Penuh pada tanggal ini.",
  );
  // Opening the walk-in from the panel shows its gear.
  await masks.getByRole("button", { name: "Tamu Datang · Dive Shop" }).click();
  assert.equal(await gear.getByLabel("Jumlah 1").inputValue(), "2");
  // Its own masks do not count against it.
  assert.equal(
    await gear.locator(".admin-gear-line small").textContent(),
    "Tersedia 2 set pada tanggal ini.",
  );

  // Phones: the calendar view fits the screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sewa alat", exact: true }).click();
  await noSideScroll();
  shots &&
    (await page.screenshot({
      path: `${shots}/86-kalender-sewa-hp.png`,
      fullPage: true,
    }));

  assert.deepEqual(errors, []);
  console.log("Rental gear, its stock and the reservation calendar verified.");
} finally {
  await browser.close();
  mock.server.close();
}
