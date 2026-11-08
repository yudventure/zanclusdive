// Reservations and purchases kept apart. Diving, snorkeling, trips and
// gear rentals have a date and stay in Kalender reservasi, a Dive Shop
// rental under the name Sewa alat. Goods bought from the Dive Shop go to
// Pembelian barang, where the team only marks whether they are paid. The
// Dive Shop list also sets the order of the products on the website. Run
// against a demo server started with CMS_DEMO_LOGIN=true
// CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { isPurchase } from "../src/booking-kind.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
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
const guest = await browser.newContext();
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await admin.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const a = await admin.newPage();
const errors = [];
a.on("pageerror", (error) => errors.push("admin: " + error.message));
a.on("dialog", (dialog) => dialog.accept());
const api = (path, method = "GET", data) =>
  admin.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const state = async () => (await api("/api/admin/state")).json();
let visitor = 0;
// An order straight to the payment API, as the shop pages send it.
const order = async (name, lines) => {
  const response = await guest.request.post(base + "/api/payments?locale=id", {
    headers: { Origin: base, "x-real-ip": `10.9.0.${++visitor}` },
    data: {
      kind: "shop",
      method: "transfer",
      lines,
      days: 2,
      startDate: plus(4),
      fare: "standard",
      name,
      whatsapp: "081234567890",
      email: "",
      notes: "",
      delivery: { method: "pickup" },
    },
  });
  assert.equal(response.status(), 201, await response.text());
  return response.json();
};
const visibleText = (locator) => locator.innerText();

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  // Bank transfer on, so the orders wait for the team.
  const first = await state();
  first.content.payments.enabled = true;
  first.content.payments.transfer = true;
  first.content.payments.accounts = [
    { bank: "BCA", number: "123 456 7890", holder: "PT Zanclus Dive Center" },
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
  await order("Pembeli Masker", [
    { source: "product", id: "demo-mask", mode: "sale", quantity: 2 },
    {
      source: "product",
      id: "demo-fins",
      mode: "sale",
      size: "M",
      quantity: 1,
    },
  ]);
  await order("Penyewa Fins", [
    {
      source: "product",
      id: "demo-fins-sewa",
      mode: "rental",
      size: "L",
      quantity: 1,
    },
  ]);
  await order("Campur Beli Sewa", [
    { source: "product", id: "demo-light", mode: "sale", quantity: 1 },
    { source: "product", id: "demo-mask-sewa", mode: "rental", quantity: 1 },
  ]);

  // The reservation calendar keeps the rentals, under Sewa alat, and not
  // the purchase.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const list = a.locator("#daftar-reservasi");
  await list.getByText("Penyewa Fins").waitFor();
  const reservations = await visibleText(list);
  assert.match(reservations, /Penyewa Fins[\s\S]*?Sewa alat/);
  assert.match(reservations, /Campur Beli Sewa/);
  assert.doesNotMatch(reservations, /Pembeli Masker/);
  assert.doesNotMatch(reservations, /Dive Shop/);
  const sidebar = await visibleText(a.locator(".admin-sidebar-note"));
  // The demo's own requests and the two rentals, not the purchase.
  const waiting = (await state()).bookings.filter(
    (b) => b.status === "pending",
  );
  assert.equal(
    waiting.length - waiting.filter(isPurchase).length,
    waiting.length - 1,
  );
  assert.match(
    sidebar,
    new RegExp(`${waiting.length - 1} reservasi menunggu konfirmasi\\.`),
  );
  assert.match(sidebar, /1 pembelian barang belum dibayar\./);

  // Pembelian barang: the purchase, with its goods and pick-up, unpaid.
  await a.getByRole("link", { name: "Pembelian barang" }).first().click();
  await a.waitForURL(/\/admin\/orders$/);
  const table = a.locator("#daftar-pembelian");
  await table.getByText("Pembeli Masker").waitFor();
  const row = table.locator("tr", { hasText: "Pembeli Masker" });
  const rowText = await visibleText(row);
  assert.match(rowText, /2 × Mask & snorkel set/);
  assert.match(rowText, /Open heel fins ukuran M/);
  assert.match(rowText, /Ambil sendiri di dive center/);
  assert.match(rowText, /Belum dibayar/);
  assert.match(rowText, /Menunggu transfer bank, batas/);
  assert.equal(
    await table.locator("tbody tr").count(),
    1,
    "only purchases are listed",
  );
  assert.match(
    await visibleText(a.locator(".admin-purchases .admin-month-views")),
    /Belum dibayar \(1\)[\s\S]*Sudah dibayar \(0\)[\s\S]*Semua \(1\)/,
  );
  if (shots)
    await a.screenshot({
      path: shots + "/pembelian-barang.png",
      fullPage: true,
    });
  // The transfer arrived: marked paid from the row.
  await row.getByRole("button", { name: "Sudah dibayar" }).click();
  await a
    .getByText(/Pembelian Pembeli Masker tercatat sudah dibayar/)
    .waitFor();
  await a.getByRole("button", { name: "Semua (1)" }).click();
  assert.match(
    await visibleText(table.locator("tr", { hasText: "Pembeli Masker" })),
    /Sudah dibayar[\s\S]*Lewat Transfer bank/,
  );
  let booking = (await state()).bookings.find(
    (b) => b.guestName === "Pembeli Masker",
  );
  assert.deepEqual(
    [booking.status, booking.payment.status, booking.payment.method],
    ["confirmed", "paid", "transfer"],
  );
  assert.doesNotMatch(
    await visibleText(a.locator(".admin-sidebar-note")),
    /pembelian barang belum dibayar/,
  );

  // The bell still lists what waits, a purchase opens Pembelian barang.
  await order("Pembeli Senter", [
    { source: "product", id: "demo-light", mode: "sale", quantity: 1 },
  ]);
  await a.goto(base + "/admin", { waitUntil: "networkidle" });
  const cards = await visibleText(a.locator(".admin-kpi-grid"));
  assert.match(cards, /Pembelian belum dibayar\s*1/);
  assert.match(cards, /Pembelian lunas/);
  assert.equal(await a.locator(".admin-kpi-grid .admin-stat").count(), 8);
  assert.doesNotMatch(
    await visibleText(
      a.locator(".admin-card", { hasText: "Reservasi terbaru" }),
    ),
    /Pembeli Senter|Pembeli Masker/,
  );
  await a.getByRole("button", { name: "Notifikasi reservasi" }).click();
  const bell = a.locator(".admin-bell-popover");
  await bell.getByText("Pembeli Senter").click();
  const notice = a.locator(".admin-notice");
  await notice.waitFor();
  const noticeText = await visibleText(notice);
  assert.match(noticeText, /Pembelian, menunggu transfer bank/i);
  assert.match(noticeText, /Barang\s*Dive torch/);
  assert.doesNotMatch(noticeText, /Peserta|kalender/i);
  await notice
    .getByRole("button", { name: "Lihat di Pembelian barang" })
    .click();
  await a.waitForURL(/\/admin\/orders/);
  await a
    .locator("#daftar-pembelian tr.is-focus", { hasText: "Pembeli Senter" })
    .waitFor();
  // Cancelled from the list.
  await a
    .locator("#daftar-pembelian tr", { hasText: "Pembeli Senter" })
    .getByRole("button", { name: "Batalkan" })
    .click();
  await a.getByText("Pembelian Pembeli Senter dibatalkan.").waitFor();
  booking = (await state()).bookings.find(
    (b) => b.guestName === "Pembeli Senter",
  );
  assert.equal(booking.status, "cancelled");

  // Tamu counts reservations and purchases apart.
  await a.goto(base + "/admin/customers", { waitUntil: "networkidle" });
  assert.match(
    await visibleText(a.locator(".admin-table thead")),
    /Reservasi\s*Pembelian/,
  );

  // The Dive Shop list sets the order of the website.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  const shopList = a.locator(".admin-shop-list");
  await shopList
    .getByText(/Urutan di sini sama dengan urutan di website/)
    .waitFor();
  const names = async () =>
    shopList
      .locator(".admin-shop-row:not(.is-variant) .admin-shop-item strong")
      .allInnerTexts();
  const before = await names();
  assert.deepEqual(before.slice(0, 2), [
    "Mask & snorkel set",
    "Open heel fins",
  ]);
  assert.equal(before.at(-1), "Dive torch");
  const arrows = (name) =>
    shopList.getByRole("group", { name: `Urutan ${name}` });
  assert.ok(
    await arrows("Mask & snorkel set")
      .getByRole("button", { name: "Naikkan" })
      .isDisabled(),
  );
  await arrows("Mask & snorkel set")
    .getByRole("button", { name: "Turunkan" })
    .click();
  await arrows("Dive torch").getByRole("button", { name: "Naikkan" }).click();
  // Dragged with a mouse: the regulator to the top. The list is brought
  // to the middle of the window, clear of the sticky header.
  await shopList
    .locator(".admin-shop-row", { hasText: "BCD jacket" })
    .evaluate((row) => row.scrollIntoView({ block: "center" }));
  await shopList
    .locator(".admin-shop-row", { hasText: "Regulator set" })
    .dragTo(
      shopList.locator(".admin-shop-row", { hasText: "Open heel fins" }),
      {
        targetPosition: { x: 40, y: 12 },
      },
    );
  const after = await names();
  assert.deepEqual(after.slice(0, 3), [
    "Regulator set",
    "Open heel fins",
    "Mask & snorkel set",
  ]);
  assert.deepEqual(after.slice(-2), ["Dive torch", "Dive computer"]);
  if (shots) await shopList.screenshot({ path: shots + "/urutan-produk.png" });
  // Searching hides the arrows: the order is the whole list's.
  await shopList.getByLabel("Cari produk").fill("fins");
  await shopList
    .getByText("Kosongkan pencarian untuk mengubah urutan.")
    .waitFor();
  assert.equal(await shopList.locator(".admin-shop-order").count(), 0);
  await shopList.getByLabel("Cari produk").fill("");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a.locator(".admin-success, .admin-error").first().waitFor();
  assert.match(
    await a.locator(".admin-success, .admin-error").first().innerText(),
    /Perubahan sudah tersimpan/,
  );
  const saved = (await state()).content.shop.products
    .filter((p) => p.saleEnabled)
    .map((p) => p.id);
  assert.deepEqual(saved.slice(0, 3), [
    "demo-regulator",
    "demo-fins",
    "demo-mask",
  ]);
  // The rental products keep their own order.
  assert.deepEqual(
    (await state()).content.shop.products
      .filter((p) => p.rentalEnabled)
      .map((p) => p.id)
      .slice(0, 2),
    ["demo-mask-sewa", "demo-fins-sewa"],
  );
  const shop = await guest.newPage();
  await shop.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  const shown = await shop
    .locator(".shop-product-card")
    .evaluateAll((cards) => cards.map((c) => c.dataset.product));
  assert.deepEqual(shown.slice(0, 3), [
    "demo-regulator",
    "demo-fins",
    "demo-mask",
  ]);
  assert.deepEqual(errors, []);
  console.log(
    "PASS purchases: a Dive Shop purchase stays out of Kalender reservasi and the reservation counts, rentals show as Sewa alat, Pembelian barang lists goods, pick-up and payment, marks a transfer paid and cancels, the bell and notice send a purchase there, the overview counts unpaid and paid purchases, Tamu counts both; the Dive Shop list orders products with arrows and dragging, variants and the other kind untouched, saved and followed by the public shop.",
  );
} finally {
  await browser.close();
}
