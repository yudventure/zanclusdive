import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Run against a local demo server: CMS_MODE=demo npm start
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  // English is the default language at the root URLs.
  const pages = {
    "/": ["en", "Beneath the sea,"],
    "/id": ["id", "Di bawah laut,"],
    "/diving": ["en", "Find the story beneath the surface."],
    "/id/diving": ["id", "Temukan cerita di bawah permukaan."],
    "/dive-shop": ["en", "Gear for your next story."],
    "/id/dive-shop": ["id", "Perlengkapan untuk cerita berikutnya."],
  };
  for (const [path, [lang, heading]] of Object.entries(pages)) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(await page.getAttribute("html", "lang"), lang, path);
    assert.ok(
      (await page.locator("h1").first().textContent()).includes(heading),
    );
    assert.equal(
      await page.locator('link[rel="alternate"][hreflang="id"]').count(),
      1,
      path,
    );
    // Internal links stay in the same language.
    const hrefs = await page
      .locator("main a[href^='/'], footer a[href^='/'], nav a[href^='/']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    for (const href of hrefs.filter((h) => !h.startsWith("/admin")))
      assert.equal(href.startsWith("/id"), lang === "id", `${path} → ${href}`);
  }
  assert.equal((await context.request.get(base + "/id/unknown")).status(), 404);

  // The switch keeps the current page.
  await page.goto(base + "/snorkeling", { waitUntil: "networkidle" });
  await page.locator('.language-switch a[hreflang="id"]').click();
  await page.waitForURL(base + "/id/snorkeling");
  await page.locator('.language-switch a[hreflang="en"]').click();
  await page.waitForURL(base + "/snorkeling");

  // English calendar, booking and WhatsApp text.
  await page.goto(base, { waitUntil: "networkidle" });
  assert.match(await page.textContent("#month-label"), /^[A-Z][a-z]+ \d{4}$/);
  await page.locator("#open-quiz").click();
  assert.equal(
    await page.textContent("#quiz-content h2"),
    "Have you been diving before?",
  );
  await page.keyboard.press("Escape");
  const response = await context.request.post(
    base + "/api/bookings?locale=en",
    {
      headers: { Origin: new URL(base).origin },
      data: {
        requestId: crypto.randomUUID(),
        name: "A",
        phone: "1",
        people: 1,
      },
    },
  );
  assert.equal(
    (await response.json()).error,
    "Enter a WhatsApp number we can reach, including the country code.",
  );
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jayapura",
  });
  await page.goto(base + "/trip", { waitUntil: "networkidle" });
  await page.fill("#inquiry-name", "Alex");
  await page.fill("#inquiry-date", today);
  await page.fill("#inquiry-participants", "3");
  await page.locator(".activity-form button[type=submit]").click();
  const inquiry = await page.textContent(".activity-message-preview");
  assert.ok(inquiry.startsWith("Hi Zanclus! I'd like to ask about Sea trip."));
  assert.ok(inquiry.includes("Participants: 3 people"));

  await page.goto(base + "/dive-shop?mode=rental", {
    waitUntil: "networkidle",
  });
  await page.locator(".shop-product-card button").first().click();
  await page.locator(".shop-order-form input").first().fill("Alex");
  await page.locator(".shop-submit").click();
  const order = await page.textContent(".shop-message pre");
  assert.ok(order.includes("RENTAL · Mask & snorkel set × 1 — IDR"));

  // Mobile header fits both languages.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/", "/id", "/dive-shop", "/id/trip"]) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        0,
        `${path} at ${width}px`,
      );
      assert.ok(await page.locator(".language-switch a:visible").count());
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS i18n: English default at root, Indonesian under /id, html lang, hreflang, language switch, same-language links, English quiz/booking errors/WhatsApp/order messages, 404s and mobile header. No messages sent.",
  );
} finally {
  await browser.close();
}
