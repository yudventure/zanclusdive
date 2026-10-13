import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Travel agent calendars, with agent calendars served from a local stand-in.
// Start the demo server on a fresh data folder with:
// CMS_MODE=demo CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// AGENT_CALENDAR_ALLOW_LOCAL=true npm start
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const port = Number(process.env.AGENT_MOCK_PORT || 3498);
const mockBase = `http://127.0.0.1:${port}`;

const day = 86400000;
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const plus = (n) =>
  new Date(Date.parse(today + "T00:00:00Z") + n * day)
    .toISOString()
    .slice(0, 10);
const compact = (date) => date.replaceAll("-", "");
const ics = (events) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    ...events.flatMap(([uid, start, end, summary]) => [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${compact(start)}`,
      `DTEND;VALUE=DATE:${compact(plus(1 + (Date.parse(end) - Date.parse(today)) / day))}`,
      `SUMMARY:${summary}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
const calendars = {
  "/papua.ics": ics([["trip-1@google.com", today, today, "Grup Budi 8 orang"]]),
};
const mock = createServer((req, res) => {
  if (req.url === "/moved") {
    res.writeHead(302, { Location: "/papua.ics" });
    return res.end();
  }
  if (calendars[req.url]) {
    res.writeHead(200, { "Content-Type": "text/calendar" });
    return res.end(calendars[req.url]);
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<!doctype html><title>Not a calendar</title>");
});
await new Promise((resolve) => mock.listen(port, "127.0.0.1", resolve));

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const admin = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const a = await admin.newPage();
a.on("dialog", (dialog) => dialog.accept());
const errors = [];
a.on("pageerror", (error) => errors.push(error.message));
const guest = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const p = await guest.newPage();
p.on("pageerror", (error) => errors.push(error.message));
const state = async () =>
  (await admin.request.get(base + "/api/admin/state")).json();
const agent = async (name) =>
  (await state()).agents.find((item) => item.name === name);
const feed = async (token) => {
  const response = await guest.request.get(`${base}/api/calendar/${token}.ics`);
  return { status: response.status(), response, text: await response.text() };
};
const card = (name) =>
  a.locator(".admin-agent", { has: a.getByRole("heading", { name }) });
async function addAgent(name, contact, url, share = true) {
  const form = a.locator(".admin-agent-new");
  await form.getByLabel("Nama agen", { exact: true }).fill(name);
  await form.getByLabel("Kontak (WhatsApp / email)").fill(contact);
  await form.getByLabel("Link kalender agen (opsional)").fill(url);
  if (!share) await form.locator(".admin-dev-choice").click();
  await form.getByRole("button", { name: "Tambah agen" }).click();
  await a
    .getByText("Agen ditambahkan. Kirim halaman partner ke agen.")
    .waitFor();
  await card(name).waitFor();
}

try {
  assert.equal(
    (
      await admin.request.post(base + "/api/admin/login", {
        headers: { Origin: base },
        data: demoAccount,
      })
    ).status(),
    200,
  );
  // A guest booking and a closed day in the Zanclus schedule.
  for (const booking of [
    {
      experience: "diving",
      status: "confirmed",
      source: "whatsapp",
      startDate: plus(2),
      endDate: plus(2),
      guestName: "Rahasia Tamu",
      phone: "+62811112222",
      participants: 4,
      amount: 4800000,
    },
    {
      experience: "trip",
      status: "closed",
      source: "walkin",
      startDate: plus(4),
      endDate: plus(5),
      guestName: "",
      participants: 1,
      amount: 0,
    },
  ])
    assert.equal(
      (
        await admin.request.post(base + "/api/admin/bookings", {
          headers: { Origin: base },
          data: booking,
        })
      ).status(),
      201,
    );

  // Two agents: one links their Google calendar, one does not yet.
  await a.goto(base + "/admin/agents", { waitUntil: "networkidle" });
  await a
    .getByRole("heading", { name: "Kalender bersama travel agent" })
    .waitFor();
  assert.match(await a.locator("main").textContent(), /Belum ada agen/);
  await addAgent("Papua Travel", "+62 812 0000 1111", `${mockBase}/papua.ics`);
  await addAgent("Sorong Tours", "sorong@example.com", "");
  const papua = card("Papua Travel");
  // Read right away: the agent's trip is listed.
  assert.match(
    await papua.locator(".admin-agent-sync.ok").textContent(),
    /Terakhir dibaca .* WIT · 1 acara/,
  );
  assert.match(
    await papua.locator(".admin-agent-events").textContent(),
    /Grup Budi 8 orang/,
  );
  assert.match(
    await card("Sorong Tours")
      .locator(".admin-agent-block")
      .nth(1)
      .textContent(),
    /Alamat rahasia dalam format iCal/,
  );
  const sorong = await agent("Sorong Tours");
  const papuaAgent = await agent("Papua Travel");
  assert.ok(sorong.token.length >= 32);
  assert.match(
    await card("Sorong Tours").locator(".admin-pay-copy").nth(1).textContent(),
    new RegExp(`/api/calendar/${sorong.token}\\.ics`),
  );

  // Sorong's feed: the Zanclus schedule without guest details, and
  // Papua Travel's busy day.
  let result = await feed(sorong.token);
  assert.equal(result.status, 200);
  assert.match(result.response.headers()["content-type"], /^text\/calendar/);
  assert.match(result.text, /X-WR-CALNAME:Zanclus Dive Center · Sorong Tours/);
  assert.match(result.text, /SUMMARY:Zanclus · Diving · 4 tamu\r\n/);
  assert.match(
    result.text,
    new RegExp(`DTSTART;VALUE=DATE:${compact(plus(2))}`),
  );
  assert.match(result.text, /SUMMARY:Zanclus tutup · Trip/);
  assert.match(
    result.text,
    new RegExp(
      `DTSTART;VALUE=DATE:${compact(plus(4))}\\r\\nDTEND;VALUE=DATE:${compact(plus(6))}`,
    ),
  );
  assert.match(result.text, /SUMMARY:Papua Travel · terisi/);
  assert.doesNotMatch(result.text, /Rahasia|62811112222|Grup Budi/);
  // Papua's own feed does not repeat their own trip.
  result = await feed(papuaAgent.token);
  assert.equal(result.status, 200);
  assert.doesNotMatch(result.text, /Papua Travel · terisi/);
  assert.equal((await feed("x".repeat(32))).status, 404);

  // The partner page: one-click Google Calendar, Apple/Outlook and the list.
  await p.goto(`${base}/partner/${sorong.token}`, { waitUntil: "networkidle" });
  assert.equal(
    await p.locator("h1").textContent(),
    "Halo Sorong Tours, kalender kita tersambung.",
  );
  const google = await p
    .getByRole("link", { name: /Tambahkan ke Google Calendar/ })
    .getAttribute("href");
  assert.equal(
    google,
    "https://calendar.google.com/calendar/r?cid=" +
      encodeURIComponent(
        `webcal://${new URL(base).host}/api/calendar/${sorong.token}.ics`,
      ),
  );
  assert.equal(
    await p
      .getByRole("link", { name: "Apple Calendar / Outlook" })
      .getAttribute("href"),
    `webcal://${new URL(base).host}/api/calendar/${sorong.token}.ics`,
  );
  const upcoming = await p.locator(".partner-events").textContent();
  assert.match(upcoming, /Papua Travel · terisi/);
  assert.match(upcoming, /Zanclus · Diving · 4 tamu/);
  assert.match(upcoming, /Zanclus tutup · Trip/);
  assert.doesNotMatch(upcoming, /Rahasia/);
  assert.match(
    await p.locator(".partner-grid").textContent(),
    /Belum tersambung/,
  );
  assert.equal(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  if (process.env.SHOT_DIR)
    await p.screenshot({
      path: process.env.SHOT_DIR + "/partner-mobile.png",
      fullPage: true,
    });
  await p.goto(`${base}/partner/${papuaAgent.token}?lang=en`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await p.locator("h1").textContent(),
    "Hi Papua Travel, our calendars are linked.",
  );
  assert.match(
    await p.locator(".partner-ok").textContent(),
    /Linked\. Last read .* WIT, 1 upcoming events\./,
  );
  assert.equal(
    (await p.goto(`${base}/partner/${"y".repeat(32)}`)).status(),
    404,
  );

  // The agent's trip shows in the admin reservation calendar.
  await a.goto(base + "/admin/calendar", { waitUntil: "networkidle" });
  const chip = a.locator(".calendar-agents td.today .calendar-agent");
  assert.equal(await chip.textContent(), "Papua Travel");
  assert.equal(
    await chip.getAttribute("title"),
    "Papua Travel: Grup Budi 8 orang",
  );
  if (process.env.SHOT_DIR)
    await a.locator(".calendar-agents").screenshot({
      path: process.env.SHOT_DIR + "/agents-calendar-row.png",
    });

  // Papua stops sharing: Sorong no longer sees their busy day.
  await a.goto(base + "/admin/agents", { waitUntil: "networkidle" });
  await papua.locator(".admin-dev-choice").click();
  await papua.getByRole("button", { name: "Simpan" }).click();
  await a.getByText("Data agen tersimpan.").waitFor();
  assert.equal((await agent("Papua Travel")).share, false);
  assert.doesNotMatch((await feed(sorong.token)).text, /Papua Travel/);

  // A new calendar address through a redirect is read again; a link that
  // is not a calendar shows why.
  await papua
    .getByLabel("Link kalender agen (opsional)")
    .fill(`${mockBase}/moved`);
  await papua.getByRole("button", { name: "Simpan" }).click();
  await a.getByText("Data agen tersimpan.").waitFor();
  assert.match(
    await papua.locator(".admin-agent-sync.ok").textContent(),
    /1 acara/,
  );
  calendars["/papua.ics"] = ics([
    ["trip-1@google.com", today, today, "Grup Budi 8 orang"],
    ["trip-2@google.com", plus(1), plus(3), "Liveaboard 3 hari"],
  ]);
  await papua.getByRole("button", { name: "Baca kalender sekarang" }).click();
  await a.getByText("Kalender agen dibaca ulang.").waitFor();
  assert.match(
    await papua.locator(".admin-agent-events").textContent(),
    /Liveaboard 3 hari/,
  );
  await papua
    .getByLabel("Link kalender agen (opsional)")
    .fill(`${mockBase}/page`);
  await papua.getByRole("button", { name: "Simpan" }).click();
  await a.getByText("Data agen tersimpan.").waitFor();
  assert.match(
    await papua.locator(".admin-agent-sync.warn").textContent(),
    /Belum terbaca: Link ini bukan kalender \.ics\./,
  );
  await papua
    .getByLabel("Link kalender agen (opsional)")
    .fill("ftp://example.com/cal.ics");
  await papua.getByRole("button", { name: "Simpan" }).click();
  await a
    .getByText("Link kalender agen harus berupa alamat https://.")
    .waitFor();
  if (process.env.SHOT_DIR)
    await a.screenshot({
      path: process.env.SHOT_DIR + "/agents-admin.png",
      fullPage: true,
    });

  // A new link for Sorong: the old one stops working at once.
  await card("Sorong Tours")
    .getByRole("button", { name: "Buat link baru" })
    .click();
  await a.getByText("Link baru dibuat. Kirim ulang ke agen.").waitFor();
  const renewed = await agent("Sorong Tours");
  assert.notEqual(renewed.token, sorong.token);
  assert.equal((await feed(sorong.token)).status, 404);
  assert.equal((await feed(renewed.token)).status, 200);
  // Switched off, the feed and the partner page close.
  await card("Sorong Tours")
    .getByRole("button", { name: "Nonaktifkan" })
    .click();
  await a.getByText("Agen dinonaktifkan.").waitFor();
  assert.equal((await feed(renewed.token)).status, 404);
  assert.equal(
    (await p.goto(`${base}/partner/${renewed.token}`)).status(),
    404,
  );
  await card("Sorong Tours").getByRole("button", { name: "Aktifkan" }).click();
  await a.getByText("Agen diaktifkan.").waitFor();
  assert.equal((await feed(renewed.token)).status, 200);
  // Deleted, it is gone for good.
  await papua.getByRole("button", { name: "Hapus" }).click();
  await a.getByText("Agen dihapus.").waitFor();
  assert.equal(await papua.count(), 0);
  assert.equal(await agent("Papua Travel"), undefined);
  assert.equal((await feed(papuaAgent.token)).status, 404);
  // Only the admin may manage agents.
  assert.equal(
    (await guest.request.get(base + "/api/admin/agents")).status(),
    401,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS agents: add agents with or without their calendar, read at once, Zanclus feed per agent with bookings as guest counts, closed days and shared agent busy days but no names or numbers, own trips not repeated, partner page with Google Calendar and webcal links and the next 60 days (id/en, no sideways scroll), agent trips in the admin calendar, sharing switch, redirects followed, non-calendar and non-https links refused, new link revokes the old one, disable and delete close the feed, admin only.",
  );
} finally {
  await browser.close();
  mock.close();
}
