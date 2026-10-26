// A schedule pasted from WhatsApp into the reservation calendar: read line
// by line, checked, saved at once, and not saved twice. Run against a demo
// server started with CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { demoAccount } from "../src/demo-data.js";
import { readSchedule, scheduleDates } from "../src/schedule-paste.js";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const shots = process.env.SHOT_DIR;
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
// The owner's schedule, as written on WhatsApp.
const pasted = `29 Okt sd 01 Nov (12 Divers)
15-19 Nov (2 Divers)
30 nov - 05 des (2 Divers)
21 sd 25 Nov (13 Divers)
27 Des sd 01 Des (2 Divers)
besok pagi`;
const expected = readSchedule(pasted, today).filter((row) => !row.error);
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

try {
  assert.equal(
    (await api("/api/admin/login", "POST", demoAccount)).status(),
    200,
  );
  const before = (await (await api("/api/admin/state")).json()).bookings;
  await page.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const panel = page.locator(".admin-paste");
  await panel.getByLabel("Jadwal yang ditempel").fill(pasted);
  const rows = panel.locator(".admin-paste-rows > li");
  assert.equal(await rows.count(), 6);
  // Each trip with its dates and size, the last line said to be unread.
  assert.deepEqual(
    await rows.locator(".admin-paste-check strong").allTextContents(),
    expected.map((row) => scheduleDates(row.startDate, row.endDate)),
  );
  assert.equal(
    await panel.getByLabel("Peserta baris 4").inputValue(),
    String(expected[3].participants),
  );
  assert.match(
    await rows.nth(5).textContent(),
    /besok pagi.*Tanggal belum terbaca\. Baris ini dilewati\./,
  );
  // The end before the start is read as the next month, and said so.
  assert.match(await rows.nth(4).textContent(), /Periksa lagi\./);
  await panel.getByLabel("Nama grup baris 1").fill("Grup Jakarta");
  assert.equal(
    await panel.getByLabel("Status untuk semua").inputValue(),
    "confirmed",
  );
  shots && (await panel.screenshot({ path: `${shots}/90-tempel-jadwal.png` }));
  await panel.getByRole("button", { name: "Simpan 5 reservasi" }).click();
  await page.getByText("5 reservasi dari jadwal tersimpan.").waitFor();
  assert.equal(await rows.count(), 0);
  const after = (await (await api("/api/admin/state")).json()).bookings;
  const added = after.filter((b) => !before.some((o) => o.id === b.id));
  assert.deepEqual(
    added
      .map((b) => [
        b.startDate,
        b.endDate,
        b.participants,
        b.experience,
        b.status,
        b.source,
      ])
      .sort(),
    expected
      .map((row) => [
        row.startDate,
        row.endDate,
        row.participants,
        "diving",
        "confirmed",
        "whatsapp",
      ])
      .sort(),
  );
  assert.ok(added.some((b) => b.guestName === "Grup Jakarta"));
  assert.ok(
    added.every((b) => b.notes.startsWith("Dari jadwal yang ditempel.")),
  );
  // Pasting the same schedule again adds nothing.
  await panel.getByLabel("Jadwal yang ditempel").fill(pasted);
  assert.equal(await panel.locator(".admin-paste-rows > li.is-off").count(), 5);
  assert.ok(
    await panel
      .getByRole("button", { name: "Simpan 0 reservasi" })
      .isDisabled(),
  );
  // Phones: the panel fits the screen.
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  shots &&
    (await panel.screenshot({ path: `${shots}/91-tempel-jadwal-hp.png` }));
  assert.deepEqual(errors, []);
  console.log("A pasted schedule becomes reservations, once.");
} finally {
  await browser.close();
}
