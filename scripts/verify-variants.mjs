// One model in several variants, such as a mask in three colours: each
// variant is its own product with its own photos, price and stock, the
// Dive Shop and the homepage show the family as one card, the product
// window lets the guest pick the variant, and the admin makes, names and
// detaches variants. Run against a demo server started with
// CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3413";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
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
  // The demo mask for sale becomes a family of three colours.
  const first = await state();
  const products = first.content.shop.products;
  const at = products.findIndex((p) => p.id === "demo-mask");
  const lead = {
    ...products[at],
    name: "Masker Line Merah",
    variant: "Merah",
    variantLabel: "Warna",
    enabled: true,
    availability: "available",
    images: ["/assets/photos/gear.webp"],
  };
  const variant = (id, name, colour, salePrice, image) => {
    const copy = {
      ...lead,
      id,
      name,
      variant: colour,
      variantOf: "demo-mask",
      salePrice,
      images: [image],
    };
    delete copy.variantLabel;
    return copy;
  };
  products.splice(
    at,
    1,
    lead,
    variant(
      "demo-mask-hitam",
      "Masker Line Hitam",
      "Hitam",
      700000,
      "/assets/photos/diving-card.webp",
    ),
    variant(
      "demo-mask-putih",
      "Masker Line Putih",
      "Putih",
      650000,
      "/assets/photos/snorkeling.webp",
    ),
  );
  const en = first.content.en.shop.products;
  en["demo-mask"] = {
    ...en["demo-mask"],
    name: "Line Mask Red",
    variantLabel: "Colour",
  };
  en["demo-mask-hitam"] = { variant: "Black" };
  assert.equal(
    (
      await api("/api/admin/settings", "PUT", {
        content: first.content,
        version: first.version,
      })
    ).status(),
    200,
  );

  // The Dive Shop shows the family as one card, from its lowest price.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  const card = page.locator(".shop-product-card", {
    hasText: "Masker Line Merah",
  });
  assert.equal(
    await page
      .locator(".shop-product-card h3")
      .filter({ hasText: /Masker Line/ })
      .count(),
    1,
  );
  assert.equal(
    await card.locator(".shop-variant-count").textContent(),
    "3 pilihan warna",
  );
  assert.match(await card.locator(".shop-price").textContent(), /^Mulai/);
  assert.match(await card.locator(".shop-price").textContent(), /650\.000/);
  // Searching a variant's name finds the family's card.
  await page.getByRole("searchbox").first().fill("hitam");
  await page
    .locator(".shop-product-card h3", { hasText: "Masker Line Hitam" })
    .waitFor();
  assert.equal(await page.locator(".shop-product-card").count(), 1);
  await page.getByRole("searchbox").first().fill("");
  await card.waitFor();

  // The window shows the variants, and picking one shows its own photo,
  // price and name.
  await card.getByRole("button", { name: /Pilih varian/ }).click();
  const detail = page.locator("dialog.shop-detail");
  await detail.waitFor();
  const variants = detail.locator(".shop-variants");
  assert.equal(
    (await variants.locator("legend").textContent()).trim(),
    "Warna Merah",
  );
  assert.deepEqual(await variants.locator("label > span").allTextContents(), [
    "Merah",
    "Hitam",
    "Putih",
  ]);
  assert.equal(await variants.locator("label img").count(), 3);
  shots &&
    (await detail.screenshot({ path: `${shots}/varian-jendela-merah.png` }));
  await variants.getByText("Hitam", { exact: true }).click();
  await detail.locator("h2", { hasText: "Masker Line Hitam" }).waitFor();
  assert.match(
    await detail.locator(".shop-detail-price strong").textContent(),
    /700\.000/,
  );
  assert.match(
    await detail.locator(".shop-detail-visual img").getAttribute("src"),
    /diving-card/,
  );
  assert.equal(
    (await variants.locator("legend").textContent()).trim(),
    "Warna Hitam",
  );
  shots &&
    (await detail.screenshot({ path: `${shots}/varian-jendela-hitam.png` }));
  await detail.getByRole("button", { name: "Masukkan ke keranjang" }).click();
  await detail.waitFor({ state: "hidden" });
  // The cart holds the variant picked, as its own product.
  assert.deepEqual(await page.locator(".shop-cart-list h3").allTextContents(), [
    "Masker Line Hitam",
  ]);
  shots &&
    (await page
      .locator(".shop-product-grid")
      .screenshot({ path: `${shots}/varian-kartu-dive-shop.png` }));

  // English: the choice's own English name.
  await page.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  const english = page.locator(".shop-product-card", {
    hasText: "Line Mask Red",
  });
  assert.equal(
    await english.locator(".shop-variant-count").textContent(),
    "3 colour options",
  );
  await english.getByRole("button", { name: /Choose option/ }).click();
  assert.deepEqual(
    await page
      .locator("dialog.shop-detail .shop-variants label > span")
      .allTextContents(),
    ["Merah", "Black", "Putih"],
  );
  await page.keyboard.press("Escape");

  // The homepage Dive Shop: one card, picked in the window.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const panel = page.locator("#dive-shop .shop-service-panel");
  const item = panel.locator(".shop-item", { hasText: "Masker Line Merah" });
  assert.equal(
    await panel
      .locator(".shop-item h4")
      .filter({ hasText: /Masker Line/ })
      .count(),
    1,
  );
  assert.equal(
    await item.locator(".shop-variant-count").textContent(),
    "3 pilihan warna",
  );
  assert.equal(
    await panel.locator(".shop-finder-status p").textContent(),
    "7 alat",
  );
  await item.getByRole("button", { name: "Pilih varian" }).click();
  const homeDetail = page.locator("dialog.shop-detail");
  await homeDetail
    .locator(".shop-variants")
    .getByText("Putih", { exact: true })
    .click();
  await homeDetail.locator("h2", { hasText: "Masker Line Putih" }).waitFor();
  await homeDetail
    .getByRole("button", { name: "Masukkan ke keranjang" })
    .click();
  await item
    .locator(".shop-item-in-cart", { hasText: "1 di keranjang" })
    .waitFor();
  shots &&
    (await item.screenshot({ path: `${shots}/varian-kartu-beranda.png` }));

  // On a phone the variants wrap inside the window.
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
    .locator(".shop-product-card", { hasText: "Masker Line Merah" })
    .getByRole("button", { name: /Pilih varian/ })
    .click();
  const phoneDetail = p.locator("dialog.shop-detail");
  await phoneDetail.locator(".shop-variants").scrollIntoViewIfNeeded();
  const box = await phoneDetail.locator(".shop-variants").boundingBox();
  const frame = await phoneDetail.boundingBox();
  assert.ok(box.x + box.width <= frame.x + frame.width + 1);
  await noSideScroll(p);
  shots && (await p.screenshot({ path: `${shots}/varian-jendela-ponsel.png` }));
  await phone.close();

  // The admin lists the variants under their lead and edits the family.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  const listed = a.locator(".admin-shop-list .admin-shop-item");
  const names = await listed.locator("strong").allTextContents();
  const leadAt = names.indexOf("Masker Line Merah");
  assert.deepEqual(names.slice(leadAt, leadAt + 3), [
    "Masker Line Merah",
    "Masker Line Hitam",
    "Masker Line Putih",
  ]);
  assert.equal(await a.locator(".admin-shop-item.is-variant").count(), 2);
  await listed.filter({ hasText: "Masker Line Merah" }).click();
  const section = a.locator(".admin-shop-variants");
  assert.equal(await section.locator("h3").textContent(), "Varian (3)");
  assert.equal(await section.getByLabel("Jenis pilihan").inputValue(), "Warna");
  assert.equal(
    await section.getByLabel("Nama varian produk ini").inputValue(),
    "Merah",
  );
  shots &&
    (await section.screenshot({ path: `${shots}/varian-admin-bagian.png` }));
  // A new variant copies the product as a draft, without photos.
  const saved0 = (await state()).content.shop.products.length;
  await section.getByRole("button", { name: "+ Tambah varian" }).click();
  await a
    .locator(".admin-shop-item.selected", {
      hasText: "Masker Line Merah (varian baru)",
    })
    .waitFor();
  assert.equal(
    await a.locator(".admin-shop-variants h3").textContent(),
    "Varian (4)",
  );
  // The form asks for the new variant's name before it saves.
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  assert.equal(
    await a
      .getByLabel("Nama varian produk ini")
      .evaluate((input) => input.validity.valueMissing),
    true,
  );
  assert.equal((await state()).content.shop.products.length, saved0);
  await a.getByLabel("Nama produk").fill("Masker Line Biru");
  await a.getByLabel("Nama varian produk ini").fill("Biru");
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  let saved = (await state()).content.shop.products;
  const blue = saved.find((p) => p.name === "Masker Line Biru");
  assert.equal(blue.variantOf, "demo-mask");
  assert.equal(blue.variant, "Biru");
  assert.equal(blue.enabled, false);
  assert.deepEqual(blue.images, []);
  assert.equal(blue.salePrice, 650000);
  // Right after the family in the catalog.
  assert.equal(
    saved.findIndex((p) => p.id === blue.id),
    saved.findIndex((p) => p.id === "demo-mask-putih") + 1,
  );
  // The lead leaving hands the family to its first variant.
  await listed.filter({ hasText: "Masker Line Merah" }).click();
  await a.getByRole("button", { name: "Lepas produk ini dari varian" }).click();
  assert.equal(
    await a.locator(".admin-shop-variants h3").textContent(),
    "Varian",
  );
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  saved = (await state()).content.shop.products;
  const byId = (id) => saved.find((p) => p.id === id);
  assert.equal(byId("demo-mask").variantOf, undefined);
  assert.equal(byId("demo-mask").variantLabel, undefined);
  assert.equal(byId("demo-mask-hitam").variantOf, undefined);
  assert.equal(byId("demo-mask-hitam").variantLabel, "Warna");
  assert.equal(byId("demo-mask-putih").variantOf, "demo-mask-hitam");
  assert.equal(byId(blue.id).variantOf, "demo-mask-hitam");
  // A product alone joins a family from the list of other products.
  await listed.filter({ hasText: "Masker Line Merah" }).click();
  await a
    .getByLabel("Jadikan varian dari produk lain")
    .selectOption({ label: "Masker Line Hitam" });
  assert.equal(
    await a.locator(".admin-shop-variants h3").textContent(),
    "Varian (4)",
  );
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  assert.equal(
    (await state()).content.shop.products.find((p) => p.id === "demo-mask")
      .variantOf,
    "demo-mask-hitam",
  );
  await noSideScroll(a);
  assert.deepEqual(errors, []);
  console.log("Variants verified.");
} finally {
  await browser.close();
}
