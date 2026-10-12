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
  // No mixed languages: English kickers never show on Indonesian pages and
  // Indonesian copy never shows on English pages (dialogs included).
  const englishOnly =
    /A LITTLE CLOSER|ONE STEP AT A TIME|COME PREPARED|GOOD TO KNOW|LET'S MAKE A PLAN|WHAT'S ON|WHEN TO COME|POPULAR DIVE SPOTS|CARE FOR THE OCEAN|CHOOSE YOUR OCEAN STORY|FIND YOUR|READY FOR YOUR NEXT DIVE|GEAR UP, DIVE IN|YOUR GEAR, YOUR PLAN|MADE SIMPLE|ZANCLUS EXPERIENCES|STARTS UNDERWATER|All rights reserved/;
  const indonesianOnly =
    /Ilustrasi alat|Wajib diisi|opsional|Hak cipta|LEBIH DEKAT DENGAN LAUT|PENGALAMAN ZANCLUS|Kenali pengalamanmu/;
  for (const [path, pattern] of [
    ["/id", englishOnly],
    ["/id/diving", englishOnly],
    ["/id/snorkeling", englishOnly],
    ["/id/dive-shop", englishOnly],
    ["/", indonesianOnly],
    ["/diving", indonesianOnly],
    ["/dive-shop", indonesianOnly],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => {
      const copy = document.body.cloneNode(true);
      copy.querySelectorAll("script, style").forEach((el) => el.remove());
      return copy.textContent;
    });
    assert.doesNotMatch(text, pattern, "mixed language on " + path);
  }
  // English is the default language at the root URLs.
  const pages = {
    "/": ["en", "Beneath the waters of Raja Ampat,"],
    "/id": ["id", "Di bawah laut Raja Ampat,"],
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

  // English prices, booking and WhatsApp text.
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.textContent(".experience-item.is-open .price-card h3"),
    "Diving package prices",
  );
  await page.locator('.course-card[data-activity="trip"]').hover();
  assert.equal(
    await page.textContent(".experience-item.is-open .price-card h3"),
    "Sea trip package prices",
  );
  assert.match(
    await page.textContent(".experience-item.is-open .price-list"),
    /IDR\s?8,000,000/,
  );
  // Dive Shop services: buying first, rentals per item from the price list,
  // then cart and WhatsApp checkout.
  assert.equal(
    await page.textContent(".shop-service-panel h3"),
    "Buy dive gear & accessories",
  );
  assert.equal(
    await page.locator('#navigation a[href="#dive-shop"]').count(),
    1,
  );
  await page.getByRole("tab", { name: "Tanks & refills" }).click();
  const tank = page.locator(".shop-item", { hasText: "Tank + refill" });
  assert.match(await tank.textContent(), /IDR\s?100,000/);
  await page.keyboard.press("ArrowUp");
  assert.equal(
    await page.textContent(".shop-service-panel h3"),
    "Rent BCDs, regulators & wetsuits",
  );
  await page.getByRole("tab", { name: "Rent masks, snorkels & fins" }).click();
  await page.getByRole("button", { name: "Add Mask to the cart" }).click();
  await page.getByRole("button", { name: "One more Mask" }).click();
  await page.getByRole("button", { name: "Add Snorkel to the cart" }).click();
  assert.match(await page.textContent(".shop-cart-bar"), /Cart · 3 items/);
  await page.locator(".shop-cart-bar .button").click();
  const checkout = page.locator(".shop-checkout");
  await checkout.waitFor({ state: "visible" });
  await checkout.getByRole("button", { name: "Review my order" }).click();
  assert.equal(
    await checkout.locator(".booking-error").textContent(),
    "Please enter your name.",
  );
  await checkout.getByLabel("Name").fill("Alex");
  await checkout.getByRole("button", { name: "Review my order" }).click();
  assert.match(
    await checkout.locator(".booking-error").textContent(),
    /WhatsApp number/,
  );
  await checkout.getByLabel("WhatsApp number").fill("+44 7700 900123");
  await checkout.getByLabel("Rental days").fill("2");
  await checkout.getByRole("button", { name: "Review my order" }).click();
  const order2 = await checkout.locator("pre").textContent();
  assert.match(order2, /RENT · Mask × 2 · IDR\s?50,000 \/ day/);
  assert.match(order2, /Rental for 2 days/);
  assert.match(order2, /Estimated total IDR\s?300,000/);
  assert.match(
    await checkout.locator("a.button").getAttribute("href"),
    /^https:\/\/wa\.me\/\d+\?text=/,
  );
  await page.keyboard.press("Escape");
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
  await page.fill("#inquiry-whatsapp", "+44 7700 900123");
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
  await page.fill("#order-name", "Alex");
  await page.fill("#order-whatsapp", "+44 7700 900123");
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
