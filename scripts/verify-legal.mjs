import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// The policy pages: terms, privacy, and reschedule and refund, in both
// languages, with the fares on the refund page, the footer links on every
// page, the sitemap, and the admin editor under Situs web.
// Run against a local test server with CMS_DEMO_LOGIN=true.
const base = process.env.BASE_URL || "http://127.0.0.1:3124";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const shots = process.env.SHOT_DIR;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/weather", (r) =>
  r.fulfill({ json: { locations: [] } }),
);
const hrefs = (selector) =>
  page
    .locator(selector)
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));

try {
  // Terms in Indonesian: title, date, contents, sections and lists.
  await page.goto(base + "/id/terms", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "id");
  assert.equal(await page.locator("h1").textContent(), "Syarat dan ketentuan");
  assert.equal(
    await page.locator(".legal-updated").textContent(),
    "Terakhir diperbarui 26 Oktober 2026",
  );
  assert.match(await page.title(), /^Syarat dan ketentuan \| Zanclus/);
  const sections = await page.locator(".legal-article .legal-section").count();
  assert.ok(sections >= 6);
  assert.equal(await page.locator(".legal-aside li").count(), sections);
  assert.ok((await page.locator(".legal-section ul li").count()) >= 4);
  assert.deepEqual(await hrefs(".legal-others a"), [
    "/id/privacy",
    "/id/refund",
  ]);
  assert.match(
    await page.locator(".legal-ask-chat").getAttribute("href"),
    /^https:\/\/wa\.me\/\d+\?text=.*syarat%20dan%20ketentuan/,
  );
  // The contents jump to a section, clear of the sticky header.
  await page.locator(".legal-aside a").nth(3).click();
  await page.waitForTimeout(900);
  const top = await page
    .locator("#bagian-4 h2")
    .evaluate((h) => h.getBoundingClientRect().top);
  const header = await page
    .locator(".site-header, header")
    .first()
    .evaluate((h) => h.getBoundingClientRect().bottom);
  assert.ok(top >= header - 1 && top < 400, `section top ${top}`);
  if (shots) await page.screenshot({ path: `${shots}/legal-terms-id.png` });

  // Footer links on every page, in the page's language.
  assert.deepEqual(await hrefs(".site-footer-legal a"), [
    "/id/terms",
    "/id/privacy",
    "/id/refund",
  ]);
  await page.goto(base + "/", { waitUntil: "networkidle" });
  assert.deepEqual(await hrefs(".site-footer-legal a"), [
    "/terms",
    "/privacy",
    "/refund",
  ]);
  assert.deepEqual(
    await page.locator(".site-footer-legal a").allTextContents(),
    ["Terms and conditions", "Privacy policy", "Reschedule & refund policy"],
  );
  for (const path of ["/id/diving", "/dive-shop", "/id/about"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".site-footer-legal a").count(), 3, path);
  }

  // English pages at the root.
  await page.goto(base + "/terms", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator("h1").textContent(), "Terms and conditions");
  assert.equal(
    await page.locator(".legal-updated").textContent(),
    "Last updated 26 October 2026",
  );
  await page.goto(base + "/privacy", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "Privacy policy");
  assert.match(
    await page.locator(".activity-hero-summary").textContent(),
    /Personal Data Protection/,
  );

  // Refund: the fares as set in the price list, then the policy.
  await page.goto(base + "/id/refund", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Kebijakan reschedule & refund",
  );
  assert.equal(
    await page.locator(".legal-aside li").first().textContent(),
    "Tarif dan aturannya",
  );
  assert.deepEqual(
    await page.locator(".legal-fare-list strong").allTextContents(),
    ["Standard", "Comfort+10%", "Flexi+20%"],
  );
  assert.match(
    await page.locator(".legal-fare-list li").last().textContent(),
    /paling lambat 7 hari sebelumnya/,
  );
  assert.match(
    await page.locator(".legal-article").textContent(),
    /Kelola pesanan/,
  );
  if (shots) await page.screenshot({ path: `${shots}/legal-refund-id.png` });
  await page.goto(base + "/refund", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".legal-fare-list li").count(),
    3,
    "English refund fares",
  );

  // Search engines find all six addresses.
  const sitemap = await (
    await context.request.get(base + "/sitemap.xml")
  ).text();
  for (const path of ["/terms", "/id/terms", "/privacy", "/id/privacy"])
    assert.ok(sitemap.includes(`${base}${path}<`) || sitemap.includes(path));
  assert.ok(sitemap.includes("/id/refund"));

  // Admin: edit the privacy page and see it on the site.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/legal", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Judul dan pengantar" }).waitFor();
  assert.ok(
    await page
      .locator(".admin-sidebar, nav")
      .getByRole("link", { name: "Halaman kebijakan" })
      .first()
      .isVisible(),
  );
  await page.getByRole("button", { name: "Kebijakan privasi" }).click();
  await page
    .getByRole("heading", { name: "Bagian Kebijakan privasi" })
    .waitFor();
  await page.getByLabel("Judul (Indonesia)").fill("Kebijakan privasi Zanclus");
  await page.getByLabel("Terakhir diperbarui").fill("2026-11-01");
  const before = await page.locator(".admin-legal fieldset").count();
  await page.getByRole("button", { name: "+ Tambah bagian" }).click();
  await page.getByLabel("Judul bagian (Indonesia)").last().fill("Cookie");
  await page
    .getByLabel("Isi (Indonesia)")
    .last()
    .fill("Kami memakai cookie seperlunya.\n\n- Bahasa pilihanmu\n- Keranjang");
  // Move it one place up.
  await page
    .getByRole("button", { name: `Naikkan bagian ${before + 1}` })
    .click();
  if (shots) await page.screenshot({ path: `${shots}/legal-admin.png` });
  await page.getByRole("button", { name: "Simpan halaman kebijakan" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await page.goto(base + "/id/privacy", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Kebijakan privasi Zanclus",
  );
  assert.equal(
    await page.locator(".legal-updated").textContent(),
    "Terakhir diperbarui 1 November 2026",
  );
  const cookie = page.locator(".legal-article .legal-section").nth(before - 1);
  assert.equal(await cookie.locator("h2").textContent(), "Cookie");
  assert.deepEqual(await cookie.locator("li").allTextContents(), [
    "Bahasa pilihanmu",
    "Keranjang",
  ]);
  // The date is shared by the three pages, the English title falls back
  // to its own text.
  await page.goto(base + "/terms", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".legal-updated").textContent(),
    "Last updated 1 November 2026",
  );

  // Phones: no sideways scroll, the contents above the text.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/id/terms", "/privacy", "/id/refund", "/refund"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no sideways scroll on " + path,
    );
  }
  if (shots) {
    await page.goto(base + "/id/refund", { waitUntil: "networkidle" });
    await page.locator("#tarif").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/legal-refund-390.png` });
    await page.locator(".site-footer-legal").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/legal-footer-390.png` });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS legal: terms, privacy and refund pages in Indonesian and English with title, date, contents that jump clear of the header, sections with lists, WhatsApp question and links to the other policies; refund page fares from the price list; footer links in the page's language on every page; sitemap; admin edit of title, date and a new moved section shown on the site; 390px without sideways scroll.",
  );
} finally {
  await browser.close();
}
