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
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "Desktop overflow",
);
await page.locator('[data-course="beginner"]').click();
await page.locator("#detail-dialog").waitFor({ state: "visible" });
assert.equal(
  await page.locator("#detail-title").textContent(),
  "Mulai menyelam",
);
await page.locator("#detail-book").click();
await page.locator("#booking-dialog").waitFor({ state: "visible" });
await page.locator("#booking-dialog .close-modal").click();
const oldLabel = await page.locator("#month-label").textContent();
await page.locator("#next-month").click();
assert.notEqual(await page.locator("#month-label").textContent(), oldLabel);
await page.locator("#calendar-grid button:not([disabled])").first().click();
const selected = await page.locator('input[name="date"]').inputValue();
assert.ok(selected);
assert.match(await page.locator("#calendar-note").textContent(), /Rencana:/);
await page.locator("#open-quiz").click();
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
assert.equal(await page.locator("#booking-form").isVisible(), true);
await page.keyboard.press("Escape");
assert.equal(await page.locator("#booking-dialog").isVisible(), false);
assert.deepEqual(errors, []);
console.log(
  "PASS: desktop/mobile, no overflow, calendar, details, quiz, booking, WhatsApp URL, download, mobile menu, dialog keyboard, no runtime/network errors.",
);
await browser.close();
