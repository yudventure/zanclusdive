// The reservation calendar's day panel: everyone out on the day picked by
// activity, the rental gear and who rents it, a booking noted from the
// panel, and the header menus closing on a tap anywhere else. Run against
// a demo server started with CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const plus = (n) =>
  new Date(Date.parse(today + "T00:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);
// A day about three months ahead, clear of the demo's sample bookings,
// and how many months the calendar moves to show it.
const day = plus(95);
const monthsAhead =
  (Number(day.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
  Number(day.slice(5, 7)) -
  Number(today.slice(5, 7));
const toMonth = async () => {
  for (let n = 0; n < monthsAhead; n++)
    await page.getByRole("button", { name: "Bulan berikut" }).click();
};
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const api = (path, method = "GET", data) =>
  context.request.fetch(base + path, {
    method,
    headers: { Origin: base },
    ...(data ? { data } : {}),
  });
const book = (patch) =>
  api("/api/admin/bookings", "POST", {
    status: "confirmed",
    source: "whatsapp",
    phone: "",
    amount: 0,
    notes: "",
    email: "",
    lang: "id",
    startDate: day,
    endDate: day,
    participants: 1,
    ...patch,
  });

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  for (const patch of [
    {
      experience: "diving",
      guestName: "Grup Jakarta",
      participants: 12,
      startDate: plus(94),
      endDate: plus(97),
      phone: "0812 3456 7890",
    },
    { experience: "snorkeling", guestName: "Keluarga Budi", participants: 4 },
    {
      experience: "shop",
      guestName: "Tamu Datang",
      gear: [{ product: "sewa-masker", quantity: 2 }],
    },
    {
      experience: "trip",
      guestName: "Rombongan Sorong",
      status: "pending",
      participants: 9,
    },
    { experience: "diving", guestName: "Batal", status: "cancelled" },
  ])
    assert.equal((await book(patch)).status(), 201);

  // The header menus close on a tap anywhere else, or on Escape.
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const popover = page.locator(".admin-popover");
  await page.getByRole("button", { name: "Akun" }).click();
  assert.equal(await popover.count(), 1);
  await page.mouse.click(720, 640);
  assert.equal(await popover.count(), 0);
  await page.getByRole("button", { name: "Notifikasi reservasi" }).click();
  assert.match(await popover.textContent(), /Perlu konfirmasi/);
  // Opening the other one closes it.
  await page.getByRole("button", { name: "Akun" }).click();
  assert.equal(await popover.count(), 1);
  assert.match(await popover.textContent(), /Keluar dari admin/);
  await page.keyboard.press("Escape");
  assert.equal(await popover.count(), 0);

  // The panel opens on today; a tap on another day opens that one.
  const side = page.locator(".admin-day-side");
  assert.match(await side.textContent(), /^Agenda/);
  await toMonth();
  const cell = page.locator(`.admin-month-day[data-date="${day}"]`);
  assert.equal(
    await cell.locator(".admin-month-people").getAttribute("title"),
    "26 orang",
  );
  await cell.click({ position: { x: 40, y: 90 } });
  assert.match(await side.locator("h2").textContent(), /\d{4}$/);
  assert.equal(
    await side.locator(".admin-day-head .admin-subtle").textContent(),
    "4 reservasi, 26 orang",
  );
  const group = (name) => side.getByRole("region", { name });
  assert.deepEqual(
    await side.locator(".admin-day-group h3").allTextContents(),
    [
      "Diving1 reservasi, 12 orang",
      "Snorkeling1 reservasi, 4 orang",
      "Trip laut1 reservasi, 9 orang",
      "Dive Shop1 reservasi, 1 orang",
      "Sewa alat1 penyewa",
    ],
  );
  assert.match(
    await group("Diving").textContent(),
    /Grup Jakarta.*Dikonfirmasi.*12 orang, hari 2 dari 4, WhatsApp/,
  );
  assert.equal(
    await group("Diving")
      .getByRole("link", { name: "WhatsApp Grup Jakarta" })
      .getAttribute("href"),
    "https://wa.me/6281234567890",
  );
  assert.match(
    await group("Trip laut").textContent(),
    /Rombongan Sorong.*Belum dikonfirmasi/,
  );
  assert.match(
    await group("Sewa alat").textContent(),
    /Tamu Datang.*Masker × 2/,
  );
  assert.doesNotMatch(await side.textContent(), /Batal/);
  shots &&
    (await page
      .locator(".admin-calendar-layout")
      .screenshot({ path: `${shots}/92-kalender-agenda.png` }));

  // A booking noted from the panel.
  await side
    .getByRole("button", { name: "+ Catat booking tanggal ini" })
    .click();
  await side.getByLabel("Nama tamu atau grup").fill("Pak Andi");
  assert.equal(await side.getByLabel("Kegiatan").inputValue(), "diving");
  await side.getByLabel("Jumlah orang").fill("3");
  await side.getByLabel("Sampai tanggal").fill(plus(96));
  await side.getByLabel("WhatsApp (opsional)").fill("081299998888");
  await side.getByLabel("Catatan (opsional)").fill("Dari telepon");
  shots && (await side.screenshot({ path: `${shots}/93-catat-booking.png` }));
  await side.getByRole("button", { name: "Simpan booking" }).click();
  await page
    .locator(".admin-success", { hasText: "Booking Pak Andi tersimpan." })
    .waitFor();
  assert.match(
    await group("Diving").textContent(),
    /Diving2 reservasi, 15 orang.*Pak Andi/,
  );
  const saved = (await (await api("/api/admin/state")).json()).bookings.find(
    (b) => b.guestName === "Pak Andi",
  );
  assert.deepEqual(
    [
      saved.experience,
      saved.status,
      saved.source,
      saved.startDate,
      saved.endDate,
      saved.participants,
      saved.phone,
      saved.notes,
    ],
    [
      "diving",
      "confirmed",
      "whatsapp",
      day,
      plus(96),
      3,
      "081299998888",
      "Dari telepon",
    ],
  );
  // A tap on a person opens the reservation in the full form.
  await group("Snorkeling")
    .getByRole("button", { name: "Keluarga Budi" })
    .click();
  const form = page.locator("#booking-editor");
  assert.equal(
    await form.locator("h2").textContent(),
    "Ubah reservasi Keluarga Budi",
  );
  assert.equal(await form.getByLabel("Jumlah peserta").inputValue(), "4");
  assert.deepEqual(await form.locator("legend").allTextContents(), [
    "Kegiatan dan tanggal",
    "Tamu",
    "Nilai dan catatan",
    "Pembayaran & email tamu",
  ]);

  // Phones: the panel sits under the month and comes into view.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  await toMonth();
  await cell.locator(".admin-month-date").click();
  await page.waitForTimeout(900);
  const box = await side.boundingBox();
  assert.ok(box.y < 844 && box.y > -40, "the panel comes into view");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  shots && (await page.screenshot({ path: `${shots}/94-agenda-hp.png` }));
  assert.deepEqual(errors, []);
  console.log("The calendar's day panel and quick booking verified.");
} finally {
  await browser.close();
}
