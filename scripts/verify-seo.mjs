import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// What Google Search Console reads: robots.txt, sitemap.xml with hreflang,
// absolute canonical links, the business data, and the verification tag
// saved from the admin. Start the demo server as for verify-password,
// without SITE_URL or NEXT_PUBLIC_SITE_URL.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const site = process.env.EXPECT_SITE_URL || "https://zanclusdivecenter.com";
const headers = { Origin: base };
const shots = process.env.SHOT_DIR || "artifacts";
const code = "aBcD1234_efGH-5678ijklMNOPqrstuvwxYZ01234567";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const get = (path) => context.request.get(base + path);

  // robots.txt
  const robots = await get("/robots.txt");
  assert.equal(robots.status(), 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /User-Agent: \*/i);
  for (const path of ["/admin", "/api/admin/", "/partner/", "/payment/"])
    assert.ok(robotsText.includes("Disallow: " + path), path);
  assert.ok(
    !/Disallow: \/api\/\n/.test(robotsText),
    "uploaded photos stay crawlable",
  );
  assert.ok(robotsText.includes(`Sitemap: ${site}/sitemap.xml`));

  // sitemap.xml
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status(), 200);
  assert.match(sitemap.headers()["content-type"], /xml/);
  const xml = await sitemap.text();
  for (const path of [
    "/",
    "/id",
    "/diving",
    "/id/diving",
    "/snorkeling",
    "/course",
    "/id/about",
  ])
    assert.ok(xml.includes(`<loc>${site}${path}</loc>`), path);
  assert.ok(
    xml.includes(
      `<xhtml:link rel="alternate" hreflang="id" href="${site}/id/diving"`,
    ),
    "hreflang in the sitemap",
  );
  assert.ok(!/admin|partner|payment/.test(xml));

  // Absolute canonical and hreflang in the pages.
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/id/diving", { waitUntil: "domcontentloaded" });
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    `${site}/id/diving`,
  );
  assert.equal(
    await page
      .locator('link[rel="alternate"][hreflang="en"]')
      .getAttribute("href"),
    `${site}/diving`,
  );
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  // The root may be written with or without the final slash; Google reads
  // both as the same address.
  assert.match(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    new RegExp(`^${site.replace(/\./g, "\\.")}/?$`),
  );
  assert.equal(
    await page.locator('meta[property="og:image"]').getAttribute("content"),
    `${site}/assets/hero.webp`,
  );
  // The business card.
  const ld = JSON.parse(
    await page.locator('script[type="application/ld+json"]').textContent(),
  );
  assert.equal(ld["@type"], "SportsActivityLocation");
  assert.equal(ld.name, "Zanclus Dive Center");
  assert.equal(ld.url, `${site}/`);
  assert.match(ld.telephone, /^\+62\d+$/);
  assert.equal(ld.address.addressLocality, "Waisai");
  // No verification tag until one is saved.
  assert.equal(
    await page.locator('meta[name="google-site-verification"]').count(),
    0,
  );

  // The admin page: status, then the tag pasted as Search Console shows it.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/seo", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "SEO & Search Console");
  const status = page.locator(".admin-seo-list");
  // Without a tag the page reads as verified in DNS, not as a warning.
  await status.getByText("Lewat DNS").waitFor();
  assert.ok(
    (await page.locator(".admin-seo-steps").textContent()).includes(
      "pilih Domain, lalu isi zanclusdivecenter.com",
    ),
  );
  assert.match(
    await status.textContent(),
    new RegExp(`${site.replace(/\./g, "\\.")}/sitemap\\.xml`),
  );
  await page
    .getByLabel("Tag meta verifikasi")
    .fill(`<meta name="google-site-verification" content="${code}" />`);
  await page.getByRole("button", { name: "Simpan kode verifikasi" }).click();
  await page.getByText("Pengaturan SEO tersimpan.").waitFor();
  await status.getByText("Tag HTML terpasang").waitFor();
  assert.equal(await page.getByLabel("Tag meta verifikasi").inputValue(), code);
  await page.screenshot({ path: shots + "/admin-seo.png", fullPage: true });
  // A file name (the HTML file method) is refused with the way to go.
  const state = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  const refused = await context.request.put(base + "/api/admin/settings", {
    headers,
    data: {
      content: {
        ...state.content,
        seo: { googleVerification: "google1234abcd.html" },
      },
      version: state.version,
    },
  });
  assert.equal(refused.status(), 400);
  assert.match((await refused.json()).error, /Tag HTML/);
  // The tag is on every public page, in both languages.
  const visitor = await browser.newContext();
  for (const path of ["/", "/id", "/diving", "/id/course"]) {
    const html = await (await visitor.request.get(base + path)).text();
    assert.ok(
      html.includes(
        `<meta name="google-site-verification" content="${code}"/>`,
      ),
      path,
    );
  }
  // Crawler files stay readable while the whole site is locked.
  const locked = structuredClone(state.content);
  locked.seo = { googleVerification: code };
  locked.developer = { ...locked.developer, enabled: true, site: true };
  const fresh = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  assert.equal(
    (
      await context.request.put(base + "/api/admin/settings", {
        headers,
        data: { content: locked, version: fresh.version },
      })
    ).status(),
    200,
  );
  assert.equal((await visitor.request.get(base + "/")).status(), 503);
  assert.equal((await visitor.request.get(base + "/robots.txt")).status(), 200);
  assert.equal(
    (await visitor.request.get(base + "/sitemap.xml")).status(),
    200,
  );
  const back = await (
    await context.request.get(base + "/api/admin/state")
  ).json();
  back.content.developer = {
    ...back.content.developer,
    enabled: false,
    site: false,
  };
  assert.equal(
    (
      await context.request.put(base + "/api/admin/settings", {
        headers,
        data: { content: back.content, version: back.version },
      })
    ).status(),
    200,
  );
  // A phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin/seo", { waitUntil: "networkidle" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll at 390px",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS seo: robots.txt keeps the admin, partner and payment pages out and points to the sitemap; sitemap.xml lists the public pages in both languages with hreflang; canonical, hreflang and og:image are absolute; the business data is on the homepage; the admin page shows the status, saves the pasted Search Console tag as its code and refuses a file name; the tag is on every public page; robots.txt and sitemap.xml stay readable while the site is locked; 390px without sideways scroll.",
  );
} finally {
  await browser.close();
}
