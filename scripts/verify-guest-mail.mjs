import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { startMockSmtp } from "./mock-smtp.mjs";
import { startMockMidtrans } from "./mock-midtrans.mjs";

// Emails to guests: the order with its payment deadline from the website
// and from the admin (bank transfer and Midtrans link), the invoice once
// paid, the cancellation after the deadline, resending, previews and a
// refused SMTP login. Start the demo server as for verify-payments, plus
// SMTP_HOST=127.0.0.1 SMTP_PORT=3525 SMTP_SECURE=false
// SMTP_USER=web@zanclus.test SMTP_PASS=test ADMIN_OTP_EMAIL=pemilik@example.com.
// No email leaves this machine and nothing is sent to Midtrans.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const smtp = startMockSmtp({
  port: Number(process.env.SMTP_MOCK_PORT || 3525),
});
const midtrans = await startMockMidtrans({
  port: Number(process.env.MIDTRANS_MOCK_PORT || 3499),
  serverKey: "SB-Mid-server-TEST",
  appUrl: base,
});
const shots = process.env.SHOT_DIR || "artifacts";
const headers = { Origin: base };

// The message as the guest's mail program reads it: headers unfolded and
// decoded, quoted-printable bodies decoded.
function decodeWords(value) {
  return value.replace(/=\?utf-8\?([qb])\?([^?]*)\?=\s*/gi, (_, kind, text) =>
    kind.toLowerCase() === "b"
      ? Buffer.from(text, "base64").toString("utf8")
      : Buffer.from(
          text
            .replace(/_/g, " ")
            .replace(/=([0-9a-f]{2})/gi, (_, h) =>
              String.fromCharCode(parseInt(h, 16)),
            ),
          "latin1",
        ).toString("utf8"),
  );
}
function read(message) {
  const raw = message.data;
  const split = raw.indexOf("\n\n");
  const head = raw.slice(0, split).replace(/\n[ \t]+/g, " ");
  const header = (name) =>
    decodeWords(new RegExp(`^${name}: (.*)$`, "mi").exec(head)?.[1] ?? "");
  const body = Buffer.from(
    raw
      .slice(split)
      .replace(/=\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      ),
    "latin1",
  ).toString("utf8");
  return {
    to: message.to,
    subject: header("Subject"),
    replyTo: header("Reply-To"),
    body,
  };
}
async function nextMail(to, after) {
  for (let i = 0; i < 100; i++) {
    const found = smtp.messages.slice(after).find((m) => m.to.includes(to));
    if (found) return read(found);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("No email to " + to);
}
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const later = (days) =>
  new Date(Date.parse(today + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const a = await admin.newPage();
  a.on("pageerror", (error) => errors.push(error.message));
  const visitor = await browser.newContext();
  assert.equal(
    (await visitor.request.get(base + "/api/admin/mail-preview")).status(),
    401,
  );
  assert.equal(
    (
      await admin.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  const state = async () =>
    (await admin.request.get(base + "/api/admin/state")).json();
  const byName = async (name) =>
    (await state()).bookings.find((b) => b.guestName === name);

  // Settings: Midtrans on, then the guest email card on the payments page.
  let s = await state();
  assert.equal(s.mail.configured, true);
  s.content.payments = { ...s.content.payments, enabled: true };
  assert.equal(
    (
      await admin.request.put(base + "/api/admin/settings", {
        headers,
        data: { content: s.content, version: s.version },
      })
    ).status(),
    200,
  );
  await a.goto(base + "/admin/payments", { waitUntil: "networkidle" });
  const card = a.locator(".admin-guest-mail");
  await card.getByRole("heading", { name: "Email tamu & invoice" }).waitFor();
  assert.match(
    await card.textContent(),
    /Email dikirim dari .*web@zanclus\.test/,
  );
  await card.getByLabel("Batas waktu pembayaran").selectOption("6");
  await card.getByLabel("Salinan setiap email ke").fill("arsip@zanclus.test");
  await card.getByLabel("Bank 1").fill("BCA");
  await card.getByLabel("Nomor rekening").first().fill("123 456 7890");
  await card.getByLabel("Atas nama").first().fill("PT Zanclus Dive Center");
  await card
    .getByLabel("Bahasa Indonesia")
    .fill("Pembatalan H-3: dana kembali penuh.");
  await card.getByRole("button", { name: "Simpan pengaturan email" }).click();
  await a.getByText("Pengaturan email tamu tersimpan.").waitFor();
  s = await state();
  assert.deepEqual(s.content.payments.accounts, [
    { bank: "BCA", number: "123 456 7890", holder: "PT Zanclus Dive Center" },
  ]);
  assert.equal(s.content.payments.dueHours, 6);
  await a.screenshot({ path: shots + "/admin-guest-mail.png", fullPage: true });
  // Previews with a made-up booking, and a sample to the admin's inbox.
  const preview = await (
    await admin.request.get(
      base + "/api/admin/mail-preview?kind=order&method=transfer&lang=en",
    )
  ).text();
  assert.match(preview, /Transfer to this account/);
  assert.match(preview, /123 456 7890/);
  assert.match(preview, /assets\/email\/zanclus-logo\.png/);
  let mark = smtp.messages.length;
  await card
    .locator(".admin-mail-samples li", { hasText: "Invoice" })
    .getByRole("button", { name: "Kirim ke email saya" })
    .click();
  await card
    .getByText("Contoh email terkirim ke pemilik@example.com.")
    .waitFor();
  assert.match(
    (await nextMail("pemilik@example.com", mark)).subject,
    /^\[Contoh\] Invoice INV-/,
  );

  // A website order: the order email with the 6-hour deadline and the
  // Midtrans link goes to the guest, a copy to the office.
  mark = smtp.messages.length;
  const order = async (name, ip, extra = {}) => {
    const response = await visitor.request.post(
      base + "/api/payments?locale=en",
      {
        headers: { ...headers, "x-real-ip": ip },
        data: {
          activity: "diving",
          lines: [{ item: 0, itemName: "Discovery Dive", quantity: 2 }],
          name,
          whatsapp: "081234567890",
          email: "tamu@example.com",
          notes: "",
          date: later(10),
          participants: 2,
          ...extra,
        },
      },
    );
    assert.equal(response.status(), 201);
    return response.json();
  };
  const web = await order("Tamu Website", "203.0.113.21");
  let mail = await nextMail("tamu@example.com", mark);
  assert.match(
    mail.subject,
    /^Awaiting payment · Booking ZC-[0-9A-F]{12} · Zanclus Dive Center$/,
  );
  assert.ok(mail.to.includes("arsip@zanclus.test"), "copy to the office");
  assert.match(mail.replyTo, /halo@zanclusdive\.com/);
  assert.match(mail.body, /Please complete your payment within 6 hours/);
  assert.ok(mail.body.includes(web.redirectUrl), "pay link");
  assert.match(mail.body, /Discovery Dive/);
  let booking = await byName("Tamu Website");
  assert.equal(booking.lang, "en");
  assert.equal(booking.payment.dueHours, 6);
  assert.equal(
    Date.parse(booking.payment.dueAt) - Date.parse(booking.payment.createdAt),
    6 * 3600000,
  );
  assert.deepEqual(
    booking.mails.map((m) => [m.kind, m.ok]),
    [["order", true]],
  );
  // Paid at Midtrans: the invoice, once, even when Midtrans repeats.
  mark = smtp.messages.length;
  const settle = await visitor.newPage();
  await settle.goto(web.redirectUrl + "/settlement", {
    waitUntil: "networkidle",
  });
  mail = await nextMail("tamu@example.com", mark);
  assert.match(
    mail.subject,
    /^Invoice INV-\d{8}-[0-9A-F]{8} · Payment received/,
  );
  assert.match(mail.body, /PAID/);
  assert.match(mail.body, /Bank transfer \(virtual account\)/);
  assert.match(mail.body, /Balance due/);
  await midtrans.notify(web.orderId);
  await new Promise((r) => setTimeout(r, 800));
  booking = await byName("Tamu Website");
  assert.equal(booking.status, "confirmed");
  assert.match(booking.payment.invoiceNumber, /^INV-/);
  assert.deepEqual(
    booking.mails.map((m) => m.kind),
    ["order", "invoice"],
  );
  // Let it expire: the guest is told the booking was cancelled.
  mark = smtp.messages.length;
  const late = await order("Tamu Telat", "203.0.113.22", {});
  // The order email goes out after the answer; wait for it first.
  await nextMail("tamu@example.com", mark);
  mark = smtp.messages.length;
  await settle.goto(late.redirectUrl + "/expire", { waitUntil: "networkidle" });
  mail = await nextMail("tamu@example.com", mark);
  assert.match(
    mail.subject,
    /^Booking ZC-[0-9A-F]{12} cancelled · payment deadline passed$/,
  );
  assert.equal((await byName("Tamu Telat")).status, "cancelled");

  // WhatsApp booking entered in the admin, billed by bank transfer.
  await a.goto(base + "/admin/reservations", { waitUntil: "networkidle" });
  const form = a.locator("#booking-editor");
  await form.getByLabel("Pengalaman").selectOption("snorkeling");
  await form.getByLabel("Tanggal mulai").fill(later(12));
  await form.getByLabel("Nama tamu").fill("Sarah Lee");
  await form.getByLabel("Telepon / WhatsApp").fill("+61 412 345 678");
  await form.getByLabel("Email tamu").fill("sarah@example.com");
  await form.getByLabel("Bahasa email").selectOption("en");
  await form.getByLabel("Jumlah peserta").fill("3");
  await form.getByLabel("Nilai reservasi (Rp)").fill("1500000");
  await form.getByLabel("Pembayaran").selectOption("transfer");
  await form.getByLabel("Batas waktu bayar").selectOption("24");
  assert.match(
    await form.locator(".admin-billing").textContent(),
    /Tamu menerima email rincian pesanan dengan batas waktu bayar/,
  );
  mark = smtp.messages.length;
  await form.getByRole("button", { name: "Simpan reservasi" }).click();
  await a
    .getByText(
      "Reservasi tersimpan. Pesanan & batas bayar terkirim ke sarah@example.com.",
    )
    .waitFor();
  mail = await nextMail("sarah@example.com", mark);
  assert.match(mail.subject, /^Awaiting payment · Booking ZC-/);
  assert.match(mail.body, /Transfer to this account/);
  assert.match(mail.body, /123 456 7890/);
  assert.match(mail.body, /Please complete your payment within 24 hours/);
  assert.match(mail.body, /Snorkeling · 3 guests/);
  booking = await byName("Sarah Lee");
  assert.equal(booking.payment.provider, "manual");
  assert.equal(booking.payment.status, "unpaid");
  assert.equal(booking.status, "pending");
  const row = a.locator(".admin-table tr", { hasText: "Sarah Lee" });
  assert.match(await row.textContent(), /Belum dibayar/);
  assert.match(await row.textContent(), /Email pesanan & batas bayar/);
  // Paid in cash: the booking is confirmed and the invoice goes out.
  await row.getByRole("button", { name: "Edit" }).click();
  await form.getByLabel("Pembayaran").selectOption("paid");
  await form.getByLabel("Dibayar lewat").selectOption("cash");
  assert.match(
    await form.locator(".admin-billing").textContent(),
    /Tamu menerima invoice lunas/,
  );
  mark = smtp.messages.length;
  await form.getByRole("button", { name: "Simpan perubahan" }).click();
  await a
    .getByText("Reservasi tersimpan. Invoice terkirim ke sarah@example.com.")
    .waitFor();
  mail = await nextMail("sarah@example.com", mark);
  assert.match(
    mail.subject,
    /^Invoice INV-\d{8}-[0-9A-F]{8} · Payment received/,
  );
  assert.match(mail.body, /Cash/);
  assert.match(mail.body, /Pembatalan H-3: dana kembali penuh\./);
  booking = await byName("Sarah Lee");
  assert.equal(booking.status, "confirmed");
  assert.equal(booking.payment.status, "paid");
  // Resend from the email log, and the preview of what was sent.
  await row.getByRole("button", { name: "Edit" }).click();
  const log = form.locator(".admin-mail-log");
  assert.match(
    await log.textContent(),
    /Invoice · terkirim ke sarah@example\.com/,
  );
  mark = smtp.messages.length;
  await log.getByRole("button", { name: "Kirim ulang invoice" }).click();
  await log.getByText("Invoice terkirim ke sarah@example.com.").waitFor();
  assert.match(
    (await nextMail("sarah@example.com", mark)).subject,
    /^Invoice INV-/,
  );
  const shown = await (
    await admin.request.get(base + `/api/admin/bookings/${booking.id}/mail`)
  ).text();
  assert.match(shown, /INV-\d{8}-/);
  await a.screenshot({
    path: shots + "/admin-booking-mail.png",
    fullPage: true,
  });
  await form.getByRole("button", { name: "Batal edit" }).click();

  // Billed with a Midtrans link from the admin: paying sends the invoice.
  mark = smtp.messages.length;
  let response = await admin.request.post(base + "/api/admin/bookings", {
    headers,
    data: {
      experience: "trip",
      status: "pending",
      source: "whatsapp",
      startDate: later(14),
      endDate: later(14),
      guestName: "Budi Santoso",
      phone: "081298765432",
      email: "budi@example.com",
      participants: 2,
      amount: 2400000,
      notes: "",
      billing: { action: "midtrans", dueHours: 12, notify: true },
    },
  });
  assert.equal(response.status(), 201);
  let saved = await response.json();
  assert.equal(saved.mail.ok, true);
  assert.equal(saved.payment.provider, "midtrans");
  mail = await nextMail("budi@example.com", mark);
  assert.match(mail.subject, /^Menunggu pembayaran · Pesanan ZC-/);
  assert.match(mail.body, /Selesaikan pembayaran dalam 12 jam/);
  assert.ok(mail.body.includes(saved.payment.redirectUrl));
  assert.match(mail.body, /Trip laut · 2 peserta/);
  // The Midtrans payment is not changed from the admin while it is open.
  response = await admin.request.put(base + "/api/admin/bookings/" + saved.id, {
    headers,
    data: { ...saved, billing: { action: "paid", method: "cash" } },
  });
  assert.equal(response.status(), 409);
  mark = smtp.messages.length;
  await settle.goto(saved.payment.redirectUrl + "/settlement", {
    waitUntil: "networkidle",
  });
  mail = await nextMail("budi@example.com", mark);
  assert.match(mail.subject, /^Invoice INV-.* · Pembayaran diterima/);
  assert.match(mail.body, /LUNAS/);
  assert.equal((await byName("Budi Santoso")).status, "confirmed");

  // No email address: saved, and the admin is told no email went out.
  response = await admin.request.post(base + "/api/admin/bookings", {
    headers,
    data: {
      experience: "diving",
      status: "pending",
      source: "walkin",
      startDate: later(3),
      endDate: later(3),
      guestName: "Tanpa Email",
      phone: "",
      participants: 1,
      amount: 900000,
      notes: "",
      billing: { action: "transfer", notify: true },
    },
  });
  assert.equal(response.status(), 201);
  assert.match((await response.json()).mail.error, /Email tamu belum diisi/);
  // A bill needs an amount.
  response = await admin.request.post(base + "/api/admin/bookings", {
    headers,
    data: {
      experience: "diving",
      status: "pending",
      source: "walkin",
      startDate: later(3),
      endDate: later(3),
      guestName: "Nol Rupiah",
      participants: 1,
      amount: 0,
      email: "nol@example.com",
      billing: { action: "transfer", notify: true },
    },
  });
  assert.equal(response.status(), 400);
  assert.match((await response.json()).error, /lebih dari Rp 0/);
  // A refused SMTP login is saved on the booking and explained.
  smtp.refuseLogin = true;
  response = await admin.request.post(base + "/api/admin/bookings", {
    headers,
    data: {
      experience: "diving",
      status: "pending",
      source: "whatsapp",
      startDate: later(4),
      endDate: later(4),
      guestName: "Smtp Gagal",
      email: "gagal@example.com",
      participants: 1,
      amount: 900000,
      billing: { action: "transfer", notify: true },
    },
  });
  smtp.refuseLogin = false;
  saved = await response.json();
  assert.equal(saved.mail.ok, false);
  assert.match(saved.mail.error, /Server email menolak login SMTP/);
  assert.deepEqual(
    (await byName("Smtp Gagal")).mails.map((m) => [m.kind, m.ok]),
    [["order", false]],
  );

  // Switched off: website orders send no email.
  s = await state();
  s.content.payments = { ...s.content.payments, guestEmails: false };
  await admin.request.put(base + "/api/admin/settings", {
    headers,
    data: { content: s.content, version: s.version },
  });
  mark = smtp.messages.length;
  await order("Tamu Senyap", "203.0.113.23");
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(smtp.messages.length, mark);
  assert.equal((await byName("Tamu Senyap")).mails, undefined);

  // Phones.
  for (const path of ["/admin/payments", "/admin/reservations"]) {
    await a.setViewportSize({ width: 390, height: 844 });
    await a.goto(base + path, { waitUntil: "networkidle" });
    assert.ok(
      await a.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no sideways scroll at 390px on " + path,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS guest-mail: payment settings (deadline, bank account, office copy, invoice note) save; previews and a sample to the admin; a website order emails the guest the 6-hour deadline and Midtrans link with a copy to the office; paying sends one invoice even when Midtrans repeats; an expired payment sends the cancellation; a WhatsApp booking billed by transfer emails the bank account in English, recording it paid in cash confirms it and sends the invoice with the note; resend and preview from the log; a Midtrans link from the admin is emailed and paying it sends the invoice; an open Midtrans payment is not changed from the admin; no email address, a zero amount and a refused SMTP login are explained; switched off, nothing is sent; 390px without sideways scroll. No email left this machine.",
  );
} finally {
  await browser.close();
  smtp.server.close();
  midtrans.server.close();
}
