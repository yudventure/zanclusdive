import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Run against a local demo server: CMS_MODE=demo npm start
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const tiles = page.locator(".dive-gallery-grid li");
// The last photo reaches the right edge: the gallery ends without a gap.
const flush = () =>
  page.locator(".dive-gallery-grid").evaluate((grid) => {
    const shown = [...grid.children].filter(
      (li) => li.getBoundingClientRect().height > 0,
    );
    const last = shown.at(-1).getBoundingClientRect();
    return Math.abs(grid.getBoundingClientRect().right - last.right) < 2;
  });
const columns = () =>
  page
    .locator(".dive-gallery-grid")
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
const visible = () =>
  tiles.evaluateAll(
    (items) =>
      items.filter((li) => li.getBoundingClientRect().height > 0).length,
  );
try {
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('#navigation a[href="#ocean"]').textContent(),
    "Gallery",
  );
  // Laptops: the gallery is open, every photo shows, no button.
  await page.locator(".dive-gallery-grid").scrollIntoViewIfNeeded();
  assert.equal(await tiles.count(), 10);
  assert.equal(await visible(), 10);
  assert.equal(
    await page.getByRole("button", { name: "Open the gallery" }).count(),
    0,
  );
  assert.equal(await page.locator(".dive-gallery-more").isVisible(), false);
  // Four to a row on 12 columns; the ten photos after no whole round of
  // 12 share their rows, the last two half each.
  assert.equal(await columns(), 12);
  assert.ok(await flush(), "no gap at the end on laptops");
  // Lightbox with caption, arrows and Escape.
  await page
    .getByRole("button", { name: "View photo A manta in open water" })
    .click();
  const lightbox = page.locator(".dive-lightbox");
  await lightbox.waitFor({ state: "visible" });
  assert.match(await lightbox.textContent(), /A manta in open water\s*3 of 10/);
  await page.keyboard.press("ArrowRight");
  assert.match(await lightbox.locator("figcaption").textContent(), /4 of 10/);
  await page.keyboard.press("Escape");
  await lightbox.waitFor({ state: "hidden" });
  // Tablets: open too, three to a row.
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".dive-gallery-grid").scrollIntoViewIfNeeded();
  assert.equal(await visible(), 10);
  assert.equal(await page.locator(".dive-gallery-more").isVisible(), false);
  assert.equal(await columns(), 6);
  assert.ok(await flush(), "no gap at the end on tablets");
  // Phones: six small tiles, more with a button, a tap opens the photo.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const more = page.getByRole("button", { name: "Lihat lebih banyak" });
  await more.scrollIntoViewIfNeeded();
  assert.equal(await visible(), 6);
  assert.match(
    await page.locator(".dive-gallery-more small").textContent(),
    /^6 dari 10 foto$/,
  );
  const small = await tiles.nth(1).boundingBox();
  assert.ok(small.width < 130 && small.height < 130, "small tiles");
  if (process.env.SHOT_DIR)
    await page
      .locator(".dive-gallery")
      .screenshot({ path: process.env.SHOT_DIR + "/gallery-390.png" });
  await more.click();
  assert.equal(await visible(), 10);
  assert.equal(await more.count(), 0, "the button goes once all show");
  assert.ok(await flush(), "no gap at the end on phones");
  await tiles.nth(8).locator("button").click();
  await lightbox.waitFor({ state: "visible" });
  assert.match(await lightbox.locator("figcaption").textContent(), /9 dari 10/);
  await page.keyboard.press("Escape");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 1440, height: 950 });
  // The gallery is edited in the admin and shown in both languages.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Galeri penyelaman" }).waitFor();
  await page
    .getByLabel("Keterangan (Indonesia)")
    .first()
    .fill("Tim Zanclus di Cape Kri");
  await page
    .getByLabel("Caption (English)")
    .first()
    .fill("The Zanclus team at Cape Kri");
  await page.getByRole("button", { name: "Simpan galeri" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  for (const [path, label] of [
    ["/", "View photo The Zanclus team at Cape Kri"],
    ["/id", "Lihat foto Tim Zanclus di Cape Kri"],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(
      await page
        .locator(`.dive-gallery-grid button[aria-label="${label}"]`)
        .count(),
      1,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS gallery: nav label, open with every photo on laptops (4 to a row) and tablets (3 to a row) without a button, phones with six small tiles and See more until all show, lightbox with arrows and Escape on both, admin caption edit in both languages, 390px without horizontal scroll.",
  );
} finally {
  await browser.close();
}
