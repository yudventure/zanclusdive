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

  // The panel under the experiences keeps its look (title, button, photo
  // fan) but now invites visitors to the dive courses.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const panel = page.locator(".quiz-panel");
  assert.equal(
    await panel.locator(".eyebrow").textContent(),
    "KURSUS SELAM ZANCLUS",
  );
  assert.equal(
    await panel.locator("h2").textContent(),
    "Siap belajar menyelam?",
  );
  assert.equal(await panel.locator(".fan-photo img").count(), 5);
  const cta = panel.locator("a.quiz-button");
  assert.equal(await cta.getAttribute("href"), "/id/course");
  assert.match(await cta.textContent(), /Lihat kursus selam/);
  // The quiz is still one quiet link away.
  await page.locator("#open-quiz").click();
  assert.equal(
    await page.locator("#quiz-dialog").evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press("Escape");
  await page.goto(base + "/", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".quiz-panel h2").textContent(),
    "Ready to learn to dive?",
  );
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  // Main menu: Experiences lists the courses page.
  assert.equal(
    await page
      .locator('#navigation .nav-sub a[href="/id/course"]')
      .textContent(),
    "Kursus selam",
  );

  // The button opens /course; a #course link chooses it in the form.
  await cta.click();
  await page.waitForURL(base + "/id/course");
  // Wait for the page to be interactive (the date field gets today's date as
  // its minimum): a hash set before that is reset by the router.
  await page.locator("#course-date[min]").waitFor({ state: "attached" });
  await page.goto(base + "/id/course#open-water", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector("#course-select").value === "open-water",
  );
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
  await page.goto(base + "/id/course", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".course-item").count(), 3);
  assert.match(
    await page.locator("#open-water").textContent(),
    /Rp\s?7\.750\.000/,
  );

  // Certification partners run in a strip on the homepage panel and under
  // the /course hero, as plain white logos and names without cards or
  // borders; a logo uploaded in the admin replaces the short name.
  for (const path of ["/id", "/id/course"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const strip = page.locator(".partner-marquee").first();
    assert.equal(
      await strip.locator(".partner-marquee-title").textContent(),
      "PARTNER SERTIFIKASI SELAM",
    );
    const names = await strip
      .locator("li:not([aria-hidden]) .partner-name")
      .allTextContents();
    assert.deepEqual(names, ["SSI", "CMAS", "PADI"]);
    const look = await strip.evaluate((el) => {
      const item = getComputedStyle(el.querySelector("li"));
      const name = getComputedStyle(el.querySelector(".partner-name"));
      const items = el.querySelectorAll("li");
      const half = items[items.length / 2];
      return {
        border: item.borderTopWidth,
        background: item.backgroundColor,
        nameBackground: name.backgroundColor,
        color: name.color,
        // The second copy starts exactly half the track along: no jump.
        loop:
          Math.abs(
            half.getBoundingClientRect().left -
              items[0].getBoundingClientRect().left -
              el.querySelector(".partner-marquee-track").getBoundingClientRect()
                .width /
                2,
          ) < 1,
      };
    });
    assert.deepEqual(look, {
      border: "0px",
      background: "rgba(0, 0, 0, 0)",
      nameBackground: "rgba(0, 0, 0, 0)",
      color: "rgb(255, 255, 255)",
      loop: true,
    });
  }
  // The homepage panel sits on a dark diving photo, like the hero.
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.deepEqual(
    await page.locator(".quiz-panel").evaluate((el) => ({
      photo: el.querySelector(".quiz-photo").getAttribute("src"),
      cover: getComputedStyle(el.querySelector(".quiz-photo")).objectFit,
      title: getComputedStyle(el.querySelector("h2")).color,
      button: getComputedStyle(el.querySelector(".quiz-button")).color,
    })),
    {
      photo: "/assets/photos/course-cover.webp",
      cover: "cover",
      title: "rgb(255, 255, 255)",
      // Dark text on the light button.
      button: "rgb(6, 43, 59)",
    },
  );
  await page.goto(base + "/admin/courses", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "+ Tambah partner" }).click();
  await page.getByLabel("Nama singkat (mis. PADI)").last().fill("NAUI");
  await page.getByRole("button", { name: "Simpan partner" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  const logo = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a5ea8";
    ctx.fillRect(0, 0, 240, 80);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page
    .locator(".admin-partner-logo")
    .first()
    .locator('input[type="file"]')
    .setInputFiles({
      name: "ssi-logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(logo),
    });
  await page
    .getByText("Foto terpasang dan sudah tampil di website.", { exact: true })
    .waitFor({ timeout: 60000 });
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const strip = page.locator(".partner-marquee");
  assert.match(
    await strip
      .locator('li:not([aria-hidden]) img[alt="SSI"]')
      .getAttribute("src"),
    /^\/api\/media\//,
  );
  assert.deepEqual(
    await strip
      .locator("li:not([aria-hidden]) .partner-name")
      .allTextContents(),
    ["CMAS", "PADI", "NAUI"],
  );

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
    "PASS course: full-screen hero at 7 sizes, hero line without 'di bawah laut', course invitation in the familiar panel with photo fan, quiz still opens, menu link, #course preselects the course, sign-up validation and WhatsApp message, English copy, admin price and visibility edits, dark photo panel, plain white partner strip (no cards or borders, seamless loop) with admin-added partner and uploaded logo, 390px without sideways scroll. No messages sent.",
  );
} finally {
  await browser.close();
}
