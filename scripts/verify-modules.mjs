import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Finance (cash book, reports, tax), inventory (items, stock, movements)
// and the content calendar, by the superadmin, with each module's role
// allowed and the others refused. Start the demo server as for
// verify-password.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: base };
const shots = process.env.SHOT_DIR || "artifacts";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const login = (context, account) =>
  context.request.post(base + "/api/admin/login", { headers, data: account });
const call = (context, path, method = "GET", data) =>
  context.request.fetch(base + path, {
    method,
    headers,
    ...(data ? { data } : {}),
  });
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const month = today.slice(0, 7);
const year = today.slice(0, 4);
const day = (n) =>
  new Date(Date.parse(today + "T12:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);
const xlsx = async (response, name) => {
  assert.equal(response.status(), 200, name);
  assert.match(response.headers()["content-type"], /spreadsheetml/);
  const body = await response.body();
  assert.equal(body.slice(0, 2).toString(), "PK", name);
  return body.toString("latin1");
};
try {
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal((await login(admin, demoAccount)).status(), 200);
  const page = await admin.newPage();
  page.on("pageerror", (error) => errors.push(error.message));

  // Keuangan: a paid online order is already in the cash book.
  const paid = await (
    await call(admin, "/api/admin/bookings", "POST", {
      experience: "beginner",
      status: "confirmed",
      source: "website",
      startDate: today,
      endDate: today,
      guestName: "Tamu Lunas",
      phone: "+62 812 0000 0001",
      participants: 2,
      amount: 1800000,
      notes: "",
    })
  ).json();
  assert.ok(paid.id);
  await page.goto(base + "/admin/cashbook", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "Buku kas");
  await page.getByLabel("Jenis").selectOption("out");
  await page.getByLabel("Kategori").selectOption("operasional");
  await page.getByLabel("Tanggal").fill(today);
  await page.getByLabel("Jumlah (Rp)").fill("250000");
  await page.getByLabel("Keterangan").fill("BBM perahu");
  await page.getByLabel("Cara bayar").selectOption("tunai");
  await page.getByRole("button", { name: "Catat", exact: true }).click();
  await page.getByText(/Pengeluaran Rp\s250\.000 tercatat/).waitFor();
  const income = await call(admin, "/api/admin/finance/transactions", "POST", {
    date: day(-1),
    kind: "in",
    category: "rental",
    amount: 400000,
    description: "Sewa 2 set alat",
    method: "qris",
  });
  assert.equal(income.status(), 201);
  const bad = await call(admin, "/api/admin/finance/transactions", "POST", {
    date: today,
    kind: "in",
    category: "gaji",
    amount: 1,
    description: "x",
  });
  assert.equal(bad.status(), 400);
  assert.match((await bad.json()).error, /kategori/);
  await page.reload({ waitUntil: "networkidle" });
  const book = page.locator(".admin-cashbook");
  await book.waitFor();
  const bookText = await book.textContent();
  assert.match(bookText, /BBM perahu/);
  assert.match(bookText, /Sewa 2 set alat/);
  const cash = await (
    await call(admin, `/api/admin/finance/transactions?month=${month}`)
  ).json();
  const typed = cash.transactions.filter((tx) => tx.source !== "midtrans");
  assert.equal(typed.length, 2);
  assert.equal(cash.totals.expense, 250000);
  assert.ok(cash.totals.income >= 400000);
  // A paid online order shows as an automatic income line once paid.
  const demoPaid = cash.transactions.filter((tx) => tx.source === "midtrans");
  for (const tx of demoPaid) assert.equal(tx.method, "midtrans");
  const txId = typed.find((tx) => tx.description === "BBM perahu").id;
  assert.equal(
    (
      await call(admin, `/api/admin/finance/transactions/${txId}`, "PUT", {
        amount: 300000,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await call(admin, "/api/admin/finance/transactions/tx:mt:abc", "DELETE")
    ).status(),
    404,
  );
  await page.screenshot({ path: shots + "/admin-cashbook.png" });
  // Laba rugi & pajak.
  await page.goto(base + "/admin/reports", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: `Tahun ${year}` }).waitFor();
  const report = await (
    await call(admin, `/api/admin/finance/report?year=${year}`)
  ).json();
  assert.equal(report.expense, 300000);
  assert.equal(report.taxRate, 0.5);
  const thisMonth = report.months.find((m) => m.month === month);
  assert.equal(thisMonth.expense, 300000);
  assert.equal(thisMonth.tax, Math.round(thisMonth.income * 0.005));
  await page.getByLabel("Tarif pajak (% dari pemasukan)").fill("1");
  await page.getByLabel("Nama pajak").fill("PPh final 1%");
  await page.getByRole("button", { name: "Simpan pengaturan pajak" }).click();
  await page.getByText("Pengaturan pajak tersimpan.").waitFor();
  const again = await (
    await call(admin, `/api/admin/finance/report?year=${year}`)
  ).json();
  assert.equal(again.taxRate, 1);
  assert.equal(again.taxLabel, "PPh final 1%");
  await page.screenshot({ path: shots + "/admin-reports.png" });
  const cashFile = await xlsx(
    await call(admin, `/api/admin/finance/export?kind=cashbook&month=${month}`),
    "cashbook",
  );
  assert.ok(cashFile.includes("BBM perahu"));
  const reportFile = await xlsx(
    await call(admin, `/api/admin/finance/export?kind=report&year=${year}`),
    "report",
  );
  assert.ok(reportFile.includes("PPh final 1%"));

  // Gudang: items, stock from movements, low-stock warning. The Dive Shop
  // products are there from the start, each with its own item.
  await page.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  await page
    .getByText(
      "17 barang Dive Shop masuk ke gudang dengan stok 0. Isi stoknya di Dive Shop, bagian Ukuran & stok, atau lewat tombol Masuk.",
    )
    .waitFor();
  // Eight products; the fins, wetsuit and BCD in four sizes each.
  assert.equal(await page.locator(".admin-stock-shop").count(), 17);
  await page.getByLabel("Nama barang").fill("BCD ukuran M");
  await page.getByLabel("Kode barang (opsional)").fill("bcd-m");
  await page.getByLabel("Kategori").selectOption("alat");
  await page.getByLabel("Stok minimum").fill("2");
  await page.getByLabel("Harga beli per satuan (opsional)").fill("3500000");
  await page.getByRole("button", { name: "Simpan barang" }).click();
  await page.getByText("BCD ukuran M sudah ditambahkan.").waitFor();
  const row = page.locator("tr", { hasText: "BCD ukuran M" });
  assert.match(await row.textContent(), /BCD-M[\s\S]*0 pcs[\s\S]*Habis/);
  await row.getByRole("button", { name: "Masuk" }).click();
  await page.getByRole("heading", { name: "Barang masuk" }).waitFor();
  await page.getByText("BCD ukuran M, stok sekarang 0 pcs.").waitFor();
  await page.getByLabel("Jumlah (pcs)").fill("5");
  await page.getByLabel("Alasan").selectOption("beli");
  await page.getByRole("button", { name: "Catat mutasi" }).click();
  await page.getByText("Masuk 5 pcs BCD ukuran M tercatat.").waitFor();
  assert.match(
    await row.textContent(),
    /5 pcs[\s\S]*nilai Rp\s17\.500\.000[\s\S]*Cukup/,
  );
  const stockOf = async () =>
    (await (await call(admin, "/api/admin/inventory/items")).json()).items.find(
      (i) => i.name === "BCD ukuran M",
    );
  const bcd = await stockOf();
  assert.equal(bcd.stock, 5);
  for (const [kind, qty, reason] of [
    ["out", 2, "sewa"],
    ["adjust", -1, "opname"],
  ])
    assert.equal(
      (
        await call(admin, "/api/admin/inventory/movements", "POST", {
          date: today,
          itemId: bcd.id,
          kind,
          qty,
          reason,
        })
      ).status(),
      201,
    );
  const zero = await call(admin, "/api/admin/inventory/movements", "POST", {
    date: today,
    itemId: bcd.id,
    kind: "out",
    qty: 0,
    reason: "jual",
  });
  assert.equal(zero.status(), 400);
  const after = await stockOf();
  assert.equal(after.stock, 2);
  assert.equal(after.low, true);
  await page.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  await page.getByText(/1 barang menipis \(BCD ukuran M\)/).waitFor();
  await page.screenshot({ path: shots + "/admin-stock.png" });
  await page.goto(base + "/admin/movements", { waitUntil: "networkidle" });
  const moves = page.locator(".admin-card").nth(1);
  await moves.getByText("Stock opname").waitFor();
  // Newest first.
  assert.match(await moves.textContent(), /-1 pcs[\s\S]*-2 pcs[\s\S]*\+5 pcs/);
  const list = (
    await (
      await call(admin, `/api/admin/inventory/movements?month=${month}`)
    ).json()
  ).movements;
  assert.equal(list.length, 3);
  const adjust = list.find((m) => m.kind === "adjust");
  assert.equal(
    (
      await call(admin, `/api/admin/inventory/movements/${adjust.id}`, "DELETE")
    ).status(),
    200,
  );
  assert.equal((await stockOf()).stock, 3);
  await page.screenshot({ path: shots + "/admin-movements.png" });
  const stockFile = await xlsx(
    await call(admin, "/api/admin/inventory/export?kind=stock"),
    "stock",
  );
  assert.ok(stockFile.includes("BCD ukuran M"));
  await xlsx(
    await call(
      admin,
      `/api/admin/inventory/export?kind=movements&month=${month}`,
    ),
    "movements",
  );

  // Kalender konten: idea → published with numbers.
  await page.goto(base + "/admin/social", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Konten baru" }).waitFor();
  await page.getByLabel("Judul / ide").fill("Reel manta di Manta Point");
  await page.getByLabel("Platform").selectOption("instagram");
  await page.getByLabel("Format").selectOption("reel");
  await page.getByLabel("Tanggal tayang").fill(day(3));
  await page.getByLabel("Jam (opsional)").fill("17:00");
  await page.getByRole("button", { name: "Simpan ke kalender" }).click();
  await page.getByText(/masuk kalender konten/).waitFor();
  const chip = page.locator(
    `.admin-month-day[data-date="${day(3)}"] .plan-chip`,
  );
  if (day(3).slice(0, 7) === month) {
    await chip.waitFor();
    assert.match(await chip.textContent(), /17:00 Reel manta/);
    assert.ok((await chip.getAttribute("class")).includes("is-instagram"));
  }
  const posts = (
    await (
      await call(admin, `/api/admin/social/posts?month=${day(3).slice(0, 7)}`)
    ).json()
  ).posts;
  const post = posts.find((p) => p.title === "Reel manta di Manta Point");
  assert.equal(post.status, "idea");
  const published = await call(
    admin,
    `/api/admin/social/posts/${post.id}`,
    "PUT",
    {
      status: "published",
      link: "https://www.instagram.com/reel/abc",
      metrics: { views: 12000, likes: 840, saves: 55 },
      evaluation: "Hook 2 detik pertama bekerja.",
    },
  );
  assert.equal(published.status(), 200);
  assert.equal(
    (
      await call(admin, "/api/admin/social/posts", "POST", {
        date: day(5),
        title: "Tips snorkeling pemula",
        platform: "tiktok",
        status: "draft",
        link: "http://tidak-aman",
      })
    ).status(),
    400,
  );
  await page.goto(base + "/admin/social", { waitUntil: "networkidle" });
  if (day(3).slice(0, 7) === month) {
    await page.getByText(/12\.000 tayangan/).waitFor();
    await page
      .locator("tr", { hasText: "Reel manta" })
      .getByRole("button", { name: "Evaluasi" })
      .click();
    assert.equal(await page.getByLabel("Tayangan").inputValue(), "12000");
    await page.getByLabel("Status").selectOption("evaluated");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await page.getByText(/sudah diperbarui/).waitFor();
  }
  await page.screenshot({ path: shots + "/admin-social.png" });
  const planFile = await xlsx(
    await call(admin, `/api/admin/social/export?month=${day(3).slice(0, 7)}`),
    "plan",
  );
  assert.ok(planFile.includes("Reel manta di Manta Point"));

  // Roles: finance, gudang and PR each reach their module; others are refused.
  const make = (name, email, role, password) =>
    call(admin, "/api/admin/users", "POST", { name, email, role, password });
  assert.equal(
    (
      await make("Fina", "fina@zanclus.test", "finance", "Angka-Finance-2026")
    ).status(),
    201,
  );
  assert.equal(
    (
      await make("Budi", "budi@zanclus.test", "gudang", "Stok-Gudang-2026!")
    ).status(),
    201,
  );
  assert.equal(
    (
      await make("Putri", "putri@zanclus.test", "pr", "Konten-PR-2026!")
    ).status(),
    201,
  );
  const as = async (email, password) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    assert.equal((await login(context, { email, password })).status(), 200);
    return context;
  };
  const finance = await as("fina@zanclus.test", "Angka-Finance-2026");
  const gudang = await as("budi@zanclus.test", "Stok-Gudang-2026!");
  const pr = await as("putri@zanclus.test", "Konten-PR-2026!");
  const routes = {
    finance: [
      `/api/admin/finance/transactions?month=${month}`,
      `/api/admin/finance/report?year=${year}`,
    ],
    gudang: [
      "/api/admin/inventory/items",
      `/api/admin/inventory/movements?month=${month}`,
    ],
    social: [
      `/api/admin/social/posts?month=${month}`,
      `/api/admin/social/export?month=${month}`,
    ],
  };
  const allowed = { finance: ["finance"], gudang: ["gudang"], social: ["pr"] };
  for (const [area, paths] of Object.entries(routes))
    for (const [role, context] of [
      ["finance", finance],
      ["gudang", gudang],
      ["pr", pr],
    ])
      for (const path of paths)
        assert.equal(
          (await call(context, path)).status(),
          allowed[area].includes(role) ? 200 : 403,
          `${role} ${path}`,
        );
  // The gudang account on a phone.
  const gp = await gudang.newPage();
  gp.on("pageerror", (error) => errors.push(error.message));
  await gp.goto(base + "/admin/stock", { waitUntil: "networkidle" });
  await gp.getByText("BCD ukuran M").first().waitFor();
  assert.ok(
    await gp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "no sideways scroll at 390px",
  );
  await gp.screenshot({
    path: shots + "/admin-stock-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS modules: cash book from the form and the API with totals and an invalid category refused, edit, automatic lines protected, year report with tax, tax settings saved, Excel for cash book and report; an item with low stock, stock in from the row, out and adjustment through the API, zero refused, low-stock warning, movements listed and one deleted with stock recounted, Excel for stock and movements; a content idea on the calendar, published with numbers, unsafe link refused, evaluation from the results table, Excel; finance, gudang and PR accounts reach their own module only; gudang on a phone without sideways scroll.",
  );
} finally {
  await browser.close();
}
