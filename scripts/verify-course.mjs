import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Dive courses on the homepage and /course, the course sign-up message,
// admin price edits, and the full-screen hero. Run against a local test
// server with CMS_DEMO_LOGIN=true.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
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
try {
  // The hero fills the screen on laptop, desktop, wide and phone screens,
  // with its weather panel still inside.
  for (const [width, height] of [
    [1280, 633],
    [1366, 657],
    [1440, 900],
    [1920, 960],
    [2560, 1300],
    [390, 844],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/id", { waitUntil: "networkidle" });
    const hero = await page.evaluate(() => ({
      height: document.querySelector(".hero").getBoundingClientRect().height,
      footer: document.querySelector(".hero-footer").getBoundingClientRect()
        .bottom,
    }));
    assert.ok(Math.abs(hero.height - height) <= 1, `hero height at ${width}`);
    assert.ok(hero.footer <= height, `hero content fits at ${width}x${height}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(
    await page.locator(".hero-topline").textContent(),
    "CERITAMU BERIKUTNYA DIMULAI",
  );

  // The course section replaces the old quiz panel; the quiz stays reachable.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".quiz-panel, .photo-fan").count(), 0);
  const cards = page.locator("#courses .course-offer-card");
  assert.equal(await cards.count(), 4);
  assert.match(await cards.nth(1).textContent(), /Open Water Diver/);
  assert.match(await cards.nth(1).textContent(), /Rp\s?7\.500\.000/);
  await page.locator("#open-quiz").click();
  assert.equal(
    await page.locator("#quiz-dialog").evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press("Escape");
  // Main menu: Experiences lists the courses page.
  assert.equal(
    await page
      .locator('#navigation .nav-sub a[href="/id/course"]')
      .textContent(),
    "Kursus selam",
  );

  // A card opens /course with that course chosen in the form.
  await cards.nth(1).click();
  await page.waitForURL(base + "/id/course#open-water");
  assert.equal(await page.locator("#course-select").inputValue(), "open-water");
  assert.equal(await page.locator(".course-item").count(), 4);
  assert.equal(
    await page
      .locator('#course-navigation a[aria-current="page"]')
      .textContent(),
    "Kursus selam",
  );
  await page.getByRole("button", { name: "Siapkan pesan WhatsApp" }).click();
  await page.getByText("Isi nama, maksimal 120 karakter.").waitFor();
  await page.locator("#course-name").fill("Tamu Kursus");
  await page.locator("#course-whatsapp").fill("081234567890");
  await page.locator("#course-certification").selectOption("Belum punya");
  const date = await page.evaluate(() => {
    const d = new Date(Date.now() + 9 * 864e5);
    return d.toLocaleDateString("en-CA");
  });
  await page.locator("#course-date").fill(date);
  await page.locator("#course-participants").fill("2");
  // "Choose this course" switches the form to that course.
  await page
    .locator("#advanced")
    .getByRole("button", { name: "Pilih kursus ini" })
    .click();
  assert.equal(await page.locator("#course-select").inputValue(), "advanced");
  await page.getByRole("button", { name: "Siapkan pesan WhatsApp" }).click();
  const link = page.getByRole("link", { name: "Lanjutkan ke WhatsApp" });
  const message = new URL(await link.getAttribute("href")).searchParams.get(
    "text",
  );
  assert.match(message, /daftar kursus Advanced Open Water/);
  assert.match(message, /Peserta: 2 orang/);
  assert.match(message, /Lisensi saat ini: Belum punya/);
  assert.doesNotMatch(message, /demo|contoh/i);

  // English page uses English course copy.
  await page.goto(base + "/course", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Learn to dive in Raja Ampat.",
  );
  assert.match(
    await page.locator("#discovery").textContent(),
    /Your first time underwater/,
  );

  // Prices and visibility are edited in the admin.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/courses", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Kursus selam" }).first().waitFor();
  await page.getByLabel("Harga (Rp)").nth(1).fill("7750000");
  await page.getByLabel("Tampilkan di website").nth(3).uncheck();
  await page.getByRole("button", { name: "Simpan kursus" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(await cards.count(), 3);
  assert.match(await cards.nth(1).textContent(), /Rp\s?7\.750\.000/);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/id", "/id/course"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no sideways scroll on " + path,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS course: full-screen hero at 7 sizes, hero line without 'di bawah laut', course section with prices replacing the quiz panel, quiz still opens, menu link, card preselects course, sign-up validation and WhatsApp message, English copy, admin price and visibility edits, 390px without sideways scroll. No messages sent.",
  );
} finally {
  await browser.close();
}
