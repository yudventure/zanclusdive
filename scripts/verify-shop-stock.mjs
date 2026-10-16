// Dive Shop and Gudang together: every product has its warehouse item, the
// shop shows the units left, a paid purchase leaves the warehouse, and a
// rental holds its units on its dates. Run against a demo server started
// with CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// MIDTRANS_SERVER_KEY=SB-Mid-server-TEST
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
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const a = await admin.newPage();
a.on("pageerror", (error) => errors.push("admin: " + error.message));
const api = (path, method = "GET", data) =>
  admin.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const stockList = async () =>
  (await (await api("/api/admin/inventory/items")).json()).items;
const maskItem = async () =>
  (await stockList()).find((i) => i.shop?.productId === "demo-mask");
const state = async () => (await api("/api/admin/state")).json();
let visitor = 0;
// An order straight to the payment API, as the shop pages send it.
const order = (lines, extra = {}) =>
  page.request.post(base + "/api/payments?locale=en", {
    headers: { Origin: base, "x-real-ip": `10.0.0.${++visitor}` },
    data: {
      kind: "shop",
      lines,
      days: 1,
      startDate: plus(5),
      fare: "standard",
      name: "Tamu Stok",
      whatsapp: "081234567890",
      email: "",
      notes: "",
      ...extra,
    },
  });

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  const first = await state();
  first.content.payments.enabled = true;
  assert.equal(
    (
      await api("/api/admin/settings", "PUT", {
        content: first.content,
        version: first.version,
      })
    ).status(),
    200,
  );

  // Saving the catalog gave every product its item, with stock 0 and the
  // unit of its kind of gear. Nothing else changes on the public site yet.
  let items = await stockList();
  const shopItems = items.filter((i) => i.shop);
  assert.equal(shopItems.length, first.content.shop.products.length);
  const forProduct = (id) => shopItems.find((i) => i.shop.productId === id);
  assert.deepEqual(
    ["demo-mask", "demo-fins", "demo-light"].map((id) => {
      const i = forProduct(id);
      return [i.name, i.unit, i.stock, i.empty];
    }),
    [
      ["Mask & snorkel set", "set", 0, true],
      ["Open heel fins", "pasang", 0, true],
      ["Dive torch", "pcs", 0, true],
    ],
  );
  // The warehouse's own item for the same mask, made before the link.
  const own = await (
    await api("/api/admin/inventory/items", "POST", {
      name: "Scuba Pro Dive Mask - Zanclus Dive Shop",
      sku: "SP-DM-001",
      category: "alat",
      unit: "pcs",
      location: "Rak Utama",
    })
  ).json();
  assert.equal(own.productId, "");

  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const maskRow = a.locator(".admin-stock tbody tr", {
    hasText: "Dive Shop · Mask & snorkel set",
  });
  assert.match(await maskRow.textContent(), /0 set[\s\S]*Habis/);
  assert.match(
    await a.locator(".admin-card-heading .admin-subtle").first().textContent(),
    /^\d+ barang habis\.$/,
  );
  shots && (await a.screenshot({ path: `${shots}/68-gudang-dive-shop.png` }));

  // The Dive Shop editor links the mask to the warehouse's own item and
  // lets the website follow its stock.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  await a
    .locator(".admin-shop-item", { hasText: "Mask & snorkel set" })
    .click();
  const box = a.locator(".admin-shop-stock");
  await box.locator("select option").first().waitFor({ state: "attached" });
  assert.match(
    await box.textContent(),
    /Stok di gudang[\s\S]*Stok 0 set\.[\s\S]*Pilih Ikuti stok gudang/,
  );
  await box.getByLabel("Barang di gudang").selectOption(own.id);
  assert.match(
    await box.textContent(),
    /memakai stok Scuba Pro Dive Mask - Zanclus Dive Shop setelah katalog disimpan/,
  );
  await a.getByLabel("Ketersediaan produk").selectOption("stock");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a.locator(".admin-success").first().waitFor();
  await box
    .locator(".admin-subtle", { hasText: "Stok 0 pcs." })
    .waitFor({ timeout: 10000 });
  assert.match(await box.textContent(), /website menampilkan Stok habis/);
  shots && (await box.screenshot({ path: `${shots}/69-dive-shop-stok.png` }));
  items = await stockList();
  // The item the warehouse made for the mask had nothing recorded, so it
  // is gone; the team's own item serves the product now.
  assert.equal(items.filter((i) => i.name === "Mask & snorkel set").length, 0);
  assert.equal((await maskItem()).id, own.id);
  assert.equal(
    (await state()).content.shop.products.find((p) => p.id === "demo-mask")
      .availability,
    "stock",
  );

  // Out of stock on the website until the team records it.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  const card = page.locator('[data-product="demo-mask"]');
  assert.equal(await card.locator(".shop-stock").textContent(), "Stok habis");
  assert.equal(await card.locator("button").isDisabled(), true);
  // Gear that does not follow the warehouse is unchanged.
  assert.equal(
    await page.locator('[data-product="demo-suit"] .shop-stock').textContent(),
    "Konfirmasi ketersediaan",
  );

  // Three in, from the warehouse list.
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const ownRow = a.locator(".admin-stock tbody tr", {
    hasText: "Scuba Pro Dive Mask",
  });
  assert.match(await ownRow.textContent(), /Dive Shop · Mask & snorkel set/);
  await ownRow.getByRole("button", { name: "Masuk" }).click();
  const quick = a.locator(".admin-quick-move");
  assert.match(
    await quick.textContent(),
    /Barang masuk[\s\S]*Scuba Pro Dive Mask - Zanclus Dive Shop, stok sekarang 0 pcs\./,
  );
  await quick.getByLabel("Jumlah (pcs)").fill("3");
  await quick.getByRole("button", { name: "Catat mutasi" }).click();
  await a.locator(".admin-success").waitFor();
  assert.match(await ownRow.textContent(), /3 pcs[\s\S]*Cukup/);

  // The shop shows the units left and stops at them.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  assert.equal(await card.locator(".shop-stock").textContent(), "Sisa 3");
  const add = page.getByRole("button", {
    name: "Tambahkan Mask & snorkel set untuk dibeli",
    exact: true,
  });
  for (let n = 0; n < 4; n++) await add.click();
  assert.equal(
    await page.locator(".shop-add-notice").textContent(),
    "Stok Mask & snorkel set tinggal 3.",
  );
  const quantity = page.getByLabel("Jumlah Mask & snorkel set beli");
  assert.deepEqual(await quantity.locator("option").allTextContents(), [
    "1",
    "2",
    "3",
  ]);
  shots && (await card.screenshot({ path: `${shots}/70-dive-shop-sisa.png` }));
  // Two paid online leave the warehouse as one sale.
  await quantity.selectOption("2");
  await page.getByLabel("Nama kamu").fill("Tamu Stok");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page.locator(".pay-panel .pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const saleId = new URL(page.url()).pathname.split("/").pop();
  // While it waits for payment, the two are held.
  assert.equal((await maskItem()).shop.waiting, 2);
  await page.locator("#settle").click();
  await page.waitForURL(/\/payment\/finish/);
  let recorded;
  for (let n = 0; n < 20 && !recorded; n++) {
    recorded = (await maskItem()).stock === 1;
    if (!recorded) await page.waitForTimeout(250);
  }
  assert.ok(recorded, "the paid sale reaches the warehouse");
  const paid = (await state()).bookings.find(
    (b) => b.payment?.orderId === saleId,
  );
  assert.equal(paid.payment.stockRecorded, true);
  assert.deepEqual(paid.payment.lines[0].product, "demo-mask");
  const month = today.slice(0, 7);
  const moves = (
    await (await api(`/api/admin/inventory/movements?month=${month}`)).json()
  ).movements.filter((m) => m.bookingId === paid.id);
  assert.equal(moves.length, 1);
  assert.deepEqual(
    [moves[0].kind, moves[0].qty, moves[0].reason, moves[0].itemId],
    ["out", 2, "jual", own.id],
  );
  assert.match(moves[0].note, /^Pesanan online ZC-[0-9A-F]{12}$/);
  assert.equal((await maskItem()).shop.waiting, 0);

  // One left. A rental of two on one date is refused, one goes through
  // and holds it on that date only.
  let response = await order([
    { source: "product", id: "demo-mask", mode: "rental", quantity: 2 },
  ]);
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "Only 1 left of Mask & snorkel set for those dates. Choose fewer or other dates.",
  );
  response = await order([
    { source: "product", id: "demo-mask", mode: "rental", quantity: 1 },
  ]);
  assert.equal(response.status(), 201);
  assert.equal((await maskItem()).shop.bookedLater, 1);
  // Selling the last unit would leave that rental without gear.
  response = await order([
    { source: "product", id: "demo-mask", mode: "sale", quantity: 1 },
  ]);
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "Mask & snorkel set is out of stock. Remove it from your order or chat with our team on WhatsApp.",
  );
  // Another date is free for renting.
  response = await order(
    [{ source: "product", id: "demo-mask", mode: "rental", quantity: 1 }],
    { startDate: plus(9) },
  );
  assert.equal(response.status(), 201);

  // A paid Flexi rental cannot move onto a date whose gear is taken.
  response = await order(
    [{ source: "product", id: "demo-mask", mode: "rental", quantity: 1 }],
    { startDate: plus(12), fare: "flexi" },
  );
  assert.equal(response.status(), 201);
  await page.goto((await response.json()).redirectUrl);
  await page.locator("#settle").click();
  await page.waitForURL(/\/payment\/finish/);
  const flexi = (await state()).bookings.find(
    (b) => b.startDate === plus(12) && b.payment?.status === "paid",
  );
  assert.equal(flexi.payment.fare.tier, "flexi");
  const moveTo = (date) =>
    page.request.post(base + `/api/booking/${flexi.id}?locale=en`, {
      headers: { Origin: base, "x-real-ip": `10.0.1.${++visitor}` },
      data: { t: flexi.payment.manageToken, action: "reschedule", date },
    });
  response = await moveTo(plus(5));
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "The rental gear in this booking is fully booked on that date. Please choose another date.",
  );
  // A wrong key learns nothing about the stock.
  response = await page.request.post(
    base + `/api/booking/${flexi.id}?locale=en`,
    {
      headers: { Origin: base, "x-real-ip": "10.0.2.1" },
      data: { t: "wrong", action: "reschedule", date: plus(5) },
    },
  );
  assert.equal(response.status(), 404);
  response = await moveTo(plus(14));
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).view.startDate, plus(14));

  // The website: none to buy, one to rent.
  await page.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  assert.equal(await card.locator(".shop-stock").textContent(), "Out of stock");
  await page.goto(base + "/dive-shop?mode=rental", {
    waitUntil: "networkidle",
  });
  assert.equal(await card.locator(".shop-stock").textContent(), "1 left");
  // The homepage shop says so too.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const teaser = page.locator(".shop-item", { hasText: "Mask & snorkel set" });
  assert.equal(
    await teaser.locator(".shop-item-out").textContent(),
    "Stok habis",
  );
  assert.equal(await teaser.locator("button").count(), 0);

  // The warehouse list says what the shop holds.
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  assert.match(
    await ownRow.textContent(),
    /1 pcs[\s\S]*3 dipesan untuk sewa nanti/,
  );
  shots &&
    (await a
      .locator(".admin-stock")
      .screenshot({ path: `${shots}/71-gudang-sewa.png` }));
  // The form can move the link back to a new item of its own.
  await ownRow.getByRole("button", { name: "Ubah" }).click();
  assert.equal(
    await a.getByLabel("Produk Dive Shop").inputValue(),
    "demo-mask",
  );
  await a.getByLabel("Produk Dive Shop").selectOption("");
  await a.getByRole("button", { name: "Simpan perubahan" }).click();
  await a.locator(".admin-success").waitFor();
  const fresh = await maskItem();
  assert.notEqual(fresh.id, own.id);
  assert.deepEqual([fresh.name, fresh.stock], ["Mask & snorkel set", 0]);
  assert.match(await ownRow.textContent(), /1 pcs/);
  assert.equal(await ownRow.locator(".admin-stock-shop").count(), 0);

  assert.deepEqual(errors, []);
  console.log("Dive Shop and Gudang verified.");
} finally {
  await browser.close();
  mock.server.close();
}
