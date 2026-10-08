import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import {
  defaultSiteImages,
  activityPhotos,
  siteImageFields,
} from "../src/photography.js";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3196";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Use an isolated local demo server for CMS checks.",
);
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
const headers = { Origin: new URL(base).origin };
let original;
async function state() {
  return (await context.request.get(base + "/api/admin/state")).json();
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
}
async function sweep() {
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  for (let top = 0; top < height; top += 650) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), top);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".page-shell").classList.contains("motion-active"),
  );
  assert.equal(
    await page.locator(".activity-discovery").count(),
    0,
    "No extra homepage section",
  );
  const selectors = ".hero-photo, .course-photo, .fan-photo img, .ocean-photo";
  const urls = await page
    .locator(selectors)
    .evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  assert.equal(urls.length, 11);
  assert.equal(
    new Set(urls).size,
    11,
    "All homepage photographic placements are different",
  );
  for (const [key, photo] of Object.entries(activityPhotos))
    assert.equal(
      await page.locator(`[data-activity="${key}"] img`).getAttribute("src"),
      photo.cardImage,
      "Existing CMS defaults have migrated",
    );
  assert.equal(
    await page.locator(".open-card img").getAttribute("src"),
    defaultSiteImages.ocean,
  );
  assert.equal(
    await page
      .locator(".open-card")
      .evaluate((el) => getComputedStyle(el).opacity),
    "0",
  );
  await page.evaluate(() => scrollTo({ top: 260, behavior: "instant" }));
  await page.waitForFunction(
    () =>
      parseFloat(
        document.querySelector(".hero").style.getPropertyValue("--hero-drift"),
      ) > 0,
  );
  assert.equal(
    await page
      .locator(".site-header")
      .evaluate((el) => el.classList.contains("is-scrolled")),
    true,
  );
  await page
    .locator(".open-card")
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  await page.waitForFunction(() => {
    const element = document.querySelector(".open-card");
    const opacity = +getComputedStyle(element).opacity;
    return (
      element.classList.contains("is-revealed") && opacity > 0 && opacity < 0.99
    );
  });
  await page.waitForFunction(
    () =>
      +getComputedStyle(document.querySelector(".open-card")).opacity > 0.99,
  );
  await sweep();
  assert.equal(
    await page
      .locator(selectors)
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    true,
  );
  assert.equal(
    await page
      .locator(".scroll-progress")
      .evaluate((el) => getComputedStyle(el).transform),
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await noOverflow();
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "artifacts/photography-home-desktop.png",
    fullPage: true,
  });
  await page
    .locator("#experiences")
    .screenshot({ path: "artifacts/photography-experiences-desktop.png" });
  await page.locator(".hero [data-book]").click();
  assert.equal(
    await page.locator("#booking-dialog").evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press("Escape");

  // Switching preference while the page is open immediately restores all content.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => !document.querySelector(".motion-active"));
  assert.equal(await page.locator(".reveal-pending").count(), 0);
  assert.equal(
    await page
      .locator(".hero-photo")
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  assert.equal(await page.locator(".scroll-progress").isVisible(), false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [1000, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: "networkidle" });
    await sweep();
    await noOverflow();
    if (width === 390) {
      assert.equal(
        await page
          .locator(".hero-photo")
          .evaluate((el) => getComputedStyle(el).transform),
        "none",
      );
      assert.ok(
        (
          await page
            .locator('[data-activity="snorkeling"] img')
            .evaluate((el) => el.currentSrc)
        ).endsWith("-small.webp"),
      );
      await page.screenshot({
        path: "artifacts/photography-home-mobile.png",
        fullPage: true,
      });
      await page
        .locator("#experiences")
        .screenshot({ path: "artifacts/photography-experiences-mobile.png" });
    }
  }
  for (const key of Object.keys(activityPhotos)) {
    await page.goto(`${base}/${key}`, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator(".activity-hero-photo").getAttribute("src"),
      activityPhotos[key].image,
    );
    assert.ok(
      (
        await page
          .locator(".activity-hero-photo")
          .evaluate((el) => el.currentSrc)
      ).endsWith("-small.webp"),
    );
    await sweep();
    await noOverflow();
    assert.equal(await page.locator(".reveal-pending").count(), 0);
  }
  await page.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".shop-hero-art img").getAttribute("src"),
    defaultSiteImages.shop,
  );
  await page.getByLabel("Cari perlengkapan").fill("mask");
  assert.equal(await page.locator(".shop-product-card").count(), 1);
  await page.getByLabel("Cari perlengkapan").fill("");
  await sweep();
  assert.equal(
    await page.locator(".shop-product-card.reveal-pending").count(),
    0,
    "Filtered/reinserted products become visible",
  );
  await noOverflow();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload({ waitUntil: "networkidle" });
  await sweep();
  await page.evaluate(() => {
    document.activeElement?.blur();
    scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: "artifacts/photography-shop-desktop.png",
    fullPage: true,
  });

  // Progressive enhancement: no-JS and no-IntersectionObserver both retain visible content.
  for (const js of [false, true]) {
    const fallback = await browser.newContext({
      javaScriptEnabled: js,
      viewport: { width: 390, height: 900 },
    });
    if (js)
      await fallback.addInitScript(() => {
        window.IntersectionObserver = undefined;
      });
    const fallbackPage = await fallback.newPage();
    await fallbackPage.goto(base, { waitUntil: "networkidle" });
    assert.equal(await fallbackPage.locator(".reveal-pending").count(), 0);
    assert.equal(
      await fallbackPage
        .locator(".contact-panel")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    assert.equal(
      await fallbackPage.locator(".scroll-progress").isVisible(),
      false,
    );
    await fallback.close();
  }

  const login = await context.request.post(base + "/api/admin/login", {
    headers,
    data: demoAccount,
  });
  assert.equal(login.status(), 200);
  original = await state();
  assert.equal(original.content.photographyVersion, 1);
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".scroll-progress").count(),
    0,
    "CMS is excluded from public scroll effects",
  );
  for (const [key, label] of siteImageFields)
    assert.equal(
      await page.getByLabel(label, { exact: true }).inputValue(),
      original.content.images[key],
    );
  await page
    .getByLabel("Galeri — penyu", { exact: true })
    .fill("/assets/photos/fan-coral.webp");
  await page
    .getByRole("button", { name: "Simpan gambar website", exact: true })
    .click();
  await page
    .getByText("Perubahan sudah tersimpan dan tampil di website.", {
      exact: true,
    })
    .waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.getByLabel("Galeri — penyu", { exact: true }).inputValue(),
    "/assets/photos/fan-coral.webp",
  );
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".photo-four img").getAttribute("src"),
    "/assets/photos/fan-coral.webp",
  );
  const saved = await state();
  assert.deepEqual(saved.bookings, original.bookings);
  assert.deepEqual(saved.content.activities, original.content.activities);
  assert.deepEqual(saved.content.shop, original.content.shop);
  assert.deepEqual(saved.content.contact, original.content.contact);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: distinct category photos, legacy demo migration, image loading/responsive variants, reveal transitions, desktop parallax, mobile/reduced motion, no-JS fallback, dynamic shop filters, CMS gallery persistence and preserved owner data.",
  );
} finally {
  if (original) {
    const current = await state();
    const restored = await context.request.put(base + "/api/admin/settings", {
      headers,
      data: { content: original.content, version: current.version },
    });
    assert.equal(restored.status(), 200, "Restore test CMS content");
  }
  await browser.close();
}
