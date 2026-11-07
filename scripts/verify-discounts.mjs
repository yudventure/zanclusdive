// Crossed-out prices and discount vouchers in the Dive Shop: the normal
// price crossed out beside a lower one, a voucher code at both checkouts
// priced by the server, carried to Midtrans and the booking, never shown
// on a public page, and both edited in the admin. Run against a demo
// server started with CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// MIDTRANS_SERVER_KEY=SB-Mid-server-TEST
// MIDTRANS_SNAP_URL=http://127.0.0.1:3499 MIDTRANS_API_URL=http://127.0.0.1:3499
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { startMockMidtrans } from "./mock-midtrans.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:3413";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
const port = Number(process.env.MIDTRANS_MOCK_PORT || 3499);
const mock = await startMockMidtrans({
  port,
  serverKey: "SB-Mid-server-TEST",
  appUrl: base,
});
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
async function quiet(context) {
  await context.route("**/api/weather", (r) =>
    r.fulfill({ json: { locations: [] } }),
  );
  await context.route(/youtube|ytimg|tiktok|instagram|facebook/, (r) =>
    r.fulfill({ body: "" }),
  );
}
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await quiet(admin);
const a = await admin.newPage();
a.on("pageerror", (error) => errors.push("admin: " + error.message));
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await quiet(context);
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const api = (path, method = "GET", data) =>
  admin.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const state = async () => (await api("/api/admin/state")).json();
const spaced = (text) => text.replace(/\s+/g, " ").trim();
const voucher = (patch) => ({
  id: "v-" + patch.code.toLowerCase(),
  enabled: true,
  kind: "percent",
  value: 10,
  maxDiscount: null,
  minSpend: 0,
  scope: "all",
  start: "",
  end: "",
  limit: null,
  oncePerGuest: false,
  note: "",
  ...patch,
});

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  const first = await state();
  first.content.payments.enabled = true;
  const fins = first.content.shop.products.find((p) => p.id === "demo-fins");
  fins.comparePrice = 1600000;
  first.content.shop.vouchers = [
    voucher({ code: "HEMAT10", maxDiscount: 100000, note: "Promo Instagram" }),
    voucher({ code: "SEWA25", kind: "amount", value: 25000, scope: "rental" }),
    voucher({ code: "LAMA", end: "2020-01-31" }),
  ];
  assert.equal(
    (
      await api("/api/admin/settings", "PUT", {
        content: first.content,
        version: first.version,
      })
    ).status(),
    200,
  );

  // The codes never reach a public page.
  for (const path of ["/id/dive-shop", "/id", "/dive-shop"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const html = await page.content();
    for (const code of ["HEMAT10", "SEWA25", "Promo Instagram"])
      assert.ok(!html.includes(code), `${code} on ${path}`);
  }

  // The crossed-out price on the card and in the window.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  const finsCard = page.locator(".shop-product-card", {
    hasText: "Open heel fins",
  });
  assert.equal(
    spaced(await finsCard.locator(".shop-price-off").textContent()),
    "Rp 1.600.000Hemat 21%",
  );
  assert.equal(await finsCard.locator(".shop-price-off del").count(), 1);
  await finsCard.getByRole("button", { name: /Pilih ukuran/ }).click();
  const detail = page.locator("dialog.shop-detail");
  assert.match(
    spaced(await detail.locator(".shop-detail-price").textContent()),
    /Rp 1\.250\.000 ?Rp 1\.600\.000 ?Hemat 21%/,
  );
  shots &&
    (await detail
      .locator(".shop-detail-info")
      .screenshot({ path: `${shots}/harga-coret-jendela.png` }));
  await detail.getByRole("button", { name: "Tutup detail" }).click();
  shots &&
    (await finsCard.screenshot({ path: `${shots}/harga-coret-kartu.png` }));

  // A voucher at the Dive Shop checkout.
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  const form = page.locator(".shop-order-form");
  const code = form.getByLabel("Kode kupon");
  await code.fill("salah");
  await form.getByRole("button", { name: "Pakai" }).click();
  await form
    .locator(".voucher-error", {
      hasText: "Kode kupon tidak ditemukan atau sudah tidak berlaku.",
    })
    .waitFor();
  await code.fill("lama");
  await code.press("Enter");
  await form
    .locator(".voucher-error", { hasText: "tidak ditemukan" })
    .waitFor();
  await code.fill("sewa25");
  await form.getByRole("button", { name: "Pakai" }).click();
  await form
    .locator(".voucher-error", {
      hasText: "Kupon SEWA25 hanya untuk sewa alat.",
    })
    .waitFor();
  await code.fill("hemat10");
  await form.getByRole("button", { name: "Pakai" }).click();
  const applied = form.locator(".voucher-applied");
  await applied.waitFor();
  assert.equal(
    spaced(await applied.locator("span").textContent()),
    "Kupon HEMAT10",
  );
  assert.equal(
    spaced(await applied.locator("strong").textContent()),
    "−Rp 65.000",
  );
  assert.match(
    spaced(await form.locator(".shop-total").textContent()),
    /Kupon HEMAT10 −Rp 65\.000.*Rp 585\.000/,
  );
  // More of the gear: the voucher is priced again, up to its cap.
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  await applied.locator("strong", { hasText: "−Rp 100.000" }).waitFor();
  assert.match(
    spaced(await form.locator(".shop-total").textContent()),
    /Rp 1\.850\.000/,
  );
  shots &&
    (await form
      .locator(".voucher-field")
      .screenshot({ path: `${shots}/kupon-dive-shop.png` }));

  // Paid online: Midtrans and the booking carry the voucher.
  await page.getByLabel("Nama kamu").fill("Tamu Kupon");
  await page.getByLabel("Nomor WhatsApp").fill("081234567891");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page.locator(".pay-panel .pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const orderId = new URL(page.url()).pathname.split("/").pop();
  const paid = mock.orders.get(orderId);
  assert.deepEqual(
    paid.items.map((i) => [i.name, i.price, i.quantity]),
    [
      ["Beli Mask & snorkel set", 650000, 3],
      ["Kupon HEMAT10", -100000, 1],
    ],
  );
  assert.equal(paid.amount, 1850000);
  let booking = (await state()).bookings.find(
    (b) => b.payment?.orderId === orderId,
  );
  assert.equal(booking.amount, 1850000);
  assert.deepEqual(booking.payment.voucher, {
    id: "v-hemat10",
    code: "HEMAT10",
    discount: 100000,
  });
  assert.match(booking.notes, /Kupon HEMAT10/);

  // A code tried straight on the server answers the same way.
  const tried = await context.request.post(base + "/api/vouchers?locale=en", {
    headers: { Origin: base },
    data: {
      kind: "shop",
      lines: [
        { source: "product", id: "demo-mask", mode: "sale", quantity: 1 },
      ],
      voucher: "lama",
    },
  });
  assert.equal(tried.status(), 409);
  assert.equal(
    (await tried.json()).error,
    "This voucher code was not found or is no longer valid.",
  );

  // The homepage checkout.
  const home = await context.newPage();
  home.on("pageerror", (error) => errors.push("home: " + error.message));
  await home.goto(base + "/id", { waitUntil: "networkidle" });
  const panel = home.locator("#dive-shop .shop-service-panel");
  await panel
    .locator(".shop-item", { hasText: "Mask & snorkel set" })
    .getByRole("button", { name: /Tambah/ })
    .click();
  await home.locator(".shop-cart-bar button, .shop-cart-open").first().click();
  const checkout = home.locator("dialog[open]");
  await checkout.getByLabel("Kode kupon").fill("HEMAT10");
  await checkout.getByRole("button", { name: "Pakai" }).click();
  await checkout.locator(".voucher-applied").waitFor();
  assert.match(
    spaced(await checkout.locator(".shop-checkout-totals").textContent()),
    /Kupon HEMAT10 ?−Rp 65\.000.*Rp 585\.000$/,
  );
  shots && (await checkout.screenshot({ path: `${shots}/kupon-beranda.png` }));

  // On a phone the field fits the checkout.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await quiet(phone);
  const p = await phone.newPage();
  p.on("pageerror", (error) => errors.push("phone: " + error.message));
  await p.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  await p
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  const field = p.locator(".shop-order-form .voucher-field");
  await field.scrollIntoViewIfNeeded();
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  const box = await field.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390);
  await phone.close();

  // The admin: vouchers with their uses, and both checks on save.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  const vouchers = a.locator(".admin-vouchers");
  const hemat = vouchers.locator("li", { hasText: "HEMAT10" });
  assert.equal(
    spaced(await hemat.locator(".admin-voucher-head span").textContent()),
    "10%, maks Rp 100.000",
  );
  assert.match(
    await hemat.locator(".admin-voucher-head small").textContent(),
    /^Aktif · terpakai 1$/,
  );
  assert.match(
    await vouchers
      .locator("li", { hasText: "LAMA" })
      .locator(".admin-voucher-head small")
      .textContent(),
    /sampai 31 Jan 2020/,
  );
  await vouchers.getByRole("button", { name: "+ Tambah kupon" }).click();
  const added = vouchers.locator("li").last();
  await added.getByLabel("Kode kupon").fill("ab");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByText("Kode kupon AB harus 4–20 huruf, angka, atau tanda hubung", {
      exact: false,
    })
    .first()
    .waitFor();
  await added.getByLabel("Kode kupon").fill("baru 2026");
  assert.equal(await added.getByLabel("Kode kupon").inputValue(), "BARU2026");
  await added.getByLabel("Jenis potongan").selectOption("amount");
  await added.getByLabel("Potongan (Rp)").fill("50000");
  await added.getByLabel("Belanja minimal (Rp)").fill("500000");
  await added.getByLabel("Kuota pemakaian").fill("20");
  await added.getByLabel("Sekali per tamu", { exact: false }).check();
  shots && (await vouchers.screenshot({ path: `${shots}/kupon-admin.png` }));
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  const saved = (await state()).content.shop.vouchers.find(
    (v) => v.code === "BARU2026",
  );
  assert.deepEqual(
    [saved.kind, saved.value, saved.minSpend, saved.limit, saved.oncePerGuest],
    ["amount", 50000, 500000, 20, true],
  );
  // The crossed-out price must be above the price.
  await a.locator(".admin-shop-item", { hasText: "Open heel fins" }).click();
  const compare = a.getByLabel("Harga normal, dicoret (Rp)");
  assert.equal(await compare.inputValue(), "1600000");
  await compare.fill("1000000");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByText(
      "Harga coret Open heel fins harus lebih tinggi dari harga jualnya.",
      { exact: false },
    )
    .first()
    .waitFor();
  await compare.fill("");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  assert.equal(
    (await state()).content.shop.products.find((p) => p.id === "demo-fins")
      .comparePrice,
    undefined,
  );
  assert.deepEqual(errors, []);
  console.log("Crossed-out prices and vouchers verified.");
} finally {
  await browser.close();
  mock.server.close();
}
