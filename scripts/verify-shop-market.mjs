// The Dive Shop like a marketplace: several photos, a video, a full
// description and a spec table per product, the best photo size beside
// every upload, a larger product window, and pick-up or delivery with
// zone fees at checkout. Run against a demo server started with
// CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
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
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
// No outside players or weather in the test.
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
const mask = async () =>
  (await state()).content.shop.products.find((p) => p.id === "demo-mask");
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

  // Every photo slot says its best size.
  await a.goto(base + "/admin/media", { waitUntil: "networkidle" });
  const guides = await a.locator(".admin-photo-guide").allTextContents();
  assert.ok(
    guides.includes(
      "Terbaik 1920 × 1080 px, rasio 16:9, objek utama di tengah",
    ),
  );
  assert.ok(guides.includes("Sisi panjang 1600–2400 px"));
  // Slot names without long dashes.
  const slots = await a.locator(".admin-image-slot > strong").allTextContents();
  assert.ok(slots.includes("Jelajahi laut, kehidupan terumbu"));
  assert.ok(slots.every((name) => !name.includes("—")));
  shots &&
    (await a
      .locator(".admin-image-grid")
      .screenshot({ path: `${shots}/82-ukuran-foto.png` }));
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await a.goto(base + "/admin/activities", { waitUntil: "networkidle" });
  assert.ok(
    (await a.locator(".admin-photo-guide").allTextContents()).includes(
      "Terbaik 1200 × 800 px, rasio 3:2",
    ),
  );

  // Several photos at once for one product, saved straight away.
  await a.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  const photos = a.locator(".admin-shop-photos");
  assert.equal(
    await photos.locator(".admin-photo-guide").textContent(),
    "Terbaik 1200 × 1200 px, rasio 1:1, latar polos, alat terlihat utuh",
  );
  const pngs = await a.evaluate(async () => {
    const out = [];
    for (const color of ["#1b6f8a", "#e07a2f", "#3c9d5d"]) {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1200, 1200);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      out.push([...new Uint8Array(await blob.arrayBuffer())]);
    }
    return out;
  });
  await photos.locator('input[type="file"]').setInputFiles(
    pngs.map((bytes, i) => ({
      name: `mask-${i + 1}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(bytes),
    })),
  );
  let saved;
  for (let tries = 0; tries < 120; tries++) {
    saved = await mask();
    if (saved.images.length === 3) break;
    await a.waitForTimeout(500);
  }
  assert.equal(saved.images.length, 3, "all three photos were saved");
  assert.equal(saved.image, saved.images[0]);
  assert.equal(await photos.locator("li").count(), 3);
  // The third photo becomes the cover.
  await photos
    .getByRole("button", { name: "Jadikan foto 3 foto utama" })
    .click();
  // A video, the full description and two spec rows.
  await a.getByLabel("Link video").fill("https://youtu.be/dQw4w9WgXcQ");
  await a.getByRole("button", { name: "Tambah video" }).click();
  assert.match(
    await a.locator(".admin-shop-videos li").textContent(),
    /YouTube[\s\S]*youtu\.be\/dQw4w9WgXcQ/,
  );
  await a
    .getByLabel("Deskripsi lengkap")
    .fill(
      "Mask premium untuk penyelam dan snorkeler.\nNyaman dipakai lama.\n\nKelebihan\n- Lensa tempered jernih\n- Skirt silikon lembut",
    );
  const addRow = a.getByRole("button", { name: "+ Tambah baris spesifikasi" });
  await addRow.click();
  await addRow.click();
  await a.getByLabel("Nama 1", { exact: true }).fill("Merek");
  await a.getByLabel("Isi 1", { exact: true }).fill("Scubapro Crystalvu");
  await a.getByLabel("Nama 2", { exact: true }).fill("Bahan");
  await a.getByLabel("Isi 2", { exact: true }).fill("Silikon, tempered glass");
  shots && (await photos.screenshot({ path: `${shots}/77-foto-produk.png` }));
  // Delivery to two zones, besides pick-up.
  await a.getByLabel("Bisa diantar sampai rumah atau penginapan").check();
  assert.equal(
    await a.getByLabel("Wilayah 1", { exact: true }).inputValue(),
    "Waisai kota",
  );
  assert.equal(await a.getByLabel("Ongkos antar 1 (Rp)").inputValue(), "25000");
  await a.getByRole("button", { name: "+ Tambah wilayah antar" }).click();
  await a.getByLabel("Wilayah 2", { exact: true }).fill("Saonek");
  await a.getByLabel("Ongkos antar 2 (Rp)").fill("150000");
  shots &&
    (await a
      .locator(".admin-shop-delivery")
      .screenshot({ path: `${shots}/78-pengantaran.png` }));
  await a.getByRole("button", { name: "Simpan katalog Dive Shop" }).click();
  await a
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  saved = await mask();
  assert.equal(saved.image, saved.images[0]);
  assert.equal(saved.images.length, 3);
  assert.deepEqual(saved.videos, ["https://youtu.be/dQw4w9WgXcQ"]);
  assert.deepEqual(saved.specs, [
    { label: "Merek", value: "Scubapro Crystalvu" },
    { label: "Bahan", value: "Silikon, tempered glass" },
  ]);
  const delivery = (await state()).content.shop.delivery;
  assert.equal(delivery.enabled, true);
  assert.deepEqual(
    delivery.zones.map((z) => [z.name, z.fee]),
    [
      ["Waisai kota", 25000],
      ["Saonek", 150000],
    ],
  );

  // The larger product window, like a marketplace listing.
  await page.goto(base + "/id/dive-shop", { waitUntil: "networkidle" });
  assert.equal(
    await page
      .locator('[data-product="demo-mask"] .shop-product-photo')
      .getAttribute("src"),
    saved.images[0],
  );
  await page
    .getByRole("button", { name: "Lihat detail Mask & snorkel set" })
    .first()
    .click();
  const detail = page.locator("dialog.shop-detail");
  await detail.waitFor();
  assert.ok((await detail.boundingBox()).width >= 1000);
  assert.equal(await detail.locator(".shop-detail-thumbs button").count(), 3);
  assert.equal(await detail.locator(".shop-detail-count").textContent(), "1/3");
  await detail.getByRole("button", { name: "Foto berikutnya" }).click();
  assert.equal(await detail.locator(".shop-detail-count").textContent(), "2/3");
  await detail.getByRole("button", { name: "Foto 3 dari 3" }).click();
  assert.equal(await detail.locator(".shop-detail-count").textContent(), "3/3");
  const more = detail.locator(".shop-detail-more");
  assert.match(
    await more.textContent(),
    /Deskripsi[\s\S]*Mask premium untuk penyelam dan snorkeler\.[\s\S]*Lensa tempered jernih[\s\S]*Spesifikasi[\s\S]*Ringkasan[\s\S]*Merek[\s\S]*Scubapro Crystalvu[\s\S]*Bahan[\s\S]*Video produk/,
  );
  assert.equal(
    await more.locator("li", { hasText: "Skirt silikon" }).count(),
    1,
  );
  assert.equal(await more.locator(".dive-video").count(), 1);
  assert.match(
    await detail.locator(".shop-detail-delivery").textContent(),
    /Ambil di dive center[\s\S]*Bisa diantar, mulai Rp\s25\.000[\s\S]*Saonek Rp\s150\.000/,
  );
  shots && (await page.screenshot({ path: `${shots}/79-detail-besar.png` }));
  await detail.getByRole("button", { name: "Tutup detail" }).click();

  // Delivery at checkout: the zone's fee joins the total and Midtrans.
  await page
    .getByRole("button", {
      name: "Tambahkan Mask & snorkel set untuk dibeli",
      exact: true,
    })
    .click();
  await page.getByLabel("Nama kamu").fill("Tamu Antar");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  const order = page.locator(".shop-order-form");
  await order
    .locator(".delivery-options label", { hasText: "Diantar ke alamat" })
    .click();
  const zone = page.getByLabel("Wilayah antar");
  const saonek = (await zone.locator("option").allTextContents()).find((o) =>
    o.startsWith("Saonek"),
  );
  await zone.selectOption({ label: saonek });
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  assert.equal(
    await page.locator(".shop-error").textContent(),
    "Isi alamat antar, 5–300 karakter.",
  );
  await page.getByLabel("Alamat lengkap").fill("Jl. Pantai 5, Saonek");
  assert.match(
    await page.locator(".shop-total").textContent(),
    /Ongkos antar Saonek Rp\s150\.000[\s\S]*Rp\s800\.000/,
  );
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await page.locator(".pay-panel .pay-submit").click();
  await page.waitForURL(new RegExp(`127.0.0.1:${port}/pay/`));
  const orderId = new URL(page.url()).pathname.split("/").pop();
  const paid = mock.orders.get(orderId);
  assert.deepEqual(
    paid.items.map((i) => [i.name, i.price, i.quantity]),
    [
      ["Beli Mask & snorkel set", 650000, 1],
      ["Ongkos antar Saonek", 150000, 1],
    ],
  );
  assert.equal(paid.amount, 800000);
  const booking = (await state()).bookings.find(
    (b) => b.payment?.orderId === orderId,
  );
  assert.match(
    booking.notes,
    /Diantar ke Saonek, alamat Jl\. Pantai 5, Saonek/,
  );

  // Homepage checkout: the same choice, picked up by default.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await page.locator("#dive-shop").scrollIntoViewIfNeeded();
  await page
    .locator(".shop-item", { hasText: "Mask & snorkel set" })
    .locator(".shop-item-add")
    .click();
  await page.locator(".shop-cart-bar .button").click();
  const checkout = page.locator(".shop-checkout");
  await checkout.waitFor({ state: "visible" });
  assert.equal(
    await checkout.locator(".delivery-options input:checked").inputValue(),
    "pickup",
  );
  await checkout
    .locator(".delivery-options label", { hasText: "Diantar ke alamat" })
    .click();
  const homeZone = checkout.getByLabel("Wilayah antar");
  const kota = (await homeZone.locator("option").allTextContents()).find((o) =>
    o.startsWith("Waisai kota"),
  );
  await homeZone.selectOption({ label: kota });
  assert.match(
    await checkout.locator(".shop-checkout-totals").textContent(),
    /Ongkos antar Waisai kotaRp\s25\.000[\s\S]*Rp\s675\.000/,
  );
  shots &&
    (await checkout.screenshot({ path: `${shots}/80-checkout-antar.png` }));

  // Phones: the window stacks and fits.
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
    .getByRole("button", { name: "Lihat detail Mask & snorkel set" })
    .first()
    .click();
  const small = p.locator("dialog.shop-detail");
  await small.waitFor();
  await noSideScroll(p);
  const box = await small.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390);
  shots && (await p.screenshot({ path: `${shots}/81-detail-hp.png` }));
  await phone.close();

  assert.deepEqual(errors, []);
  console.log("Dive Shop photos, video, details and delivery verified.");
} finally {
  await browser.close();
  mock.server.close();
}
