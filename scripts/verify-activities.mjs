import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { activityKeys, activityLabels } from "../src/activity-model.js";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3190";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "CMS mutation tests require an isolated local demo server.",
);
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Jayapura",
});
const page = await context.newPage(),
  api = context.request,
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const originals = {};
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
async function noOverflow(label) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    label,
  );
}
try {
  await mkdir("artifacts", { recursive: true });
  assert.equal(
    (
      await api.post(base + "/api/admin/login", { headers, data: demoAccount })
    ).status(),
    200,
  );
  Object.assign(originals, await state());
  assert.equal(originals.mode, "demo");
  assert.ok(
    activityKeys.every((key) => originals.content.activities[key].enabled),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#activities .activity-card").count(), 3);
  for (const key of activityKeys) {
    const homeLink = page.locator(`#activities a[href="/${key}"]`);
    assert.ok((await homeLink.textContent()).includes(activityLabels[key]));
    assert.equal(
      await page.getByRole("contentinfo").locator(`a[href="/${key}"]`).count(),
      1,
    );
  }
  await page.locator('#activities a[href="/snorkeling"]').click();
  await page.waitForURL(base + "/snorkeling");
  for (const key of activityKeys) {
    await page.goto(`${base}/${key}`, { waitUntil: "networkidle" });
    const activity = originals.content.activities[key];
    assert.equal(await page.locator("h1").textContent(), activity.title);
    assert.ok((await page.title()).includes(activityLabels[key]));
    assert.equal(
      await page.locator(".activity-price strong").textContent(),
      "Minta penawaran",
    );
    assert.equal(
      await page
        .locator(".activity-hero-photo")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    assert.equal(
      await page.locator(".activity-timeline li").count(),
      activity.itinerary.length,
    );
    assert.equal(
      await page.locator(".activity-preparations li").count(),
      activity.preparations.length,
    );
    assert.equal(await page.locator(".activity-card").count(), 2);
    assert.equal(
      await page
        .locator(".site-header")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    assert.equal(
      await page.locator('.site-header a[aria-current="page"]').textContent(),
      activityLabels[key],
    );
    const faq = page.locator(".activity-faqs details").first();
    await faq.locator("summary").click();
    assert.equal(await faq.locator("p").isVisible(), true);
    const date = await page.evaluate(() => {
      const future = new Date();
      future.setDate(future.getDate() + 8);
      return future.toLocaleDateString("en-CA");
    });
    await page
      .getByLabel("Nama kamu", { exact: true })
      .fill("Tamu Uji Aktivitas");
    await page.getByLabel("Usulan tanggal", { exact: true }).fill(date);
    await page.getByLabel("Jumlah peserta", { exact: true }).fill("3");
    await page
      .getByLabel("Ceritakan rencanamu", { exact: false })
      .fill("Perlu fins ukuran M");
    await page.getByRole("button", { name: "Siapkan pesan WhatsApp" }).click();
    const url = new URL(
      await page
        .getByRole("link", { name: "Lanjutkan ke WhatsApp" })
        .getAttribute("href"),
    );
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/" + originals.content.contact.whatsapp);
    const message = url.searchParams.get("text");
    for (const value of [
      activityLabels[key],
      activity.title,
      "Tamu Uji Aktivitas",
      date,
      "3 orang",
      "Perlu fins ukuran M",
      "belum menjadi reservasi",
    ])
      assert.ok(message.includes(value), value);
    await page.getByLabel("Jumlah peserta", { exact: true }).fill("4");
    assert.equal(
      await page.locator(".activity-message").count(),
      0,
      "An edited inquiry cannot send stale details",
    );
    await page.evaluate(() => scrollTo({ top: 700, behavior: "instant" }));
    await page.waitForFunction(() =>
      document.querySelector(".site-header").classList.contains("is-scrolled"),
    );
    assert.equal(
      await page
        .locator(".site-header")
        .evaluate((el) => el.getBoundingClientRect().top),
      0,
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `artifacts/${key}-detail-desktop.png`,
      fullPage: true,
    });
  }
  for (const width of [1440, 1000, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const key of activityKeys) {
      await page.goto(`${base}/${key}`, { waitUntil: "networkidle" });
      await noOverflow(`${key} overflow at ${width}`);
      await page.getByRole("link", { name: "Rencanakan kegiatan" }).click();
      await page.locator("#inquiry-name").waitFor({ state: "visible" });
      if (width <= 820) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page
          .getByRole("button", { name: "Buka menu", exact: true })
          .click();
        assert.equal(
          await page.locator("#activity-navigation").isVisible(),
          true,
        );
        assert.equal(await page.locator("#activity-navigation a").count(), 6);
        await page
          .getByRole("button", { name: "Tutup menu", exact: true })
          .click();
      }
      if (width === 390) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({
          path: `artifacts/${key}-detail-mobile.png`,
          fullPage: true,
        });
      }
    }
    await page.goto(base, { waitUntil: "networkidle" });
    await noOverflow(`Home activity cards overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/admin/activities", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Snorkeling", exact: true }).click();
  await page
    .getByLabel("Judul halaman", { exact: true })
    .fill("Snorkeling bersama keluarga — uji CMS");
  await page
    .getByLabel("Ringkasan untuk hero & kartu beranda", { exact: true })
    .fill("Ringkasan snorkeling tersimpan dari CMS.");
  await page
    .getByLabel("Harga mulai per orang", { exact: false })
    .fill("450000");
  await page
    .getByLabel("Durasi", { exact: true })
    .fill("Setengah hari · contoh uji");
  await page
    .getByLabel("Titik temu", { exact: true })
    .fill("Titik temu contoh dari CMS");
  await page
    .getByLabel("Pilih dari media atau aset website", { exact: true })
    .selectOption("/assets/ocean.webp");
  await page
    .getByLabel("Deskripsi foto / caption", { exact: true })
    .fill("Caption konsep yang diedit dari CMS");
  await page
    .getByLabel("Judul langkah 1", { exact: true })
    .fill("Briefing snorkeling dari CMS");
  await page
    .getByLabel("Pertanyaan 1", { exact: true })
    .fill("FAQ snorkeling dari CMS?");
  await page
    .getByLabel("Jawaban 1", { exact: true })
    .fill("Jawaban snorkeling tersimpan.");
  await page
    .getByRole("button", { name: "Simpan halaman aktivitas", exact: true })
    .click();
  await page
    .getByText("Perubahan sudah tersimpan dan tampil di website.", {
      exact: true,
    })
    .waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Snorkeling", exact: true }).click();
  assert.equal(
    await page.getByLabel("Judul halaman", { exact: true }).inputValue(),
    "Snorkeling bersama keluarga — uji CMS",
  );
  await page.screenshot({
    path: "artifacts/admin-activities.png",
    fullPage: true,
  });
  await page.goto(base + "/snorkeling", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Snorkeling bersama keluarga — uji CMS",
  );
  assert.match(
    await page.locator(".activity-price strong").textContent(),
    /450\.000/,
  );
  assert.ok(
    (await page.locator(".activity-facts").textContent()).includes(
      "Setengah hari · contoh uji",
    ),
  );
  assert.equal(
    await page.locator(".activity-hero-photo").getAttribute("src"),
    "/assets/ocean.webp",
  );
  assert.equal(
    await page.locator(".activity-timeline h3").first().textContent(),
    "Briefing snorkeling dari CMS",
  );
  await page.locator(".activity-faqs summary").first().click();
  assert.equal(
    await page
      .locator(".activity-faqs details")
      .first()
      .locator("p")
      .textContent(),
    "Jawaban snorkeling tersimpan.",
  );
  await page.goto(base, { waitUntil: "networkidle" });
  assert.ok(
    (
      await page.locator('#activities a[href="/snorkeling"]').textContent()
    ).includes("Ringkasan snorkeling tersimpan dari CMS."),
  );
  let current = await state();
  assert.deepEqual(
    current.bookings,
    originals.bookings,
    "Existing reservations are preserved",
  );
  assert.deepEqual(
    current.content.shop,
    originals.content.shop,
    "Existing shop is preserved",
  );
  assert.deepEqual(
    current.content.contact,
    originals.content.contact,
    "Existing contact settings are preserved",
  );
  const invalid = structuredClone(current.content);
  invalid.activities.diving.image = "javascript:alert(1)";
  assert.equal((await save(invalid, current.version)).status(), 400);
  current.content.activities.trip.enabled = false;
  assert.equal((await save(current.content, current.version)).status(), 200);
  assert.equal((await api.get(base + "/trip")).status(), 404);
  assert.equal((await api.get(base + "/not-an-activity")).status(), 404);
  for (const path of ["/", "/diving", "/dive-shop"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator('a[href="/trip"]').count(),
      0,
      "Disabled page is hidden across public links",
    );
  }
  current = await state();
  for (const key of activityKeys)
    current.content.activities[key].enabled = false;
  assert.equal((await save(current.content, current.version)).status(), 200);
  for (const path of ["/", "/dive-shop"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator('a[href$="#activities"]').count(),
      0,
      "No broken activity anchors when every page is disabled",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: three detail pages, home/footer links, WhatsApp inquiry details and stale message clearing, FAQs, sticky/transparent headers, five responsive widths, live CMS content/image/price changes, legacy content preservation, validation and disabled-page 404. No external messages sent.",
  );
} finally {
  try {
    if (originals.content) {
      const current = await state();
      assert.equal(
        (await save(originals.content, current.version)).status(),
        200,
      );
    }
  } finally {
    await browser.close();
  }
}
