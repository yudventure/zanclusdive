import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { socialPlatforms } from "../src/contact-model.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3186";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage(),
  api = context.request,
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
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
async function assertFooter(whatsapp, email, socials) {
  const footer = page.getByRole("contentinfo");
  assert.equal(await footer.count(), 1);
  assert.ok(
    (
      await footer
        .locator('a[href^="https://wa.me/"]')
        .first()
        .getAttribute("href")
    ).includes(whatsapp),
  );
  if (email)
    assert.equal(
      await footer.locator('a[href^="mailto:"]').getAttribute("href"),
      "mailto:" + email,
    );
  else assert.equal(await footer.locator('a[href^="mailto:"]').count(), 0);
  for (const [key, platform] of Object.entries(socialPlatforms)) {
    const link = footer.getByRole("link", {
      name: platform.label,
      exact: true,
    });
    assert.equal(await link.count(), socials[key] ? 1 : 0);
    if (socials[key]) {
      assert.equal(await link.getAttribute("href"), socials[key]);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.match(await link.getAttribute("rel"), /noopener/);
    }
  }
}
try {
  await mkdir("artifacts", { recursive: true });
  assert.equal(
    (
      await api.post(base + "/api/admin/login", { headers, data: demoAccount })
    ).status(),
    200,
  );
  originals = (await state()).content;
  await page.goto(base, { waitUntil: "networkidle" });
  await assertFooter(
    originals.contact.whatsapp,
    originals.contact.email,
    originals.contact,
  );
  assert.equal(await page.locator(".contact-copy").count(), 1);
  assert.equal(await page.locator(".contact-panel").count(), 1);
  const colors = await page.evaluate(() =>
    [".contact-section", ".site-footer"].map(
      (selector) =>
        getComputedStyle(document.querySelector(selector)).backgroundColor,
    ),
  );
  assert.notEqual(colors[0], colors[1], "CTA and footer are distinct sections");
  await page.locator(".contact-section [data-book]").click();
  await page.locator("#booking-dialog").waitFor({ state: "visible" });
  await page.locator("#booking-dialog .close-modal").click();
  await page.locator(".contact-section").scrollIntoViewIfNeeded();
  // Capture the two finished sections together, without a scrolled sticky header.
  await page.addStyleTag({ content: ".site-header { visibility: hidden; }" });
  const top = await page.locator(".contact-section").boundingBox();
  const bottom = await page.locator(".site-footer").boundingBox();
  await page.screenshot({
    fullPage: true,
    path: "artifacts/contact-footer-desktop.png",
    clip: {
      x: 0,
      y: top.y + (await page.evaluate(() => scrollY)),
      width: 1440,
      height: bottom.y + bottom.height - top.y,
    },
  });
  for (const width of [1000, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Footer overflow at ${width}`,
    );
    if (width === 390) {
      const start = await page.locator(".contact-section").boundingBox();
      const end = await page.locator(".site-footer").boundingBox();
      await page.screenshot({
        fullPage: true,
        path: "artifacts/contact-footer-mobile.png",
        clip: {
          x: 0,
          y: start.y + (await page.evaluate(() => scrollY)),
          width,
          height: end.y + end.height - start.y,
        },
      });
    }
  }
  await page.goto(base + "/dive-shop", { waitUntil: "networkidle" });
  await assertFooter(
    originals.contact.whatsapp,
    originals.contact.email,
    originals.contact,
  );
  assert.equal(
    await page
      .locator('.site-footer a[href="/dive-shop?mode=rental#catalog"]')
      .count(),
    1,
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(base + "/admin/contact", { waitUntil: "networkidle" });
  await page
    .getByLabel("Nomor WhatsApp (kode negara, tanpa +)")
    .fill("6285111112222");
  await page
    .getByLabel("Email kontak", { exact: true })
    .fill("contact-test@example.com");
  const socials = {};
  for (const [key, platform] of Object.entries(socialPlatforms)) {
    socials[key] = platform.url + "zanclus-example";
    await page
      .getByLabel("Tautan " + platform.label, { exact: true })
      .fill(socials[key]);
  }
  await page
    .getByRole("button", { name: "Simpan kontak", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Perubahan sudah tersimpan" })
    .waitFor();
  for (const path of ["/", "/dive-shop"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await assertFooter("6285111112222", "contact-test@example.com", socials);
    if (path === "/")
      assert.equal(
        await page
          .locator('.contact-panel a[href="mailto:contact-test@example.com"]')
          .count(),
        1,
      );
  }
  let snapshot = await state();
  const hidden = structuredClone(snapshot.content);
  for (const key of Object.keys(socialPlatforms)) hidden.contact[key] = "";
  hidden.contact.email = "";
  hidden.contact.location = "";
  assert.equal((await save(hidden, snapshot.version)).status(), 200);
  await page.reload({ waitUntil: "networkidle" });
  await assertFooter("6285111112222", "", hidden.contact);
  assert.equal(await page.locator(".site-footer-conversation").count(), 1);
  assert.equal(await page.locator(".site-footer-location").count(), 0);
  assert.equal(
    (await state()).content.contact.instagram,
    "",
    "Cleared demo defaults stay cleared",
  );
  snapshot = await state();
  const invalid = structuredClone(snapshot.content);
  invalid.contact.tiktok = "https://example.com/profile";
  assert.equal((await save(invalid, snapshot.version)).status(), 400);
  assert.equal((await save(originals, snapshot.version)).status(), 200);
  assert.deepEqual(errors, []);
  console.log(
    "PASS CTA/footer: distinct responsive sections, working plan dialog, WhatsApp/mailto/social links, shared Dive Shop footer, four CMS platform fields, live changes, hidden empty contacts, invalid URL rejection, and no overflow at 1440/1000/820/390/320. No messages sent or external links opened.",
  );
} finally {
  if (originals) {
    const snapshot = await state().catch(() => null);
    if (snapshot) await save(originals, snapshot.version).catch(() => {});
  }
  await browser.close();
}
