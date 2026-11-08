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

  // The button opens /course; a #course link marks that course.
  await cta.click();
  await page.waitForURL(base + "/id/course");
  // Wait for React to take over the page: a hash set before that is reset
  // by the router.
  await page.waitForFunction(() =>
    Object.keys(document.querySelector(".course-item") ?? {}).some((key) =>
      key.startsWith("__reactFiber"),
    ),
  );
  await page.goto(base + "/id/course#open-water", { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector("#open-water").classList.contains("is-selected"),
  );
  assert.equal(await page.locator(".course-item").count(), 4);
  assert.equal(
    await page
      .locator('#course-navigation a[aria-current="page"]')
      .textContent(),
    "Kursus selam",
  );
  // No side panel: the courses use the full width, and "Choose this course"
  // opens the sign-up in a window.
  assert.equal(await page.locator(".course-signup, aside#inquiry").count(), 0);
  assert.ok(
    (await page.locator(".course-path").boundingBox()).width > 900,
    "courses use the full width",
  );
  await page
    .locator("#advanced")
    .getByRole("button", { name: "Pilih kursus ini" })
    .click();
  const signup = page.locator(".course-checkout");
  await signup.locator("#course-date").waitFor({ state: "visible" });
  assert.equal(
    await signup.locator("h2").textContent(),
    "Daftar Advanced Open Water.",
  );
  assert.equal(await page.locator("#course-select").inputValue(), "advanced");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "course-date",
  );
  assert.deepEqual(
    await signup.locator(".course-group > legend").allTextContents(),
    [
      "Jadwal & peserta",
      "Data peserta utama",
      "Pengalaman & kesehatan",
      "Perlengkapan & penjemputan",
    ],
  );
  const next = signup.getByRole("button", { name: "Lanjut ke ringkasan" });
  const refused = async (text) => {
    await next.click();
    assert.equal(await signup.locator(".activity-error").textContent(), text);
  };
  await refused("Isi nama, maksimal 120 karakter.");
  await page.locator("#course-name").fill("Tamu Kursus");
  await page.locator("#course-whatsapp").fill("081234567890");
  const date = await page.evaluate(() => {
    const d = new Date(Date.now() + 9 * 864e5);
    return d.toLocaleDateString("en-CA");
  });
  await page.locator("#course-date").fill(date);
  await page.locator("#course-participants").fill("2");
  assert.match(
    await signup.locator(".slot-note").textContent(),
    /slot tersisa di tanggal ini/,
  );
  await refused(
    "Isi email: dipakai untuk pendaftaran sertifikasi dan materi belajar.",
  );
  await page.locator("#course-email").fill("tamu.kursus@example.com");
  await refused("Isi tanggal lahir peserta utama dengan benar.");
  // Advanced Open Water starts at 12.
  const young = await page.evaluate((start) => {
    const d = new Date(start + "T12:00:00Z");
    d.setUTCFullYear(d.getUTCFullYear() - 11);
    return d.toISOString().slice(0, 10);
  }, date);
  await page.locator("#course-birth").fill(young);
  await refused("Usia minimal 12 tahun pada tanggal mulai kursus ini.");
  await page.locator("#course-birth").fill("1995-04-12");
  await refused("Pilih kemampuan berenang.");
  await page.locator("#course-swim").selectOption("comfortable");
  await refused("Pilih kondisi kesehatan.");
  await signup.getByLabel(/^Ada kondisi medis/).check();
  await refused(
    "Ceritakan kondisi medisnya di catatan, supaya instruktur bisa menyiapkan.",
  );
  await signup.getByLabel("Sehat, tidak ada kondisi medis").check();
  await page.locator("#course-certification").selectOption("Open Water");
  await page.locator("#course-dives").selectOption("1-20");
  await page.locator("#course-nationality").fill("Indonesia");
  await page.locator("#course-wetsuit").selectOption("M");
  await page.locator("#course-fins").fill("42");
  await page.locator("#course-stay").fill("Homestay Waisai");
  await page.locator("#course-language").selectOption("en");
  assert.match(
    await signup.locator(".pay-total").textContent(),
    /Rp\s?[\d.]+ × 2 orang/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    (await signup.boundingBox()).width <= 390,
    "sign-up window fits a phone",
  );
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/course-signup-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/course-signup-desktop.png",
  });
  await next.click();
  assert.equal(
    await signup.locator("#plan-summary-title").textContent(),
    "Ringkasan rencana",
  );
  assert.match(
    await signup.locator(".plan-summary-list").textContent(),
    /KursusAdvanced Open Water[\s\S]*Emailtamu\.kursus@example\.com[\s\S]*Lisensi yang dimilikiOpen Water[\s\S]*Tanggal lahir1995-04-12[\s\S]*KewarganegaraanIndonesia[\s\S]*Penyelaman tercatat1–20 kali[\s\S]*BerenangNyaman berenang 200 m[\s\S]*KesehatanSehat, tidak ada kondisi medis[\s\S]*Ukuran wetsuitM[\s\S]*Ukuran kaki42[\s\S]*Menginap diHomestay Waisai[\s\S]*Bahasa pengantarEnglish/,
  );
  const link = signup.getByRole("link", { name: "Lanjutkan ke WhatsApp" });
  const message = new URL(await link.getAttribute("href")).searchParams.get(
    "text",
  );
  assert.match(message, /daftar kursus Advanced Open Water/);
  assert.match(message, /Peserta: 2 orang/);
  assert.match(message, /Lisensi saat ini: Open Water/);
  assert.match(message, /Tanggal lahir: 1995-04-12/);
  assert.match(message, /Berenang: Nyaman berenang 200 m/);
  assert.match(message, /Menginap di: Homestay Waisai/);
  assert.doesNotMatch(message, /demo|contoh/i);
  // Editing keeps the answers; Escape closes the window.
  await signup.getByRole("button", { name: "← Ubah data" }).click();
  assert.equal(
    await page.locator("#course-stay").inputValue(),
    "Homestay Waisai",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".course-checkout[open]").count(), 0);

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
  // the /course hero, as logos and names without cards or borders; a logo
  // uploaded in the admin replaces the short name.
  for (const path of ["/id", "/id/course"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const strip = page.locator(".partner-marquee").first();
    assert.equal(
      await strip.locator(".partner-marquee-title").textContent(),
      "PARTNER SERTIFIKASI SELAM",
    );
    const names = await strip
      .locator("ul:not([aria-hidden]) .partner-name")
      .allTextContents();
    assert.deepEqual(names, ["SSI", "CMAS", "PADI"]);
    const look = await strip.evaluate((el) => {
      const item = getComputedStyle(el.querySelector("li"));
      const name = getComputedStyle(el.querySelector(".partner-name"));
      const track = el.querySelector(".partner-marquee-track");
      const copies = [...track.querySelectorAll(":scope > ul")];
      const copy = copies[0].getBoundingClientRect().width;
      return {
        border: item.borderTopWidth,
        background: item.backgroundColor,
        nameBackground: name.backgroundColor,
        color: name.color,
        // Each copy starts one copy's width after the last, and the strip
        // moves by exactly that width: no jump.
        loop:
          copies.length >= 2 &&
          copies.every(
            (ul, index) =>
              Math.abs(
                ul.getBoundingClientRect().left -
                  copies[0].getBoundingClientRect().left -
                  index * copy,
              ) < 1,
          ) &&
          Math.abs(
            parseFloat(track.style.getPropertyValue("--copy-w")) - copy,
          ) < 1,
        // Only as many copies as the screen needs, so the moving strip stays
        // narrow.
        narrow: track.scrollWidth <= innerWidth + 2 * copy + 1,
        hidden: copies.slice(1).every((ul) => ul.ariaHidden === "true"),
      };
    });
    assert.deepEqual(look, {
      border: "0px",
      background: "rgba(0, 0, 0, 0)",
      nameBackground: "rgba(0, 0, 0, 0)",
      color: "rgb(255, 255, 255)",
      loop: true,
      narrow: true,
      hidden: true,
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
  // A 1080 × 1080 transparent PNG with a colourful round emblem in the middle
  // (like the POSSI logo), and a dark one-colour logo on transparency.
  const drawLogo = (kind) =>
    page.evaluate(async (kind) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (kind === "emblem") {
        ctx.fillStyle = "#d42a2a";
        ctx.beginPath();
        ctx.arc(540, 540, 300, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(540, 540, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1747a6";
        ctx.fillRect(470, 420, 140, 240);
      } else {
        ctx.fillStyle = "#101820";
        ctx.fillRect(140, 460, 800, 160);
      }
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      return [...new Uint8Array(await blob.arrayBuffer())];
    }, kind);
  const savedPartners = async () =>
    (await (await page.request.get(base + "/api/admin/state")).json()).content
      .courses.partners;
  for (const [index, kind] of [
    [1, "emblem"],
    [2, "dark"],
  ]) {
    await page
      .locator(".admin-partner-logo")
      .nth(index)
      .locator('input[type="file"]')
      .setInputFiles({
        name: kind + ".png",
        mimeType: "image/png",
        buffer: Buffer.from(await drawLogo(kind)),
      });
    // Saved without pressing a button.
    for (let i = 0; i < 120 && !(await savedPartners())[index].logo; i++)
      await page.waitForTimeout(500);
    assert.ok((await savedPartners())[index].logo, kind + " logo saved");
  }
  const previews = page.locator(".admin-partner-preview img");
  // The emblem keeps its colours; the dark logo is shown white. Both fit
  // their preview, and the transparent edges were trimmed off.
  for (const [index, style, ratio] of [
    [1, "is-color", 1],
    [2, "is-white", 4.33],
  ]) {
    const shown = await previews.nth(index).evaluate((img) => ({
      style: img.className,
      height: img.getBoundingClientRect().height,
      inside:
        img.getBoundingClientRect().bottom <=
        img.parentElement.getBoundingClientRect().bottom,
      width: img.naturalWidth,
      ratio: img.naturalWidth / img.naturalHeight,
    }));
    assert.equal(shown.style, style);
    assert.equal(shown.height, 52);
    assert.equal(shown.inside, true);
    assert.ok(shown.width <= 800 && shown.width > 500, "trimmed to the mark");
    assert.ok(Math.abs(shown.ratio - ratio) < 0.2, "ratio " + shown.ratio);
  }
  assert.equal(
    await page.getByRole("radio", { name: "Warna asli" }).nth(1).isChecked(),
    true,
  );
  assert.equal(
    await page.getByRole("radio", { name: "Putih" }).nth(2).isChecked(),
    true,
  );
  assert.deepEqual(
    (await savedPartners()).map((p) => p.logoStyle),
    ["color", "color", "white", "color"],
  );
  // The shape of each logo is saved with it.
  const ratios = (await savedPartners()).map((p) => p.logoRatio);
  assert.ok(Math.abs(ratios[1] - 1) < 0.2, "emblem ratio " + ratios[1]);
  assert.ok(Math.abs(ratios[2] - 4.33) < 0.2, "word mark ratio " + ratios[2]);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const strip = page.locator(".partner-marquee");
  await strip.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const img = document.querySelector(
      '.partner-marquee ul:not([aria-hidden]) img[alt="CMAS"]',
    );
    return img?.complete && img.naturalWidth > 0;
  });
  // On the site: the emblem in colour and loaded; PADI white. The round
  // emblem and the wide word mark get boxes that look the same size.
  const shownLogo = (alt) =>
    strip
      .locator(`ul:not([aria-hidden]) img[alt="${alt}"]`)
      .evaluate((img) => ({
        loaded: img.complete && img.naturalWidth > 0,
        className: img.className,
        // Rounded: the moving strip can leave a sub-pixel remainder.
        width: Math.round(img.getBoundingClientRect().width),
        height: Math.round(img.getBoundingClientRect().height),
        filter: getComputedStyle(img).filter,
      }));
  const emblem = await shownLogo("CMAS");
  const wordMark = await shownLogo("PADI");
  assert.equal(emblem.loaded, true);
  assert.equal(emblem.className, "is-color");
  assert.deepEqual([emblem.width, emblem.height], [46, 46]);
  assert.deepEqual([wordMark.width, wordMark.height], [111, 26]);
  assert.doesNotMatch(emblem.filter, /invert/);
  assert.match(wordMark.filter, /invert/);
  assert.match(
    await strip
      .locator('ul:not([aria-hidden]) img[alt="SSI"]')
      .getAttribute("src"),
    /^\/api\/media\//,
  );
  assert.deepEqual(
    await strip
      .locator("ul:not([aria-hidden]) .partner-name")
      .allTextContents(),
    ["NAUI"],
  );
  await strip.first().scrollIntoViewIfNeeded();
  await strip.first().screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/partner-logos.png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/id", "/id/course"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no sideways scroll on " + path,
    );
    // On a phone the moving strip stays short (Safari on iPhone drops parts
    // of a very wide moving layer), and long names wrap to two lines.
    const strip = page.locator(".partner-marquee").first();
    await strip.scrollIntoViewIfNeeded();
    const phone = await strip.evaluate((el) => {
      const track = el.querySelector(".partner-marquee-track");
      return {
        width: track.scrollWidth,
        copies: track.querySelectorAll(":scope > ul").length,
        measured: track.classList.contains("is-measured"),
      };
    });
    assert.equal(phone.measured, true);
    assert.ok(phone.width <= 2400, "strip width " + phone.width);
    assert.ok(phone.copies >= 2);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS course: full-screen hero at 7 sizes, hero line without 'di bawah laut', course invitation in the familiar panel with photo fan, quiz still opens, menu link, #course preselects the course, sign-up validation and WhatsApp message, English copy, admin price and visibility edits, dark photo panel, partner strip (no cards or borders, seamless loop of measured copies, short on a phone) with admin-added partner, uploaded logos trimmed, a colourful transparent emblem in colour and a dark logo white, both sized by their saved shape, 390px without sideways scroll. No messages sent.",
  );
} finally {
  await browser.close();
}
