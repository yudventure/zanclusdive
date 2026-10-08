import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3182";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Mutation tests must target a local test server.",
);
const origin = new URL(base).origin,
  headers = { Origin: origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const api = context.request;
let originals;
async function state() {
  const response = await api.get(base + "/api/admin/state");
  assert.equal(response.status(), 200);
  return response.json();
}
async function save(content, version) {
  return api.put(base + "/api/admin/settings", {
    headers,
    data: { content, version },
  });
}
try {
  await mkdir("artifacts", { recursive: true });
  assert.equal((await api.get(base + "/api/admin/state")).status(), 401);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator('#dive-shop a[href="/dive-shop"]').click();
  await page
    .getByRole("heading", { name: "Temukan perlengkapanmu." })
    .waitFor();
  assert.equal(await page.locator(".shop-product-card").count(), 7);
  assert.equal(
    await page
      .locator(".shop-hero .button.lime")
      .evaluate((el) => getComputedStyle(el).color),
    "rgb(6, 43, 59)",
  );
  await page.screenshot({
    path: "artifacts/dive-shop-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Rental alat", exact: true }).click();
  assert.equal(await page.locator(".shop-product-card").count(), 8);
  await page.getByLabel("Kategori perlengkapan").selectOption("fins");
  assert.equal(await page.locator(".shop-product-card").count(), 1);
  await page
    .getByRole("button", {
      name: "Tambahkan Open heel fins untuk rental",
      exact: true,
    })
    .click();
  await page.getByLabel("Jumlah Open heel fins rental").selectOption("2");
  await page.getByLabel("Durasi (hari)", { exact: true }).fill("3");
  await page.getByLabel("Nama kamu", { exact: true }).fill("Tamu Uji Shop");
  await page
    .getByLabel("Ukuran / catatan (opsional)")
    .fill("Fin ukuran M, ambil di dive center");
  assert.match(await page.locator(".shop-total").textContent(), /1\.100\.000/);
  await page.getByRole("button", { name: "Siapkan pesan pesanan" }).click();
  const url = await page
    .getByRole("link", { name: "Lanjut ke WhatsApp" })
    .getAttribute("href");
  assert.ok(url.startsWith("https://wa.me/6285190849237?text="));
  const message = new URL(url).searchParams.get("text");
  assert.match(message, /BELI · Mask & snorkel set × 1/);
  assert.match(message, /RENTAL · Open heel fins × 2/);
  assert.match(message, /selama 3 hari/);
  assert.match(message, /Fin ukuran M/);
  assert.match(message, /contoh demo/);
  // Do not send or navigate to WhatsApp during verification.
  await page.getByLabel("Durasi (hari)", { exact: true }).fill("2");
  assert.equal(
    await page.locator(".shop-send").count(),
    0,
    "Editing the plan invalidates the old message",
  );
  await page
    .getByRole("button", { name: "Hapus Mask & snorkel set beli", exact: true })
    .click();
  assert.match(await page.locator(".shop-total").textContent(), /300\.000/);
  await page.getByLabel("Kategori perlengkapan").selectOption("all");
  await page.getByLabel("Cari perlengkapan").fill("not-a-product");
  assert.equal(await page.locator(".shop-product-card").count(), 0);
  await page.getByLabel("Cari perlengkapan").fill("");
  for (const width of [1000, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Shop overflow at ${width}`,
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    if (width === 390) {
      await page
        .getByRole("button", { name: "Buka menu", exact: true })
        .click();
      await page
        .locator("#shop-navigation")
        .getByRole("link", { name: "Dive Shop", exact: true })
        .click();
      assert.equal(await page.locator("#shop-navigation").isVisible(), false);
      await page.locator(".shop-mobile-order").click();
      await page.waitForFunction(() => {
        const y = document.querySelector("#order").getBoundingClientRect().y;
        return y >= 70 && y < 200;
      });
      const rect = await page.locator("#order").boundingBox();
      assert.ok(rect.y >= 70 && rect.y < 200);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.screenshot({
        path: "artifacts/dive-shop-mobile.png",
        fullPage: true,
      });
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(
    (
      await api.post(base + "/api/admin/login", { headers, data: demoAccount })
    ).status(),
    200,
  );
  const initial = await state();
  originals = initial.content;
  assert.equal(initial.content.shop.products.length, 8);
  await page.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Dive Shop", exact: true }).waitFor();
  await page.getByLabel("Harga jual (Rp)", { exact: true }).fill("720000");
  await page.getByLabel("Harga rental per hari (Rp)").fill("55000");
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  const live = await context.newPage();
  live.on("pageerror", (e) => errors.push(e.message));
  await live.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  assert.match(
    await live.locator('[data-product="demo-mask"] .shop-price').textContent(),
    /720\.000/,
  );
  await live.getByRole("button", { name: "Rental alat", exact: true }).click();
  assert.match(
    await live.locator('[data-product="demo-mask"] .shop-price').textContent(),
    /55\.000/,
  );

  await page
    .getByRole("button", { name: "+ Tambah produk", exact: true })
    .click();
  await page.getByLabel("Nama produk", { exact: true }).fill("Mask Uji CMS");
  await page
    .getByLabel("Deskripsi produk", { exact: true })
    .fill("Perlengkapan untuk pengujian katalog.");
  await page.getByLabel("Harga jual (Rp)", { exact: true }).fill("800000");
  await page.getByLabel("Harga rental per hari (Rp)").fill("60000");
  await page.getByLabel("Tampilkan produk di website", { exact: true }).check();
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  let snapshot = await state();
  const added = snapshot.content.shop.products.find(
    (p) => p.name === "Mask Uji CMS",
  );
  assert.ok(added);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mask Uji CMS" }).click();
  assert.equal(
    await page.getByLabel("Harga jual (Rp)", { exact: true }).inputValue(),
    "800000",
  );
  await live.reload({ waitUntil: "networkidle" });
  await live.locator(`[data-product="${added.id}"]`).waitFor();
  await page.getByLabel("Ketersediaan produk").selectOption("unavailable");
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  await live.reload({ waitUntil: "networkidle" });
  assert.equal(
    await live.locator(`[data-product="${added.id}"] button`).isDisabled(),
    true,
  );
  await page
    .getByLabel("Tampilkan produk di website", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  await live.reload({ waitUntil: "networkidle" });
  assert.equal(await live.locator(`[data-product="${added.id}"]`).count(), 0);

  const upload = await api.post(base + "/api/admin/media", {
    headers,
    multipart: {
      file: {
        name: "shop-test.webp",
        mimeType: "image/webp",
        buffer: await readFile("public/assets/reef.webp"),
      },
    },
  });
  assert.equal(upload.status(), 201);
  const picture = await upload.json();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Pilih foto dari media").selectOption(picture.url);
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  await live.reload({ waitUntil: "networkidle" });
  assert.equal(
    await live.locator('[data-product="demo-mask"] img').getAttribute("src"),
    picture.url,
  );
  assert.ok(
    await live
      .locator('[data-product="demo-mask"] img')
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  snapshot = await state();
  const bad = structuredClone(snapshot.content);
  bad.shop.products[0].salePrice = -1;
  assert.equal((await save(bad, snapshot.version)).status(), 400);
  assert.equal((await save(originals, initial.version)).status(), 409);
  const missing = structuredClone(snapshot.content);
  delete missing.shop;
  assert.equal(
    (await save(missing, snapshot.version)).status(),
    400,
    "Old editors cannot erase new shop data",
  );
  await page.getByRole("button", { name: "Mask Uji CMS" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Hapus produk ini", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simpan katalog Dive Shop", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  assert.ok(
    !(await state()).content.shop.products.some((p) => p.id === added.id),
  );
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({
    path: "artifacts/dive-shop-admin.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Admin shop mobile overflow",
  );
  await page.screenshot({
    path: "artifacts/dive-shop-admin-mobile.png",
    fullPage: true,
  });
  snapshot = await state();
  assert.equal((await save(originals, snapshot.version)).status(), 200);
  assert.deepEqual(errors, []);
  console.log(
    "PASS Dive Shop: mixed sale/rental totals, filters, quantity/duration, WhatsApp message without sending, mobile navigation, CMS add/edit/delete, stock/draft visibility, live prices, uploaded photos, validation, auth, optimistic conflicts, and reload persistence.",
  );
} finally {
  if (originals) {
    const snapshot = await state().catch(() => null);
    if (snapshot) await save(originals, snapshot.version).catch(() => {});
  }
  await browser.close();
}
