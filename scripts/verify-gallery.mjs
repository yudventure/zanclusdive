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
const roll = () =>
  page.locator(".dive-gallery-roll").evaluate((el) => el.offsetHeight);
try {
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('#navigation a[href="#ocean"]').textContent(),
    "Gallery",
  );
  const toggle = page.getByRole("button", { name: "Open the gallery" });
  await toggle.scrollIntoViewIfNeeded();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.ok((await roll()) < 2, "gallery starts rolled up");
  assert.equal(
    await page.locator(".dive-gallery-roll").getAttribute("inert"),
    "",
  );
  await toggle.click();
  await page.waitForTimeout(1300);
  assert.ok((await roll()) > 400, "gallery rolls open");
  const close = page.getByRole("button", { name: "Close the gallery" });
  assert.equal(await close.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator(".dive-gallery-grid li").count(), 10);
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
  await close.click();
  await page.waitForTimeout(1300);
  assert.ok((await roll()) < 2, "gallery rolls back up");
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
    // Closed, the gallery is inert, so look the photo up by its label.
    assert.equal(
      await page
        .locator(`.dive-gallery-grid button[aria-label="${label}"]`)
        .count(),
      1,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Buka galeri" }).click();
  await page.waitForTimeout(1300);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS gallery: nav label, rolled up by default, rolls open and closed, lightbox with arrows and Escape, admin caption edit in both languages, 390px without horizontal scroll.",
  );
} finally {
  await browser.close();
}
