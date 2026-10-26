import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePayments,
  defaultPayments,
  paypalAmount,
} from "../src/payment-model.js";
import { holdsPlaces } from "../src/booking-model.js";
import { teamMail, teamRecipients, paymentText } from "../src/team-mail.js";
import { bookingAlerts } from "../src/booking-alerts.js";
import { defaultContent } from "../src/cms-model.js";
import { dictionary } from "../src/i18n.js";

test("transfer, PayPal and booking notice settings validate", () => {
  const saved = validatePayments({
    transfer: true,
    paypal: { enabled: true, rate: 16250 },
    notify: {
      enabled: true,
      emails: [" tim@zanclus.com ", "", "tim@zanclus.com", "owner@zanclus.com"],
      paid: false,
    },
  });
  assert.equal(saved.transfer, true);
  assert.deepEqual(saved.paypal, { enabled: true, rate: 16250 });
  // Empty rows go, repeats count once.
  assert.deepEqual(saved.notify, {
    enabled: true,
    emails: ["tim@zanclus.com", "owner@zanclus.com"],
    paid: false,
  });
  // Older settings get the defaults: transfer and PayPal off, notices on.
  const old = validatePayments({ enabled: true });
  assert.equal(old.transfer, false);
  assert.deepEqual(old.paypal, defaultPayments.paypal);
  assert.deepEqual(old.notify, defaultPayments.notify);
  assert.throws(() => validatePayments({ paypal: { rate: 500 } }), /Kurs/);
  assert.throws(() => validatePayments({ paypal: { rate: 16000.5 } }), /Kurs/);
  assert.throws(
    () => validatePayments({ notify: { emails: ["bukan email"] } }),
    /tidak valid/,
  );
  assert.throws(
    () =>
      validatePayments({
        notify: { emails: ["a@b.co", "c@d.co", "e@f.co", "g@h.co"] },
      }),
    /maksimal 3/,
  );
});

test("PayPal charges dollars rounded up to the cent", () => {
  assert.equal(paypalAmount(1600000, 16000), "100.00");
  assert.equal(paypalAmount(1500000, 16000), "93.75");
  assert.equal(paypalAmount(1000, 16000), "0.07");
  assert.equal(paypalAmount(1234567, 15999), "77.17");
});

test("unpaid website transfers and PayPal orders hold places until due", () => {
  const now = Date.parse("2026-10-19T10:00:00Z");
  const later = "2026-10-20T10:00:00Z";
  const before = "2026-10-19T09:00:00Z";
  const order = (payment) => ({ status: "pending", payment });
  const transfer = {
    provider: "manual",
    method: "transfer",
    status: "unpaid",
    orderId: "ZDC-1",
  };
  assert.equal(holdsPlaces(order({ ...transfer, dueAt: later }), now), true);
  assert.equal(holdsPlaces(order({ ...transfer, dueAt: before }), now), false);
  // A transfer bill the team wrote in the admin holds nothing by itself.
  const { orderId, ...adminBill } = transfer;
  assert.equal(orderId, "ZDC-1");
  assert.equal(holdsPlaces(order({ ...adminBill, dueAt: later }), now), false);
  const paypal = { provider: "paypal", status: "created" };
  assert.equal(holdsPlaces(order({ ...paypal, dueAt: later }), now), true);
  assert.equal(holdsPlaces(order({ ...paypal, dueAt: before }), now), false);
  // Midtrans orders hold while open, as before.
  assert.equal(
    holdsPlaces(
      order({ provider: "midtrans", status: "pending", dueAt: before }),
      now,
    ),
    true,
  );
  assert.equal(holdsPlaces({ status: "confirmed" }, now), true);
  assert.equal(holdsPlaces({ status: "pending" }, now), false);
});

const content = structuredClone(defaultContent);
content.contact.email = "info@zanclus.com";
const booking = {
  id: "3f9a2c1b-0000-4000-8000-000000000000",
  experience: "diving",
  source: "website",
  status: "pending",
  startDate: "2026-11-02",
  endDate: "2026-11-02",
  guestName: "Rina",
  phone: "+62 812-3456-7890",
  email: "rina@example.com",
  participants: 2,
  amount: 2400000,
  notes: "Butuh wetsuit ukuran S",
  payment: {
    provider: "manual",
    method: "transfer",
    status: "unpaid",
    orderId: "ZDC-1",
    amount: 2400000,
    dueAt: "2026-10-20T10:00:00Z",
  },
};

test("the team email names the guest, date, value and payment", () => {
  const mail = teamMail("new", booking, {
    content,
    base: "https://zanclusdivecenter.com",
  });
  assert.match(mail.subject, /^Booking baru · Rina · /);
  assert.match(mail.text, /Menunggu transfer bank, batas/);
  assert.match(mail.text, /Rp\s?2\.400\.000/);
  assert.match(mail.text, /Butuh wetsuit ukuran S/);
  assert.match(
    mail.html,
    /https:\/\/zanclusdivecenter\.com\/admin\/calendar\?booking=3f9a2c1b/,
  );
  assert.match(mail.html, /https:\/\/wa\.me\/6281234567890/);
  // No colons in what the team reads, apart from times and addresses.
  const words = mail.text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\d{1,2}[:.]\d{2}/g, "");
  assert.doesNotMatch(words, /[:;—]/);
  const paid = teamMail(
    "paid",
    {
      ...booking,
      status: "confirmed",
      payment: { provider: "paypal", status: "paid", amount: 2400000 },
    },
    { content, base: "https://zanclusdivecenter.com" },
  );
  assert.match(paid.subject, /^Lunas · Rina · /);
  assert.match(paid.text, /Lunas lewat PayPal/);
  assert.equal(
    paymentText({ ...booking, payment: undefined }),
    "Permintaan, belum ada pembayaran",
  );
});

test("the team email goes to the panel's addresses or the contact email", () => {
  const withNotify = (notify) => ({
    ...content,
    payments: { ...content.payments, notify },
  });
  assert.deepEqual(teamRecipients(content), ["info@zanclus.com"]);
  assert.deepEqual(
    teamRecipients(withNotify({ enabled: true, emails: ["a@b.co"] })),
    ["a@b.co"],
  );
  assert.deepEqual(
    teamRecipients(withNotify({ enabled: false, emails: ["a@b.co"] })),
    [],
  );
});

test("the admin rings for website bookings and new payments only", () => {
  const first = bookingAlerts(new Map(), [booking]);
  // The first look only learns the list.
  const quiet = bookingAlerts(first.seen, [booking]);
  assert.deepEqual(quiet.alerts, []);
  const fresh = { ...booking, id: "b2" };
  const phone = { ...booking, id: "b3", source: "whatsapp" };
  const next = bookingAlerts(first.seen, [booking, fresh, phone]);
  assert.deepEqual(
    next.alerts.map((a) => [a.kind, a.booking.id]),
    [["new", "b2"]],
  );
  const paid = {
    ...booking,
    status: "confirmed",
    payment: { ...booking.payment, status: "paid" },
  };
  const after = bookingAlerts(next.seen, [paid, fresh, phone]);
  assert.deepEqual(
    after.alerts.map((a) => [a.kind, a.booking.id]),
    [["paid", booking.id]],
  );
  assert.deepEqual(bookingAlerts(after.seen, [paid]).alerts, []);
});

test("the checkout texts for each way to pay have no colons", () => {
  for (const locale of ["id", "en"]) {
    const p = dictionary(locale).payment;
    const texts = [
      p.methodTitle,
      ...Object.values(p.methods).flat(),
      p.paypalAmount("93.75"),
      p.submitTransfer,
      p.transferHold,
      p.submitPaypal("93.75"),
      p.savingTransfer,
      p.openingPaypal,
      p.paypalSandbox,
      p.transferProof("ZDC-ABC", "Rp 1.500.000"),
      p.totalTransfer,
      p.transferDue,
    ];
    for (const text of texts) {
      assert.equal(typeof text, "string");
      assert.doesNotMatch(text, /[:;—]/, text);
    }
  }
});

test("PayPal income reaches the cashbook as PayPal", async () => {
  const { midtransIncome, paymentMethods } =
    await import("../src/finance-model.js");
  const [line] = midtransIncome([
    {
      ...booking,
      payment: {
        provider: "paypal",
        status: "paid",
        amount: 2400000,
        orderId: "ZDC-2",
        paidAt: "2026-10-19T02:00:00Z",
      },
    },
  ]);
  assert.deepEqual(
    [line.method, line.amount, line.date],
    ["paypal", 2400000, "2026-10-19"],
  );
  assert.equal(paymentMethods.paypal, "PayPal");
});

test("a booking opened from the alert asks only for what fits it", async () => {
  const { noticeKind, noticeTexts } = await import("../src/booking-notice.js");
  const kinds = [
    { status: "pending" },
    booking,
    { ...booking, payment: { provider: "paypal", status: "pending" } },
    { ...booking, status: "confirmed", payment: { status: "paid" } },
    { ...booking, status: "cancelled" },
  ].map(noticeKind);
  assert.deepEqual(kinds, [
    "request",
    "transfer",
    "online",
    "confirmed",
    "closed",
  ]);
  assert.equal(noticeTexts.request.confirm, "Konfirmasi booking");
  assert.equal(
    noticeTexts.transfer.confirm,
    "Transfer sudah masuk, konfirmasi",
  );
  assert.equal(noticeTexts.online.confirm, "");
  for (const texts of Object.values(noticeTexts))
    for (const text of Object.values(texts))
      assert.doesNotMatch(text, /[:;—]/, text);
});
