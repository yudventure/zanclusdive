import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Run against a local demo server: CMS_MODE=demo npm start
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } }),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
try {
  for (const [path, nav, card] of [
    ["/", "Dive sites", "Plan a dive"],
    ["/id", "Dive site", "Rencanakan diving"],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const links = await page.locator("#navigation a").allTextContents();
    assert.ok(links.includes(nav), path);
    assert.ok(!links.some((l) => /^(Harga|Prices)$/.test(l)), path);
    assert.equal(
      await page
        .locator("#navigation a", { hasText: nav })
        .getAttribute("href"),
      "#dive-sites",
    );
    const map = page.locator("#dive-sites [data-peta]");
    await map.scrollIntoViewIfNeeded();
    // Only dive sites are drawn.
    const kinds = await map
      .locator("[data-legenda-jenis]")
      .evaluateAll((els) => els.map((el) => el.dataset.legendaJenis));
    assert.deepEqual(kinds, ["selam"]);
    assert.ok(await map.locator("[data-atribusi-osm]").isVisible());
    await map.locator('[data-label-wilayah="kri"]').click();
    await page.waitForTimeout(1100);
    const tanda = await map
      .locator("[data-tanda]")
      .evaluateAll((els) => els.map((el) => el.dataset.jenis));
    assert.ok(tanda.length > 0 && tanda.every((j) => j === "selam"));
    const box = await map.locator("[data-peta-wadah]").boundingBox();
    const info = await map.locator("[data-info-wilayah]").boundingBox();
    assert.ok(info.height <= box.height + 1, "card taller than map");
    // The island card offers a way back to the full map.
    await map.locator("[data-kembali-peta-penuh]").click();
    await page.waitForTimeout(900);
    assert.equal(await map.getAttribute("data-peta-wilayah"), "");
    await map.locator('[data-label-wilayah="kri"]').click();
    await page.waitForTimeout(1100);
    await map.locator('[data-tanda="cape-kri"]').click();
    await map.locator("[data-kartu-tanda]").waitFor();
    const link = map.locator("[data-kartu-tanda] a", { hasText: card });
    assert.match(await link.getAttribute("href"), /\/diving#inquiry$/);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    assert.equal(await map.getAttribute("data-peta-wilayah"), "");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/id"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.locator("#dive-sites").scrollIntoViewIfNeeded();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at 390 on ${path}`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS dive sites: nav link replaces prices, only dive site markers, attribution, zoom to Kri, marker card links to diving inquiry, Escape, both languages, 390px without horizontal scroll.",
  );
} finally {
  await browser.close();
}
