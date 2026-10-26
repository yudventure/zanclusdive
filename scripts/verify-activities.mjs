import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { activityKeys, activityLabels } from "../src/activity-model.js";
import { demoAccount } from "../src/demo-data.js";
import { addOnItems } from "../src/price-list.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3190";
// The Indonesian website (/id); English is served at the root.
const site = base + "/id";
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
  await page.goto(site, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#experiences .course-card").count(), 3);
  assert.equal(
    await page.locator(".activity-discovery").count(),
    0,
    "No added activity section on the home page",
  );
  assert.equal(await page.locator("#activities").count(), 0);
  assert.equal(
    await page.locator('.experience-item [data-activity="diving"]').count(),
    1,
  );
  assert.equal(await page.locator(".experience-row#prices").count(), 1);
  for (const key of activityKeys) {
    const homeLink = page.locator(`#experiences a[href="/id/${key}"]`);
    assert.equal(
      await homeLink.locator("h3").textContent(),
      activityLabels[key],
    );
    assert.equal(
      await page
        .getByRole("contentinfo")
        .locator(`a[href="/id/${key}"]`)
        .count(),
      1,
    );
  }
  await page
    .locator("#experiences")
    .screenshot({ path: "artifacts/experiences-cards-desktop.png" });
  await page.locator('#experiences a[href="/id/snorkeling"]').click();
  await page.waitForURL(site + "/snorkeling");
  for (const key of activityKeys) {
    await page.goto(`${site}/${key}`, { waitUntil: "networkidle" });
    const activity = originals.content.activities[key];
    assert.equal(await page.locator("h1").textContent(), activity.title);
    assert.ok((await page.title()).includes(activityLabels[key]));
    // A clear package and cost card instead of "request a quote".
    const packages = originals.content.priceList[key].filter(
      (item) => item.price > 0,
    );
    assert.equal(await page.locator(".activity-price").count(), 0);
    // Packages go into a cart from the price cards or the panel.
    assert.equal(
      await page.locator(".plan-package legend").textContent(),
      "Paket dipilih",
    );
    assert.equal(
      await page.locator(".activity-prices .shop-item-add").count(),
      packages.length,
    );
    assert.equal(
      await page.locator(".plan-add option").count(),
      packages.length + 1,
    );
    // Gear, cameras and services from the other lists are add-ons, after
    // the main packages. Diving offers them by default.
    const addOns = addOnItems(
      originals.content.priceList,
      key,
      originals.content.shop.products,
    );
    assert.equal(addOns.length, key === "diving" ? 7 : 0);
    assert.equal(
      await page.locator(".activity-addon-list li").count(),
      addOns.length,
    );
    assert.equal(
      await page.locator(".plan-addons button").count(),
      addOns.length,
    );
    if (key === "diving") {
      assert.deepEqual(
        packages.map((item) => item.name.id),
        [
          "Discovery Dive",
          "Pemandu selam",
          "Fun Dive Pesisir Waigeo",
          "Fun Dive Kri, Mansuar & Arborek",
          "Fun Dive Piaynemo",
        ],
      );
      // The fun dives are priced per diver and follow the participants.
      assert.deepEqual(
        packages.slice(2).map((item) => [item.price, item.unit.id]),
        [
          [2100000, "/ penyelam"],
          [2700000, "/ penyelam"],
          [4000000, "/ penyelam"],
        ],
      );
      assert.equal(
        await page.locator("#add-ons-title").textContent(),
        "Add-on diving",
      );
      // The seventh add-on is alone on its row and takes all of it.
      const [list, last] = await Promise.all([
        page.locator(".activity-addon-list").boundingBox(),
        page.locator(".activity-addon-list li").last().boundingBox(),
      ]);
      assert.ok(Math.abs(list.width - last.width) < 2, "lone add-on full row");
    }
    // The cart bar appears with the first package; the old side panel is
    // gone and checkout opens in a window.
    assert.equal(await page.locator(".activity-cart-bar").count(), 0);
    assert.equal(await page.locator(".activity-inquiry").count(), 0);
    assert.equal(await page.locator(".activity-checkout[open]").count(), 0);
    // The side calendar shows the places left each day.
    const slotCalendar = page.locator(".slot-calendar");
    assert.equal(await slotCalendar.isVisible(), true);
    assert.equal(
      await slotCalendar.locator("h2").textContent(),
      `Pilih tanggal ${activityLabels[key].toLowerCase()}.`,
    );
    const capacity = activity.capacity ?? (key === "diving" ? 30 : 0);
    if (capacity)
      assert.match(
        await slotCalendar.locator(".slot-intro").textContent(),
        new RegExp(`maksimal ${capacity} orang`),
      );
    assert.equal(
      await slotCalendar.locator(".slot-seasons").count(),
      key === "diving" ? 1 : 0,
    );
    assert.match(
      await page.locator(".pay-total").textContent(),
      /^Perkiraan biaya/,
    );
    assert.deepEqual(await page.locator(".plan-steps li").allTextContents(), [
      "1Isi data",
      "2Ringkasan",
      "3WhatsApp",
    ]);
    assert.equal(
      await page
        .locator(".activity-hero-photo")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    assert.equal(
      await page.locator(".activity-steps li").count(),
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
    // A package from its price card, after the header checks above.
    await page
      .getByRole("button", {
        name: `Tambahkan ${packages[0].name.id} ke keranjang`,
      })
      .click();
    assert.match(
      await page.locator(".activity-cart-bar").textContent(),
      /Keranjang · 1 paket/,
    );
    assert.equal(await page.locator(".plan-cart li").count(), 1);
    if (key === "diving") {
      await page
        .locator(".activity-addon-list")
        .getByRole("button", { name: "Tambahkan Dokumentasi ke keranjang" })
        .click();
      assert.match(
        await page.locator(".activity-cart-bar").textContent(),
        /Keranjang · 1 paket \+ 1 add-on/,
      );
      assert.equal(await page.locator(".plan-cart li.is-addon").count(), 1);
      assert.equal(
        await page.locator(".plan-addons button").count(),
        addOns.length - 1,
      );
    }
    // A day picked in the calendar is the checkout date. Late in a month
    // the ninth open day is in the next one.
    const open = slotCalendar.locator(".slot-day:not([disabled])");
    if ((await open.count()) < 9)
      await slotCalendar
        .getByRole("button", { name: "Bulan berikutnya" })
        .click();
    const day = open.nth(8);
    const date = await day.getAttribute("data-date");
    await day.click();
    assert.equal(await day.getAttribute("aria-pressed"), "true");
    if (capacity)
      assert.match(
        await slotCalendar.locator(".slot-picked").textContent(),
        new RegExp(`dari ${capacity} slot tersisa`),
      );
    await slotCalendar
      .getByRole("button", { name: "Checkout untuk tanggal ini" })
      .click();
    const dialog = page.locator(".activity-checkout");
    await dialog.locator("#inquiry-name").waitFor({ state: "visible" });
    // The checkout shows the same day, with the places left on it.
    const checkoutDay = dialog.locator(
      `.plan-dates .slot-day[data-date="${date}"]`,
    );
    assert.equal(await checkoutDay.getAttribute("aria-pressed"), "true");
    assert.match(
      await dialog.locator(".plan-dates .slot-note").textContent(),
      capacity ? new RegExp(`dari ${capacity} slot tersisa`) : /dipilih\.$/,
    );
    // The first field still to fill has the focus.
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "inquiry-name",
    );
    await page.getByLabel("Nama kamu").fill("Tamu Uji Aktivitas");
    // Required fields are marked; WhatsApp is checked before the message.
    assert.equal(
      await page.locator(".activity-form .form-required").count(),
      4,
    );
    await page.getByLabel("Jumlah peserta").fill("3");
    await page.getByRole("button", { name: "Lanjut ke ringkasan" }).click();
    assert.match(
      await page.locator(".activity-error").textContent(),
      /nomor WhatsApp/,
    );
    await page.getByLabel("Nomor WhatsApp").fill("+62 812 3456 7890");
    await page.getByLabel("Email", { exact: false }).fill("tamu@example.com");
    await page.getByLabel("Jumlah peserta").fill("3");
    await page
      .getByLabel("Ceritakan rencanamu", { exact: false })
      .fill("Perlu fins ukuran M");
    await page.getByRole("button", { name: "Lanjut ke ringkasan" }).click();
    assert.equal(
      await page.locator("#plan-summary-title").textContent(),
      "Ringkasan rencana",
    );
    assert.match(
      await page.locator(".plan-summary-list").textContent(),
      /Tamu Uji Aktivitas[\s\S]*\+62 812 3456 7890[\s\S]*Perlu fins ukuran M/,
    );
    if (key === "diving")
      assert.match(
        await page.locator(".plan-summary-list").textContent(),
        /PaketDiscovery Dive × 3 orangAdd-onDokumentasi × 1 hari/,
      );
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
      ...(key === "diving" ? ["Dokumentasi (Add-on) × 1"] : []),
      "WhatsApp: +62 812 3456 7890",
      "Email: tamu@example.com",
      "belum menjadi reservasi",
      `Paket: ${packages[0].name.id} × `,
      "Perkiraan biaya: Rp",
    ])
      assert.ok(message.includes(value), value);
    // Editing keeps the details and the summary follows the change.
    await page.getByRole("button", { name: "← Ubah data" }).click();
    assert.equal(
      await page.getByLabel("Nama kamu").inputValue(),
      "Tamu Uji Aktivitas",
    );
    await page.getByLabel("Jumlah peserta").fill("4");
    await page.getByRole("button", { name: "Lanjut ke ringkasan" }).click();
    assert.match(
      await page.locator(".plan-summary-list").textContent(),
      /Peserta4 orang/,
    );
    await page.getByRole("button", { name: "← Ubah data" }).click();
    await page.screenshot({ path: `artifacts/${key}-checkout-desktop.png` });
    await page.getByRole("button", { name: "Tutup checkout" }).click();
    assert.equal(await page.locator(".activity-checkout[open]").count(), 0);
    // The cart bar opens the same checkout, with what was typed.
    await page
      .locator(".activity-cart-bar")
      .getByRole("button", { name: "Checkout" })
      .click();
    assert.equal(
      await page.getByLabel("Nama kamu").inputValue(),
      "Tamu Uji Aktivitas",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".activity-checkout[open]").count(), 0);
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
      await page.goto(`${site}/${key}`, { waitUntil: "networkidle" });
      await noOverflow(`${key} overflow at ${width}`);
      await page.locator(".slot-calendar").scrollIntoViewIfNeeded();
      assert.equal(await page.locator(".slot-calendar").isVisible(), true);
      // The checkout window fits the screen.
      await page.locator(".activity-prices .shop-item-add").first().click();
      await page
        .locator(".activity-cart-bar")
        .getByRole("button", { name: "Checkout" })
        .click();
      await page.locator("#inquiry-name").waitFor({ state: "visible" });
      const box = await page.locator(".activity-checkout").boundingBox();
      assert.ok(
        box.x >= 0 && box.x + box.width <= width,
        `${key} checkout fits at ${width}`,
      );
      if (width === 390)
        await page.screenshot({ path: `artifacts/${key}-checkout-mobile.png` });
      await page.getByRole("button", { name: "Tutup checkout" }).click();
      if (width <= 820) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page
          .getByRole("button", { name: "Buka menu", exact: true })
          .click();
        assert.equal(
          await page.locator("#activity-navigation").isVisible(),
          true,
        );
        // Seven main links, the activity pages and courses under
        // Experiences, and the catalog and gear service under Dive Shop.
        assert.equal(await page.locator("#activity-navigation a").count(), 13);
        assert.equal(
          await page
            .locator("#activity-navigation")
            .getByRole("link", { name: "Dive Shop", exact: true })
            .getAttribute("href"),
          "/id/dive-shop",
        );
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
    await page.goto(site, { waitUntil: "networkidle" });
    await noOverflow(`Home experience cards overflow at ${width}`);
    assert.equal(await page.locator(".activity-discovery").count(), 0);
    if (width === 390)
      await page
        .locator("#experiences")
        .screenshot({ path: "artifacts/experiences-cards-mobile.png" });
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
    .getByLabel("Atau pilih dari koleksi", { exact: true })
    .selectOption("/assets/photos/fan-beach.webp");
  await page
    .getByLabel("Atau pilih foto kartu dari koleksi", {
      exact: true,
    })
    .selectOption("/assets/reef.webp");
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
  // The year over the price lists: 2026 until the owner sets another.
  const kicker = async (path) => {
    await page.goto(base + path, { waitUntil: "networkidle" });
    return page.locator(".experience-item.is-open .price-kicker").textContent();
  };
  assert.equal(await kicker("/id"), "DAFTAR HARGA 2026");
  await page.goto(base + "/admin/prices", { waitUntil: "networkidle" });
  const yearField = page.getByLabel("Tahun di judul daftar harga");
  assert.equal(await yearField.inputValue(), "2026");
  await yearField.fill("2027");
  await page.getByRole("button", { name: "Simpan tahun" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  assert.equal((await state()).content.priceList.year, 2027);
  assert.equal(await kicker("/id"), "DAFTAR HARGA 2027");
  assert.equal(await kicker("/"), "PRICE LIST 2027");
  // Price lists: a service offered only as an add-on, added in Layanan
  // tambahan and ticked for diving; a camera rental ticked for snorkeling.
  await page.goto(base + "/admin/prices", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Layanan tambahan", exact: true })
    .click();
  assert.equal(await page.locator(".admin-addons").count(), 0);
  await page.getByRole("button", { name: "+ Tambah item" }).click();
  const fresh = page.locator(".admin-price-item").last();
  await fresh.getByLabel("Nama (Indonesia)").fill("Antar jemput mobil");
  await fresh.getByLabel("Name (English)").fill("Car pick-up");
  await fresh.getByLabel("Harga (Rp)").fill("250000");
  await fresh.getByLabel("Satuan (Indonesia)").fill("/ trip");
  await fresh.getByLabel("Unit (English)").fill("/ trip");
  await page.getByRole("button", { name: "Diving", exact: true }).click();
  const divingAddOns = page.locator(".admin-addons");
  assert.match(
    await divingAddOns.locator("h2").textContent(),
    /^Add-on Diving$/,
  );
  assert.equal(
    await divingAddOns.locator("input:checked").count(),
    7,
    "diving starts with its gear, cameras and documentation",
  );
  await divingAddOns
    .getByRole("checkbox", { name: /^Antar jemput mobil/ })
    .check();
  await page.getByRole("button", { name: "Simpan add-on" }).click();
  await page
    .getByText("Perubahan sudah tersimpan dan tampil di website.", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Snorkeling", exact: true }).click();
  await page
    .locator(".admin-addons")
    .getByRole("checkbox", { name: /^Kamera bawah air TG-5/ })
    .check();
  await page.getByRole("button", { name: "Simpan add-on" }).click();
  await page
    .getByText("Perubahan sudah tersimpan dan tampil di website.", {
      exact: true,
    })
    .waitFor();
  let priced = (await state()).content.priceList;
  const car = priced.extras.find(
    (item) => item.name.id === "Antar jemput mobil",
  );
  assert.match(car.id, /^extras-/);
  assert.equal(priced.addOns.diving.at(-1), car.id);
  // The camera is Dive Shop rental gear.
  assert.deepEqual(priced.addOns.snorkeling, [
    "shop:sewa-kamera-bawah-air-tg-5",
  ]);
  await page.setViewportSize({ width: 390, height: 900 });
  await noOverflow("admin add-ons at 390");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(site + "/diving", { waitUntil: "networkidle" });
  assert.match(
    await page.locator(".activity-addon-list li").last().textContent(),
    /Layanan Zanclus[\s\S]*Antar jemput mobil[\s\S]*Rp\s?250\.000/,
  );
  await page.goto(base + "/snorkeling", { waitUntil: "networkidle" });
  assert.equal(await page.textContent("#add-ons-title"), "Snorkeling add-ons");
  assert.match(
    await page.locator(".activity-addon-list").textContent(),
    /Rent an underwater camera[\s\S]*Underwater camera TG-5/,
  );
  // Deleting the item from its list drops it from the add-ons.
  await page.goto(base + "/admin/prices", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Layanan tambahan", exact: true })
    .click();
  await page
    .locator(".admin-price-item", {
      has: page.locator('input[value="Antar jemput mobil"]'),
    })
    .getByRole("button", { name: "Hapus" })
    .click();
  await page.getByRole("button", { name: "Simpan daftar harga" }).click();
  await page
    .getByText("Perubahan sudah tersimpan dan tampil di website.", {
      exact: true,
    })
    .waitFor();
  priced = (await state()).content.priceList;
  assert.ok(!priced.addOns.diving.includes(car.id));
  assert.equal(priced.addOns.diving.length, 7);
  await page.goto(site + "/snorkeling", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("h1").textContent(),
    "Snorkeling bersama keluarga — uji CMS",
  );
  assert.match(await (await api.get(site)).text(), /Rp\s?450\.000/);
  assert.ok(
    (await page.locator(".activity-hero-facts").textContent()).includes(
      "Setengah hari · contoh uji",
    ),
  );
  assert.equal(
    await page.locator(".activity-hero-photo").getAttribute("src"),
    "/assets/photos/fan-beach.webp",
  );
  assert.equal(
    await page.locator(".activity-steps h3").first().textContent(),
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
  await page.goto(site, { waitUntil: "networkidle" });
  assert.ok(
    (
      await page.locator('#experiences a[href="/id/snorkeling"]').textContent()
    ).includes("Ringkasan snorkeling tersimpan dari CMS."),
  );
  assert.match(
    await page
      .locator('#experiences [data-activity="snorkeling"]')
      .textContent(),
    /450\.000/,
  );
  assert.equal(
    await page
      .locator('#experiences [data-activity="snorkeling"] img')
      .getAttribute("src"),
    "/assets/reef.webp",
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
  assert.equal((await api.get(site + "/trip")).status(), 404);
  assert.equal((await api.get(base + "/not-an-activity")).status(), 404);
  for (const path of ["/", "/diving", "/dive-shop"]) {
    await page.goto(site + (path === "/" ? "" : path), {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page.locator('a[href="/id/trip"]:visible').count(),
      0,
      "Disabled page is hidden across public links",
    );
  }
  current = await state();
  current.content.activities.diving.enabled = false;
  assert.equal((await save(current.content, current.version)).status(), 200);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(site, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator('#experiences [data-activity="diving"]').isVisible(),
      false,
    );
    assert.equal(
      await page
        .locator('#experiences [data-activity="snorkeling"]')
        .isVisible(),
      true,
    );
    assert.equal(
      await page
        .locator(".experience-item.is-open .price-card h3")
        .textContent(),
      "Harga paket snorkeling",
      "Prices fall back to snorkeling when diving is disabled",
    );
    await noOverflow(`Hidden cards overflow at ${width}`);
  }
  current = await state();
  for (const key of activityKeys)
    current.content.activities[key].enabled = false;
  assert.equal((await save(current.content, current.version)).status(), 200);
  for (const path of ["/", "/dive-shop"]) {
    await page.goto(site + (path === "/" ? "" : path), {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page.locator('a[href$="#activities"]').count(),
      0,
      "No broken activity anchors when every page is disabled",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: three detail pages, side slot calendar and checkout window, home/footer links, WhatsApp inquiry details and stale message clearing, FAQs, sticky/transparent headers, five responsive widths, live CMS content/image/price changes, legacy content preservation, validation and disabled-page 404. No external messages sent.",
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
