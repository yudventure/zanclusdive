// Gudang in two pages. Barang & stok lists the stock of the Dive Shop
// products (nothing is added there), searched and filtered, with Masuk,
// Keluar and Kartu stok leading to Keluar masuk. Keluar masuk records
// stock in, out and a stock opname from the counted quantity, with the
// item picked from a searchable list, and shows an item's stock card with
// the stock after each movement. Sales from online orders are recorded by
// themselves and cannot be deleted. Run against a demo server started
// with CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { choose } from "./pick.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await admin.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const a = await admin.newPage();
const errors = [];
a.on("pageerror", (error) => errors.push("admin: " + error.message));
const api = (path, method = "GET", data) =>
  admin.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const state = async () => (await api("/api/admin/state")).json();
const items = async () =>
  (await (await api("/api/admin/inventory/items")).json()).items;
const itemOf = async (productId, mode, size = "") =>
  (await items()).find(
    (i) => i.productId === productId && i.mode === mode && i.size === size,
  );
const stockRow = (...words) =>
  words.reduce(
    (rows, word) => rows.filter({ hasText: word }),
    a.locator(".admin-stock tbody tr"),
  );
const noSideScroll = async (page) =>
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

  // Barang & stok: the Dive Shop's items only, searched and filtered.
  await a.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  const list = a.locator(".admin-stock-card");
  await list.locator(".admin-stock tbody tr").first().waitFor();
  const total = await a.locator(".admin-stock tbody tr").count();
  assert.ok(total > 20);
  assert.equal(await a.getByText("Tambah barang").count(), 0);
  assert.equal(await a.getByLabel("Produk Dive Shop").count(), 0);
  const filters = await list
    .getByRole("group", { name: "Saring barang" })
    .innerText();
  const counts = Object.fromEntries(
    [...filters.matchAll(/([A-Za-z ]+) \((\d+)\)/g)].map(([, k, n]) => [
      k.trim(),
      Number(n),
    ]),
  );
  assert.equal(counts.Semua, total);
  assert.equal(counts["Barang jual"] + counts["Barang sewa"], total);
  await list.getByRole("button", { name: /^Barang sewa/ }).click();
  assert.equal(
    await a.locator(".admin-stock tbody tr").count(),
    counts["Barang sewa"],
  );
  assert.equal(
    await a
      .locator(".admin-stock tbody tr")
      .filter({ hasText: "Barang jual" })
      .count(),
    0,
  );
  await list.getByRole("button", { name: /^Semua/ }).click();
  await list.getByLabel("Cari barang").fill("bcd sewa m");
  assert.equal(await a.locator(".admin-stock tbody tr").count(), 1);
  assert.match(
    await a.locator(".admin-stock tbody tr").innerText(),
    /BCD jacket[\s\S]*Barang sewa[\s\S]*Ukuran M/,
  );
  // No mutation form on this page: Masuk leads to Keluar masuk.
  assert.equal(await a.locator("#movement-form").count(), 0);
  if (shots) await a.screenshot({ path: shots + "/gudang-stok.png" });
  await stockRow("BCD jacket", "Barang sewa", "Ukuran M")
    .getByRole("link", { name: "Masuk" })
    .click();
  await a.waitForURL(/\/admin\/movements$/);
  const form = a.locator("#movement-form");
  await form.getByText("Stok tercatat 0 pcs.").waitFor();
  assert.equal(
    await form.getByLabel("Barang", { exact: true }).inputValue(),
    "BCD jacket · Sewa · M",
  );
  assert.equal(
    await form
      .getByRole("group", { name: "Jenis mutasi" })
      .getByRole("button", { pressed: true })
      .innerText(),
    "Barang masuk",
  );
  // The quantity field has the focus, ready for the number.
  assert.equal(await a.evaluate(() => document.activeElement?.type), "number");
  await form.getByLabel("Jumlah (pcs)").fill("3");
  await form.getByLabel("Catatan (opsional)").fill("Nota PT Selam 12");
  await form.getByRole("button", { name: "Catat mutasi" }).click();
  await a
    .getByText("Masuk 3 pcs BCD jacket · Sewa · M tercatat. Stok kini 3 pcs.")
    .waitFor();
  // The stock card of the item opened from the link follows.
  const card = a.locator("#daftar-mutasi");
  await card.getByText("Kartu stok BCD jacket · Sewa · M").waitFor();

  // Barang keluar, with the item searched by words in any order.
  await form.getByRole("button", { name: "Barang keluar" }).click();
  const picker = form.getByLabel("Barang", { exact: true });
  await picker.click();
  await picker.fill("m sewa bcd");
  const options = a.getByRole("option");
  assert.ok((await options.count()) >= 1);
  assert.match(await options.first().innerText(), /BCD jacket · Sewa · M/);
  await picker.fill("tidak ada barang seperti ini");
  await a.getByText(/Tidak ada yang cocok/).waitFor();
  await picker.press("Escape");
  await choose(picker, "bcd sewa m", { option: "BCD jacket · Sewa · M" });
  await form.getByLabel("Jumlah (pcs)").fill("1");
  await form.getByLabel("Alasan").selectOption("rusak");
  await form.getByRole("button", { name: "Catat mutasi" }).click();
  await a
    .getByText(
      /Keluar 1 pcs BCD jacket · Sewa · M tercatat\. Stok kini 2 pcs\./,
    )
    .waitFor();

  // Stock opname: the counted quantity, the difference worked out.
  await form.getByRole("button", { name: "Stock opname" }).click();
  await form.getByLabel("Jumlah hasil hitung (pcs)").fill("5");
  await form.getByText("Selisih +3 pcs dari stok tercatat 2.").waitFor();
  await form.getByRole("button", { name: "Catat mutasi" }).click();
  await a
    .getByText(
      /Stock opname BCD jacket · Sewa · M tercatat, stok kini 5 pcs \(\+3\)\./,
    )
    .waitFor();
  // The same count again records nothing.
  await form.getByLabel("Jumlah hasil hitung (pcs)").fill("5");
  await form.getByRole("button", { name: "Catat mutasi" }).click();
  await a.getByText(/sama dengan hasil hitung/).waitFor();
  assert.equal((await itemOf("demo-bcd-sewa", "rental", "M")).stock, 5);

  // The stock card: oldest first, the stock after each movement.
  const head = await card.locator(".admin-stock-card-head").innerText();
  assert.match(head, /Stok awal bulan\s*0 pcs/);
  assert.match(head, /Stok akhir bulan\s*5 pcs/);
  assert.match(head, /Stok sekarang\s*5 pcs/);
  const rows = await card.locator("tbody tr").allInnerTexts();
  assert.equal(rows.length, 3);
  assert.match(
    rows[0],
    /Masuk\s*\+3 pcs\s*3 pcs\s*Pembelian\s*Nota PT Selam 12/,
  );
  assert.match(rows[1], /Keluar\s*-1 pcs\s*2 pcs\s*Rusak atau hilang/);
  assert.match(rows[2], /Stock opname\s*\+3 pcs\s*5 pcs\s*Stock opname/);
  // Filtered by kind.
  await card
    .getByRole("group", { name: "Saring jenis mutasi" })
    .getByRole("button", { name: "Keluar" })
    .click();
  assert.equal(await card.locator("tbody tr").count(), 1);
  await card
    .getByRole("group", { name: "Saring jenis mutasi" })
    .getByRole("button", { name: "Semua" })
    .click();
  if (shots) await a.screenshot({ path: shots + "/gudang-kartu-stok.png" });
  // Back to every item: the month's movements, newest first.
  await choose(card.getByLabel("Saring barang"), "Semua barang", {
    exact: true,
  });
  await card.locator("th", { hasText: "Barang" }).waitFor();
  assert.equal(await card.locator(".admin-stock-card-head").count(), 0);

  // A sale from a paid online order is recorded by itself and stays.
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
  const ordered = await admin.request.post(base + "/api/payments?locale=id", {
    headers: { Origin: base, "x-real-ip": "10.8.0.1" },
    data: {
      kind: "shop",
      method: "transfer",
      lines: [
        { source: "product", id: "demo-light", mode: "sale", quantity: 2 },
      ],
      days: 1,
      fare: "standard",
      name: "Pembeli Senter",
      whatsapp: "081234567890",
      email: "",
      notes: "",
      delivery: { method: "pickup" },
    },
  });
  assert.equal(ordered.status(), 201, await ordered.text());
  const booking = (await state()).bookings.find(
    (b) => b.guestName === "Pembeli Senter",
  );
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jayapura",
  });
  assert.equal(
    (
      await api("/api/admin/bookings/" + booking.id, "PUT", {
        ...booking,
        email: "",
        lang: "id",
        status: "confirmed",
        billing: {
          action: "paid",
          method: "transfer",
          paidOn: today,
          notify: false,
        },
      })
    ).status(),
    200,
  );
  // The warehouse list records paid sales as it loads.
  await items();
  await a.goto(base + "/admin/movements", { waitUntil: "networkidle" });
  const sale = card.locator("tbody tr", { hasText: "Dive torch · Jual" });
  await sale.waitFor();
  assert.match(
    await sale.innerText(),
    /Keluar\s*-2 pcs\s*Penjualan\s*Pesanan online ZC-[\s\S]*Otomatis dari pesanan/,
  );
  assert.equal(await sale.getByRole("button", { name: "Hapus" }).count(), 0);
  // A movement typed by the team can be deleted.
  assert.equal(
    await card
      .locator("tbody tr", { hasText: "BCD jacket · Sewa · M" })
      .first()
      .getByRole("button", { name: "Hapus" })
      .count(),
    1,
  );

  // Phones: both pages fit, the picker opens under its field.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await phone.addCookies(await admin.cookies());
  const p = await phone.newPage();
  p.on("pageerror", (error) => errors.push("phone: " + error.message));
  await p.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  await p.locator(".admin-stock tbody tr").first().waitFor();
  await noSideScroll(p);
  await p.goto(base + "/admin/movements", { waitUntil: "networkidle" });
  const phonePicker = p
    .locator("#movement-form")
    .getByLabel("Barang", { exact: true });
  await phonePicker.click();
  await phonePicker.fill("fins");
  const box = await p.locator(".admin-search-list").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
  await noSideScroll(p);
  if (shots) await p.screenshot({ path: shots + "/gudang-mutasi-hp.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS gudang: Barang & stok lists only Dive Shop items with filters and search, no add form and no mutation form, Masuk opens Keluar masuk with the item chosen; the searchable item picker finds words in any order; in, out and stock opname from the counted quantity, the same count refused; the stock card with opening, closing and stock after each movement, filtered by kind; an online sale recorded by itself and not deletable; both pages on a phone.",
  );
} finally {
  await browser.close();
}
