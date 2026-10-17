// Dive Shop and Gudang together: sizes and stock are set in one place, the
// Dive Shop editor, with the gear for sale and the gear for rent apart, and
// every product, way and size has its warehouse item. The shop shows the
// units left, guests pick a size in the product window, a paid purchase
// leaves the sale stock, and a rental holds units of the rental stock on
// its dates. Run against a demo server started with CMS_DEMO_LOGIN=true
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
const itemFor = async (productId, mode, size = "") =>
  (await stockList()).find(
    (i) =>
      i.shop?.productId === productId &&
      i.shop.mode === mode &&
      i.shop.size === size,
  );
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
async function pay(tab) {
  await tab.locator(".pay-panel .pay-submit").click();
  await tab.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const id = new URL(tab.url()).pathname.split("/").pop();
  await tab.locator("#settle").click();
  await tab.waitForURL(/\/payment\/finish/);
  return id;
}
const noSideScroll = async (tab) =>
  assert.ok(
    await tab.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );

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

  // Saving the catalog gave every product, way and size its item, with
  // stock 0 and the unit of its kind of gear.
  const products = first.content.shop.products;
  let items = await stockList();
  assert.equal(
    items.filter((i) => i.shop).length,
    products.reduce(
      (n, p) =>
        n + (p.saleEnabled + p.rentalEnabled) * Math.max(1, p.sizes.length),
      0,
    ),
  );
  assert.deepEqual(
    [
      "demo-mask::sale",
      "demo-mask::rental",
      "demo-fins::sale::L",
      "demo-suit::rental::M",
      "demo-cylinder::rental",
    ].map((key) => {
      const [id, mode, size = ""] = key.split("::");
      const i = items.find(
        (x) =>
          x.shop?.productId === id &&
          x.shop.mode === mode &&
          x.shop.size === size,
      );
      return [i.name, i.unit, i.stock];
    }),
    [
      ["Mask & snorkel set · Jual", "set", 0],
      ["Mask & snorkel set · Sewa", "set", 0],
      ["Open heel fins · Jual · L", "pasang", 0],
      ["Wetsuit 3 mm · Sewa · M", "pcs", 0],
      ["Tabung scuba 12 L · Sewa", "pcs", 0],
    ],
  );
  // The cylinder is only rented out, so it has no sale item.
  assert.equal(await itemFor("demo-cylinder", "sale"), undefined);

  // One place: sizes in the Dive Shop editor, and the price, stock and
  // photos of the gear for sale and the gear for rent each in its own part.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  await a.locator(".admin-shop-item", { hasText: "Wetsuit 3 mm" }).click();
  const box = a.locator(".admin-shop-stock");
  const sale = a.locator(".admin-shop-mode.is-sale");
  const rent = a.locator(".admin-shop-mode.is-rental");
  await sale.getByLabel("Stok jual ukuran M").waitFor();
  assert.deepEqual(
    await a.locator(".admin-shop-mode-head h3").allTextContents(),
    ["Untuk dijual", "Untuk disewa"],
  );
  assert.equal(
    await sale.getByLabel("Harga jual (Rp)").inputValue(),
    "1850000",
  );
  assert.equal(
    await rent.getByLabel("Harga sewa per hari (Rp)").inputValue(),
    "100000",
  );
  assert.equal(
    await sale.getByRole("heading", { name: /^Foto barang jual/ }).count(),
    1,
  );
  assert.equal(
    await rent.getByRole("heading", { name: /^Foto barang sewa/ }).count(),
    1,
  );
  assert.deepEqual(
    await box.locator(".admin-size-chips li").allTextContents(),
    ["S×", "M×", "L×", "XL×"],
  );
  await box.getByLabel("Ukuran", { exact: true }).fill("XXL");
  await box.getByLabel("Ukuran", { exact: true }).press("Enter");
  assert.equal(await box.locator(".admin-size-chips li").count(), 5);
  for (const [part, label] of [
    [sale, "Stok jual ukuran XXL"],
    [rent, "Stok sewa ukuran XXL"],
  ])
    assert.equal(
      await part.getByLabel(label).inputValue(),
      "",
      "a new size has no item yet",
    );
  await sale.getByLabel("Stok jual ukuran M").fill("2");
  await sale.getByLabel("Stok jual ukuran XXL").fill("1");
  await rent.getByLabel("Stok sewa ukuran M").fill("2");
  await rent.getByLabel("Stok sewa ukuran XXL").fill("1");
  // Typing the stock makes the website follow it.
  assert.equal(
    await box.getByLabel("Ketersediaan di website").inputValue(),
    "stock",
  );
  shots &&
    (await a
      .locator(".admin-shop-detail")
      .screenshot({ path: `${shots}/72-jual-sewa.png` }));
  await a
    .locator(".admin-shop-item", { hasText: "Mask & snorkel set" })
    .click();
  assert.match(await box.textContent(), /Tanpa ukuran/);
  await sale.getByLabel("Stok jual", { exact: true }).fill("3");
  await rent.getByLabel("Stok sewa", { exact: true }).fill("2");
  // The cylinder is not for sale: its sale part only says so.
  await a.locator(".admin-shop-item", { hasText: "Tabung scuba 12 L" }).click();
  assert.equal(await sale.getByLabel("Stok jual", { exact: true }).count(), 0);
  assert.match(await sale.textContent(), /Produk ini tidak dijual/);
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a.locator(".admin-success").first().waitFor();
  await a
    .locator(".admin-shop-item", { hasText: "Mask & snorkel set" })
    .click();
  // The editor reads the stock back from the warehouse.
  let shown = "";
  for (let n = 0; n < 40 && shown !== "3,2"; n++) {
    shown = [
      await sale.getByLabel("Stok jual", { exact: true }).inputValue(),
      await rent.getByLabel("Stok sewa", { exact: true }).inputValue(),
    ].join();
    if (shown !== "3,2") await a.waitForTimeout(250);
  }
  assert.equal(shown, "3,2");
  const saved = (await state()).content.shop.products;
  assert.deepEqual(saved.find((p) => p.id === "demo-suit").sizes, [
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ]);
  assert.ok(saved.every((p) => !("stockCounts" in p)));
  assert.equal((await itemFor("demo-suit", "sale", "M")).stock, 2);
  assert.equal((await itemFor("demo-suit", "sale", "XXL")).stock, 1);
  assert.equal((await itemFor("demo-suit", "rental", "M")).stock, 2);
  assert.equal((await itemFor("demo-suit", "rental", "XXL")).stock, 1);
  assert.equal((await itemFor("demo-mask", "sale")).stock, 3);
  assert.equal((await itemFor("demo-mask", "rental")).stock, 2);
  const month = today.slice(0, 7);
  const counted = (
    await (await api(`/api/admin/inventory/movements?month=${month}`)).json()
  ).movements.filter((m) => m.note === "Diatur dari Dive Shop");
  assert.deepEqual(counted.map((m) => [m.kind, m.qty, m.reason]).sort(), [
    ["adjust", 1, "opname"],
    ["adjust", 1, "opname"],
    ["adjust", 2, "opname"],
    ["adjust", 2, "opname"],
    ["adjust", 2, "opname"],
    ["adjust", 3, "opname"],
  ]);

  // Gudang shows the same items, one per way and size.
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const suitM = a.locator(".admin-stock tbody tr", {
    hasText: "Dive Shop · Wetsuit 3 mm · Jual · M",
  });
  assert.match(await suitM.textContent(), /2 pcs[\s\S]*Cukup/);
  assert.equal(
    await a
      .locator(".admin-stock tbody tr", {
        hasText: "Dive Shop · Wetsuit 3 mm · Sewa · M",
      })
      .count(),
    1,
  );
  shots &&
    (await a
      .locator(".admin-stock")
      .screenshot({ path: `${shots}/73-gudang-ukuran.png` }));

  // Homepage shop: gear with sizes is picked in its window, and the
  // checkout line shows the size and opens the details again.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await page.locator("#dive-shop").scrollIntoViewIfNeeded();
  const suitCard = page.locator(".shop-item", { hasText: "Wetsuit 3 mm" });
  await suitCard.getByRole("button", { name: "Pilih ukuran" }).click();
  const detail = page.locator("dialog.shop-detail");
  await detail.waitFor();
  assert.match(
    await detail.textContent(),
    /Wetsuit 3 mm[\s\S]*Ukuran[\s\S]*Spesifikasi[\s\S]*Ketebalan 3 mm/,
  );
  assert.deepEqual(
    await detail.locator(".shop-sizes label").allTextContents(),
    ["Shabis", "M", "Lhabis", "XLhabis", "XXL"],
  );
  await detail.getByRole("button", { name: "Masukkan ke keranjang" }).click();
  assert.equal(
    await detail.locator(".activity-error").textContent(),
    "Pilih ukuran dulu.",
  );
  await detail.locator(".shop-sizes label", { hasText: /^XXL$/ }).click();
  assert.deepEqual(await detail.locator("select option").allTextContents(), [
    "1",
  ]);
  await detail.getByRole("button", { name: "Masukkan ke keranjang" }).click();
  await detail.waitFor({ state: "detached" });
  assert.equal(
    await suitCard.locator(".shop-item-in-cart").textContent(),
    "1 di keranjang",
  );
  await page.locator(".shop-cart-bar .button").click();
  const checkout = page.locator(".shop-checkout");
  await checkout.waitFor({ state: "visible" });
  const size = checkout.getByLabel("Ukuran Wetsuit 3 mm");
  assert.equal(await size.inputValue(), "XXL");
  assert.deepEqual(await size.locator("option").allTextContents(), [
    "S (habis)",
    "M",
    "L (habis)",
    "XL (habis)",
    "XXL",
  ]);
  await size.selectOption("M");
  assert.equal(
    await checkout.getByPlaceholder("Titik jemput atau kebutuhan lain").count(),
    1,
  );
  shots &&
    (await checkout.screenshot({ path: `${shots}/74-checkout-ukuran.png` }));
  await checkout
    .getByRole("button", { name: "Lihat detail Wetsuit 3 mm" })
    .click();
  await detail.waitFor();
  // From the cart the window only shows the details.
  assert.equal(
    await detail.getByRole("button", { name: "Masukkan ke keranjang" }).count(),
    0,
  );
  await detail.getByRole("button", { name: "Tutup detail" }).click();
  await detail.waitFor({ state: "detached" });
  await checkout.locator('input[autocomplete="name"]').fill("Tamu Ukuran");
  await checkout.locator('input[type="tel"]').fill("081234567890");
  await checkout.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  const homeId = await pay(page);
  const home = mock.orders.get(homeId);
  assert.deepEqual(
    home.items.map((i) => [i.name, i.quantity]),
    [["Beli Wetsuit 3 mm ukuran M", 1]],
  );
  let left;
  for (let n = 0; n < 20 && left !== 1; n++) {
    left = (await itemFor("demo-suit", "sale", "M")).stock;
    if (left !== 1) await page.waitForTimeout(250);
  }
  assert.equal(left, 1, "the paid size leaves the sale stock");
  assert.equal(
    (await itemFor("demo-suit", "rental", "M")).stock,
    2,
    "the rental stock stays",
  );

  // Dive Shop page: the window from the card, the size in the cart, and
  // gear without sizes stopping at its stock.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  const suitShop = page.locator('[data-product="demo-suit"]');
  assert.equal(await suitShop.locator(".shop-stock").textContent(), "Sisa 2");
  await suitShop
    .getByRole("button", { name: "Pilih ukuran Wetsuit 3 mm" })
    .click();
  await detail.waitFor();
  await detail.locator(".shop-sizes label", { hasText: /^M$/ }).click();
  await detail.getByRole("button", { name: "Masukkan ke keranjang" }).click();
  await detail.waitFor({ state: "detached" });
  assert.equal(
    await page.locator(".shop-add-notice").textContent(),
    "Wetsuit 3 mm M ditambahkan untuk dibeli.",
  );
  assert.equal(
    await page.getByLabel("Ukuran Wetsuit 3 mm", { exact: true }).inputValue(),
    "M",
  );
  // The window opens from the name too.
  await page
    .getByRole("button", { name: "Lihat detail Mask & snorkel set" })
    .first()
    .click();
  await detail.waitFor();
  assert.equal(await detail.locator(".shop-sizes").count(), 0);
  shots && (await detail.screenshot({ path: `${shots}/75-detail-produk.png` }));
  await detail.getByRole("button", { name: "Tutup detail" }).click();
  const add = page.getByRole("button", {
    name: "Tambahkan Mask & snorkel set untuk dibeli",
    exact: true,
  });
  for (let n = 0; n < 4; n++) await add.click();
  assert.equal(
    await page.locator(".shop-add-notice").textContent(),
    "Stok Mask & snorkel set tinggal 3.",
  );
  await page.getByLabel("Nama kamu").fill("Tamu Stok");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  const shopId = await pay(page);
  assert.deepEqual(
    mock.orders.get(shopId).items.map((i) => [i.name, i.quantity]),
    [
      ["Beli Wetsuit 3 mm ukuran M", 1],
      ["Beli Mask & snorkel set", 3],
    ],
  );
  for (let n = 0; n < 20 && left !== 0; n++) {
    left = (await itemFor("demo-suit", "sale", "M")).stock;
    if (left !== 0) await page.waitForTimeout(250);
  }
  assert.equal(left, 0);
  assert.equal((await itemFor("demo-mask", "sale")).stock, 0);
  assert.equal((await itemFor("demo-mask", "rental")).stock, 2);
  const paid = (await state()).bookings.find(
    (b) => b.payment?.orderId === shopId,
  );
  assert.equal(paid.payment.stockRecorded, true);
  assert.deepEqual(
    paid.payment.lines.map((l) => [l.product, l.mode, l.size]),
    [
      ["demo-suit", "sale", "M"],
      ["demo-mask", "sale", undefined],
    ],
  );

  // Sizes on the payment API: a size is needed, and each size has its own
  // stock and holds.
  let response = await order([
    { source: "product", id: "demo-suit", mode: "rental", quantity: 1 },
  ]);
  assert.equal(response.status(), 400);
  assert.equal(
    (await response.json()).error,
    "Choose a size for each item before paying.",
  );
  const xxl = (quantity, mode = "rental") => ({
    source: "product",
    id: "demo-suit",
    mode,
    quantity,
    size: "XXL",
  });
  response = await order([xxl(2)]);
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "Only 1 left of Wetsuit 3 mm size XXL for those dates. Choose fewer or other dates.",
  );
  response = await order([xxl(1)]);
  assert.equal(response.status(), 201);
  assert.equal(
    (await itemFor("demo-suit", "rental", "XXL")).shop.bookedLater,
    1,
  );
  // The unit for sale is another one: the rental does not take it.
  response = await order([xxl(1, "sale")]);
  assert.equal(response.status(), 201);
  assert.equal((await itemFor("demo-suit", "sale", "XXL")).shop.waiting, 1);
  // That purchase waiting for payment holds the last unit for sale.
  response = await order([xxl(1, "sale")]);
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "Wetsuit 3 mm size XXL is out of stock. Remove it from your order or chat with our team on WhatsApp.",
  );
  // Another date is free.
  response = await order([xxl(1)], { startDate: plus(9) });
  assert.equal(response.status(), 201);

  // A paid Flexi rental cannot move onto a date whose gear is taken.
  response = await order([xxl(1)], { startDate: plus(12), fare: "flexi" });
  assert.equal(response.status(), 201);
  await page.goto((await response.json()).redirectUrl);
  await page.locator("#settle").click();
  await page.waitForURL(/\/payment\/finish/);
  const flexi = (await state()).bookings.find(
    (b) => b.startDate === plus(12) && b.payment?.status === "paid",
  );
  assert.equal(flexi.payment.fare.tier, "flexi");
  const moveTo = (date, t = flexi.payment.manageToken) =>
    page.request.post(base + `/api/booking/${flexi.id}?locale=en`, {
      headers: { Origin: base, "x-real-ip": `10.0.1.${++visitor}` },
      data: { t, action: "reschedule", date },
    });
  response = await moveTo(plus(5));
  assert.equal(response.status(), 409);
  assert.equal(
    (await response.json()).error,
    "The rental gear in this booking is fully booked on that date. Please choose another date.",
  );
  // A wrong key learns nothing about the stock.
  assert.equal((await moveTo(plus(5), "wrong")).status(), 404);
  response = await moveTo(plus(14));
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).view.startDate, plus(14));

  // The public pages say what is left.
  await page.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('[data-product="demo-mask"] .shop-stock').textContent(),
    "Out of stock",
  );
  assert.equal(
    await page.locator('[data-product="demo-suit"] .shop-stock').textContent(),
    "Out of stock",
  );
  // The rental stock is its own: the units owned for rent.
  await page.goto(base + "/dive-shop?mode=rental", {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page.locator('[data-product="demo-suit"] .shop-stock').textContent(),
    "3 left",
  );
  assert.equal(
    await page.locator('[data-product="demo-mask"] .shop-stock').textContent(),
    "2 left",
  );
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(
    await page
      .locator(".shop-item", { hasText: "Mask & snorkel set" })
      .locator(".shop-item-out")
      .textContent(),
    "Stok habis",
  );
  assert.equal(
    await page
      .locator(".shop-item", { hasText: "Wetsuit 3 mm" })
      .locator(".shop-item-add")
      .isDisabled(),
    true,
  );

  // The warehouse list says what the shop holds.
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const suitXXL = a.locator(".admin-stock tbody tr", {
    hasText: "Dive Shop · Wetsuit 3 mm · Sewa · XXL",
  });
  assert.match(
    await suitXXL.textContent(),
    /1 pcs[\s\S]*3 dipesan untuk sewa nanti/,
  );
  // The item form moves a product to an item the team already has.
  const own = await (
    await api("/api/admin/inventory/items", "POST", {
      name: "Scuba Pro Dive Mask - Zanclus Dive Shop",
      sku: "SP-DM-001",
      category: "alat",
      unit: "pcs",
    })
  ).json();
  const before = await itemFor("demo-mask", "sale");
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const ownRow = a.locator(".admin-stock tbody tr", {
    hasText: "Scuba Pro Dive Mask",
  });
  await ownRow.getByRole("button", { name: "Ubah" }).click();
  await a.getByLabel("Produk Dive Shop").selectOption("demo-mask::sale::");
  await a.getByRole("button", { name: "Simpan perubahan" }).click();
  await a.locator(".admin-success").waitFor();
  assert.equal((await itemFor("demo-mask", "sale")).id, own.id);
  // The old item has movements, so it stays as a plain item.
  const old = (await stockList()).find((i) => i.id === before.id);
  assert.equal(old.shop, null);
  assert.match(
    await ownRow.textContent(),
    /Dive Shop · Mask & snorkel set · Jual/,
  );
  // The rental item stays where it was.
  assert.equal((await itemFor("demo-mask", "rental")).stock, 2);

  // Phones: the editor section and the product window fit the screen.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await phone.newPage();
  p.on("pageerror", (error) => errors.push("phone: " + error.message));
  await p.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  await p
    .getByRole("button", { name: "Lihat detail Open heel fins" })
    .first()
    .click();
  const phoneDetail = p.locator("dialog.shop-detail");
  await phoneDetail.waitFor();
  await noSideScroll(p);
  const box390 = await phoneDetail.boundingBox();
  assert.ok(box390.x >= 0 && box390.x + box390.width <= 390);
  shots && (await p.screenshot({ path: `${shots}/76-detail-hp.png` }));
  await phone.close();

  assert.deepEqual(errors, []);
  console.log("Dive Shop sizes, sale and rental stock, and Gudang verified.");
} finally {
  await browser.close();
  mock.server.close();
}
