import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingMail,
  sampleBooking,
  invoiceNumber,
  invoiceLines,
  methodLabel,
  witDateTime,
  dueAt,
  phoneText,
} from "../src/booking-mail.js";
import {
  validatePayments,
  validateBilling,
  mailFor,
  overdue,
  midtransLocked,
} from "../src/payment-model.js";
import { midtransIncome } from "../src/finance-model.js";
import { defaultContent } from "../src/cms-model.js";

const base = "https://zanclusdivecenter.com";
const content = () => {
  const c = structuredClone(defaultContent);
  c.payments = validatePayments({
    accounts: [{ bank: "BCA", number: "123 456 7890", holder: "Zanclus" }],
    invoiceNote: { id: "Catatan Indonesia", en: "" },
  });
  return c;
};
const now = new Date("2026-10-14T01:30:00Z");

test("the order email gives the deadline in WIT and the way to pay", () => {
  const booking = sampleBooking("order", { now });
  booking.guestName = "Rina <script>";
  const mail = bookingMail("order", { booking, content: content(), base });
  assert.equal(
    mail.subject,
    "Menunggu pembayaran · Pesanan ZC-3F9A2C1B7E40 · Zanclus Dive Center",
  );
  assert.match(mail.html, /Selesaikan pembayaran dalam 24 jam/);
  assert.match(mail.html, /Kamis, 15 Oktober 2026 · 09\.30 WIT/);
  assert.ok(mail.html.includes(booking.payment.redirectUrl));
  assert.match(mail.html, /Bayar sekarang · Rp 3\.400\.000/);
  // Guest text is escaped; images come from the website.
  assert.ok(!mail.html.includes("<script>"));
  assert.match(mail.html, /Rina &lt;script&gt;/);
  assert.ok(mail.html.includes(base + "/assets/email/zanclus-logo.png"));
  assert.match(
    mail.text,
    /Batas pembayaran\n {2}Kamis, 15 Oktober 2026 · 09\.30 WIT/,
  );
  // By transfer: the accounts, the exact amount and the receipt on WhatsApp.
  const transfer = sampleBooking("order", {
    now,
    method: "transfer",
    lang: "en",
  });
  const t = bookingMail("order", {
    booking: transfer,
    content: content(),
    base,
  });
  assert.match(t.subject, /^Awaiting payment · Booking ZC-/);
  assert.match(t.html, /Please complete your payment within 24 hours/);
  assert.match(t.html, /Thursday, 15 October 2026 · 09:30 WIT/);
  assert.match(t.html, /123 456 7890/);
  assert.match(t.html, /https:\/\/wa\.me\/6285190969308\?text=Hi%20Zanclus/);
  assert.ok(!t.html.includes("Pay now"));
  transfer.payment.dueHours = 48;
  assert.match(
    bookingMail("order", { booking: transfer, content: content(), base }).html,
    /within 2 days/,
  );
});

test("the invoice carries its number, method, totals and the note", () => {
  const booking = sampleBooking("invoice", { now });
  const mail = bookingMail("invoice", { booking, content: content(), base });
  assert.equal(
    mail.subject,
    "Invoice INV-20261014-3F9A2C1B · Pembayaran diterima · Zanclus Dive Center",
  );
  assert.match(mail.html, />Lunas</);
  assert.match(mail.html, /QRIS/);
  assert.match(mail.html, /Sisa tagihan/);
  assert.match(mail.html, /Catatan Indonesia/);
  assert.match(mail.text, /Fun Dive 2x × 2\n {2}Rp 3\.000\.000/);
  // No colons in what the guest reads, apart from links and times.
  assert.ok(!/[:;—]/.test(mail.text.replace(/https?:\/\/\S+/g, "")), mail.text);
  // English guests get the Indonesian note when no English one is set.
  const en = sampleBooking("invoice", { now, lang: "en", method: "transfer" });
  const english = bookingMail("invoice", {
    booking: en,
    content: content(),
    base,
  });
  assert.match(english.html, /Payment received, thank you!/);
  assert.match(english.html, /Bank transfer/);
  assert.match(english.html, /Catatan Indonesia/);
  // No transaction number for a payment recorded by hand.
  assert.ok(!english.html.includes("Transaction no."));
});

test("the cancellation points back to the activity page", () => {
  const booking = sampleBooking("expired", { now });
  const mail = bookingMail("expired", { booking, content: content(), base });
  assert.equal(
    mail.subject,
    "Pesanan ZC-3F9A2C1B7E40 dibatalkan · batas pembayaran lewat",
  );
  assert.ok(mail.html.includes(base + "/id/diving"));
  assert.throws(() =>
    bookingMail("other", { booking, content: content(), base }),
  );
});

test("numbers, dates and lines", () => {
  // The invoice date is the day in Raja Ampat (WIT, UTC+9).
  assert.equal(
    invoiceNumber({ id: "3f9a2c1b-7e40" }, "2026-10-14T16:30:00Z"),
    "INV-20261015-3F9A2C1B",
  );
  assert.equal(
    witDateTime("2026-10-14T16:30:00Z"),
    "Kamis, 15 Oktober 2026 · 01.30 WIT",
  );
  assert.equal(
    dueAt("2026-10-14T00:00:00.000Z", 6),
    "2026-10-14T06:00:00.000Z",
  );
  assert.equal(phoneText("6285190969308"), "+62 851-9096-9308");
  assert.equal(
    methodLabel("bank_transfer", "en"),
    "Bank transfer (virtual account)",
  );
  assert.equal(methodLabel("cash"), "Tunai");
  assert.equal(methodLabel("new_wallet"), "new wallet");
  // A booking from WhatsApp has one line: the program and its guests.
  const lines = invoiceLines(
    {
      experience: "snorkeling",
      participants: 3,
      amount: 1500000,
      payment: { amount: 1500000 },
    },
    defaultContent,
    "en",
  );
  assert.deepEqual(lines, [
    {
      name: "Snorkeling · 3 guests",
      quantity: 1,
      price: 1500000,
      total: 1500000,
    },
  ]);
});

test("payment settings check accounts, deadline and the office copy", () => {
  const saved = validatePayments({
    enabled: true,
    dueHours: "5",
    accounts: [
      { bank: " BCA ", number: "123-456", holder: "Zanclus" },
      { bank: "", number: "", holder: "" },
    ],
  });
  assert.equal(saved.dueHours, 24);
  assert.deepEqual(saved.accounts, [
    { bank: "BCA", number: "123-456", holder: "Zanclus" },
  ]);
  assert.throws(
    () => validatePayments({ accounts: [{ bank: "BCA", number: "123456" }] }),
    { message: /Lengkapi/ },
  );
  assert.throws(
    () =>
      validatePayments({
        accounts: [{ bank: "BCA", number: "abc", holder: "Z" }],
      }),
    { message: /Nomor rekening/ },
  );
  assert.throws(() => validatePayments({ copyTo: "bukan" }), {
    message: /salinan/,
  });
  assert.throws(() => validatePayments({ invoiceNote: { id: "<b>x</b>" } }), {
    message: /< atau >/,
  });
  assert.throws(
    () =>
      validatePayments({
        accounts: Array(4).fill({ bank: "B", number: "12345", holder: "Z" }),
      }),
    { message: /Maksimal 3/ },
  );
});

test("billing choices, which email fits, and what finance adds", () => {
  assert.deepEqual(validateBilling(undefined), {
    action: "keep",
    notify: false,
  });
  assert.throws(() => validateBilling({ action: "free" }), {
    message: /tidak valid/,
  });
  assert.throws(
    () =>
      validateBilling({ action: "paid", paidOn: "2026-10-20" }, "2026-10-14"),
    { message: /setelah hari ini/ },
  );
  const paid = validateBilling(
    { action: "paid", method: "cash", notify: true },
    "2026-10-14",
  );
  assert.equal(paid.paidOn, "2026-10-14");
  assert.equal(paid.method, "cash");
  assert.equal(
    validateBilling({ action: "transfer", dueHours: 7 }).dueHours,
    null,
  );

  assert.equal(mailFor(null), null);
  assert.equal(mailFor({ status: "unpaid", dueAt: "x" }), "order");
  assert.equal(mailFor({ status: "pending" }), null);
  assert.equal(mailFor({ status: "paid" }), "invoice");
  assert.equal(mailFor({ status: "expired" }), "expired");
  assert.ok(overdue({ status: "unpaid", dueAt: "2026-10-14T00:00:00Z" }, now));
  assert.ok(!overdue({ status: "paid", dueAt: "2026-10-14T00:00:00Z" }, now));
  assert.ok(midtransLocked({ provider: "midtrans", status: "pending" }));
  assert.ok(!midtransLocked({ provider: "midtrans", status: "expired" }));
  assert.ok(!midtransLocked({ provider: "manual", status: "paid" }));
  // Cash and transfers are entered in the cashbook by hand; Midtrans is added.
  const income = midtransIncome([
    {
      id: "a",
      experience: "diving",
      payment: {
        status: "paid",
        amount: 1,
        orderId: "M",
        paidAt: "2026-10-14T01:00:00Z",
      },
    },
    {
      id: "b",
      experience: "diving",
      payment: {
        provider: "manual",
        status: "paid",
        amount: 2,
        paidAt: "2026-10-14T01:00:00Z",
      },
    },
  ]);
  assert.deepEqual(
    income.map((tx) => tx.id),
    ["tx:mt:a"],
  );
});
