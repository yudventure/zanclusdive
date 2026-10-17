import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// One-tap uploads: a large phone photo is shrunk in the browser, uploaded,
// placed and saved without a separate save step, and stored as a file.
// Run against a local test server with CMS_DEMO_LOGIN=true and
// CMS_DEMO_DATA_DIR set.
const base = process.env.BASE_URL || "http://127.0.0.1:3124";
const dataDir = process.env.CMS_DEMO_DATA_DIR;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const state = async () =>
  (await context.request.get(base + "/api/admin/state")).json();

// A noisy 4000×3000 JPEG, larger than the 4 MB upload limit.
async function cameraPhoto() {
  const data = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4000;
    canvas.height = 3000;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(4000, 3000);
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = ((i * 7) % 255) ^ (Math.random() * 255);
      image.data[i + 1] = Math.random() * 255;
      image.data[i + 2] = 120 + Math.random() * 120;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.98));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768)
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  });
  return Buffer.from(data, "base64");
}

try {
  await page.goto(base + "/admin", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await page.getByRole("link", { name: "Ringkasan cepat" }).waitFor();
  const photo = await cameraPhoto();
  assert.ok(photo.length > 4 * 1024 * 1024, "test photo is over the limit");
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  const before = await state();

  // Website image: pick a photo and it is live straight away.
  const slot = page.locator(".admin-image-slot").filter({
    has: page.locator(":scope > strong", { hasText: /^Sampul beranda$/ }),
  });
  await slot.locator('input[type="file"]').setInputFiles({
    name: "IMG_2041.JPG",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
  const after = await state();
  assert.equal(after.version, before.version + 1, "saved without a Save click");
  const hero = after.content.images.hero;
  assert.match(hero, /^\/api\/media\/[0-9a-f-]{36}$/);
  const uploaded = after.media.find((m) => m.url === hero);
  assert.ok(uploaded.bytes < 4 * 1024 * 1024, "shrunk below the limit");
  assert.ok(["image/webp", "image/jpeg"].includes(uploaded.mime));
  assert.equal(
    uploaded.name,
    "IMG_2041." + (uploaded.mime === "image/webp" ? "webp" : "jpg"),
  );
  const visitor = await context.newPage();
  await visitor.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(await visitor.locator(".hero-photo").getAttribute("src"), hero);
  const served = await context.request.get(base + hero);
  assert.equal(served.status(), 200);
  assert.equal(served.headers()["content-type"], uploaded.mime);
  // Stored as its own file, not inside state.json.
  if (dataDir) {
    assert.ok((await readdir(join(dataDir, "media"))).includes(uploaded.id));
  }

  // Gallery: several photos at once become new gallery items.
  const galleryCount = after.content.gallery.items.length;
  const small = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1b6f8a";
    ctx.fillRect(0, 0, 900, 600);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page
    .locator(".admin-upload-drop")
    .filter({ hasText: "Tambah foto ke galeri" })
    .locator('input[type="file"]')
    .setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: Buffer.from(small) },
      { name: "b.png", mimeType: "image/png", buffer: Buffer.from(small) },
    ]);
  // Both photos are appended and saved without a Save click.
  for (let tries = 0; ; tries++) {
    if ((await state()).content.gallery.items.length === galleryCount + 2)
      break;
    assert.ok(tries < 120, "gallery photos were not saved");
    await page.waitForTimeout(500);
  }
  const gallery = (await state()).content.gallery.items;
  assert.match(gallery.at(-1).src, /^\/api\/media\//);
  assert.notEqual(gallery.at(-1).src, gallery.at(-2).src);

  // Shop product photo and activity cover use the same one-tap upload.
  await page.goto(base + "/admin/shop", { waitUntil: "networkidle" });
  await page
    .locator(".admin-upload-drop")
    .filter({ hasText: /foto barang jual/ })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "mask.png",
      mimeType: "image/png",
      buffer: Buffer.from(small),
    });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
  assert.ok(
    (await state()).content.shop.products.some((p) =>
      p.image.startsWith("/api/media/"),
    ),
  );
  await page.goto(base + "/admin/activities", { waitUntil: "networkidle" });
  await page
    .locator(".admin-upload-drop")
    .filter({ hasText: "Ganti foto sampul" })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from(small),
    });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
  assert.match(
    (await state()).content.activities.diving.image,
    /^\/api\/media\//,
  );

  // Mobile: the upload control is a large tap target.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  const box = await page.locator(".admin-upload-drop").first().boundingBox();
  assert.ok(box.height >= 44 && box.width > 300);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "artifacts/upload-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS upload: camera photo shrunk below 4 MB, placed and saved in one step, live on the homepage, stored as a file; multi-photo gallery upload; shop and activity photos; mobile tap target.",
  );
} finally {
  await browser.close();
}
