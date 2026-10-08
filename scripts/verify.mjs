import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.goto(baseURL, { waitUntil: "networkidle" });
assert.equal(
  await page
    .locator(".site-header")
    .evaluate((el) => getComputedStyle(el).backgroundColor),
  "rgba(0, 0, 0, 0)",
  "Initial header has no background",
);
assert.equal(
  await page.locator('.beginner-calendar [data-activity="diving"]').count(),
  1,
);
assert.equal(await page.locator(".beginner-calendar #calendar").count(), 1);
async function assertCentered(selector) {
  const centered = await page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      Math.abs(rect.left + rect.width / 2 - innerWidth / 2) < 2 &&
      Math.abs(rect.top + rect.height / 2 - innerHeight / 2) < 2
    );
  });
  assert.equal(centered, true, `${selector} is centered in viewport`);
}
const fullWidth = await page.locator(".page-shell").evaluate((el) => {
  const rect = el.getBoundingClientRect();
  return (
    rect.left === 0 &&
    rect.width === innerWidth &&
    getComputedStyle(el).borderRadius === "0px"
  );
});
assert.equal(fullWidth, true, "Website fills viewport without outer frame");
const quickChat = page.getByRole("link", {
  name: "Chat WhatsApp untuk bantuan cepat",
});
assert.equal(await quickChat.isVisible(), true);
const quickURL = await quickChat.getAttribute("href");
assert.ok(quickURL.startsWith("https://wa.me/6285190849237?text="));
assert.match(decodeURIComponent(quickURL), /mendapat bantuan/);
await context.route("https://wa.me/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "WhatsApp test destination",
  }),
);
const popupPromise = page.waitForEvent("popup");
await quickChat.click();
const popup = await popupPromise;
await popup.waitForLoadState();
assert.equal(popup.url(), quickURL);
await popup.close();
await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
await page.waitForFunction(() =>
  document.querySelector(".site-header").classList.contains("is-scrolled"),
);
assert.equal(
  await page
    .locator(".site-header")
    .evaluate((el) => el.getBoundingClientRect().top),
  0,
  "Quick service remains accessible when scrolling",
);
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await page.waitForFunction(
  () =>
    getComputedStyle(document.querySelector(".site-header")).backgroundColor ===
    "rgba(0, 0, 0, 0)",
);
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "Desktop overflow",
);
for (const key of ["diving", "snorkeling", "trip"]) {
  await page.locator(`#experiences [data-activity="${key}"]`).click();
  await page.waitForURL(`${baseURL}/${key}`);
  await page.locator("#activity-title").waitFor({ state: "visible" });
  await page.goto(baseURL, { waitUntil: "networkidle" });
}
await page.locator(".hero [data-book]").click();
await page.locator("#booking-dialog").waitFor({ state: "visible" });
await assertCentered("#booking-dialog");
await page.locator("#booking-dialog .close-modal").click();
const oldLabel = await page.locator("#month-label").textContent();
await page.locator("#next-month").click();
assert.notEqual(await page.locator("#month-label").textContent(), oldLabel);
await page.locator("#calendar-grid button:not([disabled])").first().click();
const selected = await page.locator('input[name="date"]').inputValue();
assert.ok(selected);
assert.match(await page.locator("#calendar-note").textContent(), /Rencana:/);
await page.locator("#open-quiz").click();
await assertCentered("#quiz-dialog");
await page
  .getByRole("button", { name: "Sudah, aku ingin menjelajah lagi" })
  .click();
await page
  .getByRole("button", { name: "Fotografi dan pengalaman yang berbeda" })
  .click();
assert.equal(
  await page.locator("#quiz-content h2").textContent(),
  "Pengalaman spesial",
);
await page.locator("#quiz-content .button").click();
await page.locator('input[name="name"]').fill("Ayu <script>");
await page.locator('input[name="people"]').fill("2");
await page.locator("textarea").fill("Saya ingin info diving.");
await page.locator('#booking-form button[type="submit"]').click();
await page.locator("#booking-result").waitFor({ state: "visible" });
await assertCentered("#booking-dialog");
const wa = await page.locator("#send-whatsapp").getAttribute("href");
assert.ok(wa.startsWith("https://wa.me/6285190849237?text="));
assert.match(decodeURIComponent(wa), /Ayu <script>/);
assert.match(decodeURIComponent(wa), /Peserta: 2/);
assert.match(decodeURIComponent(wa), /Pengalaman spesial/);
assert.ok(
  (await page.locator("#booking-summary").textContent()).includes(
    "Ayu <script>",
  ),
);
const downloadPromise = page.waitForEvent("download");
await page.locator("#download-plan").click();
const download = await downloadPromise;
assert.match(download.suggestedFilename(), /^zanclus-rencana-/);
await page.locator("#booking-dialog .close-modal").click();
await page.locator("#see-all").click();
assert.equal(await page.locator("#more-courses").isVisible(), true);
await page.locator("#see-all").click();
assert.equal(await page.locator("#more-courses").isVisible(), false);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL, { waitUntil: "networkidle" });
assert.equal(await quickChat.isVisible(), true, "Mobile quick service visible");
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "Mobile overflow",
);
await page.locator(".menu-toggle").click();
assert.equal(await page.locator("#navigation").isVisible(), true);
await page.locator('#navigation a[href="#experiences"]').click();
assert.equal(await page.locator("#navigation").isVisible(), false);
await page.locator(".hero [data-book]").click();
await page.locator("#booking-dialog").waitFor({ state: "visible" });
await assertCentered("#booking-dialog");
assert.equal(await page.locator("#booking-form").isVisible(), true);
await page.keyboard.press("Escape");
assert.equal(await page.locator("#booking-dialog").isVisible(), false);
assert.deepEqual(errors, []);
console.log(
  "PASS: full-width desktop/mobile, sticky header, quick WhatsApp popup, no overflow, calendar, details, quiz, booking, WhatsApp URL, download, mobile menu, dialog keyboard, no runtime/network errors.",
);
await browser.close();
