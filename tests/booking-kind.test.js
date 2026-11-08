import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingTitle,
  isPurchase,
  isReservation,
  purchaseDelivery,
  purchaseItems,
  purchaseState,
} from "../src/booking-kind.js";
import { defaultContent } from "../src/cms-model.js";
import { teamMail } from "../src/team-mail.js";

const line = (name, mode, extra = {}) => ({
  name: { id: name, en: name },
  price: 100000,
  quantity: 1,
  ...(mode ? { product: "p1", mode } : {}),
  ...extra,
});
const shop = (lines, extra = {}) => ({
  id: "b1",
  experience: "shop",
  status: "pending",
  startDate: "2026-11-07",
  endDate: "2026-11-07",
  guestName: "Jonathan",
  phone: "+33615664572",
  participants: 1,
  amount: 200000,
  notes: "Transfer bank · Beli Masker\nDiantar ke Waisai, alamat Jl. Pantai 1",
  payment: {
    provider: "manual",
    method: "transfer",
    status: "unpaid",
    amount: 200000,
    lines,
  },
  ...extra,
});

test("a Dive Shop order that only buys goods is a purchase", () => {
  const bought = shop([
    line("Beli Masker Poseidon ukuran M", "sale", { quantity: 2 }),
    line("Ongkos antar Waisai", null, { extra: true }),
  ]);
  assert.equal(isPurchase(bought), true);
  assert.equal(isReservation(bought), false);
  assert.equal(bookingTitle(defaultContent, bought), "Pembelian barang");
  assert.deepEqual(purchaseItems(bought), ["2 × Masker Poseidon ukuran M"]);
  assert.equal(
    purchaseDelivery(bought),
    "Diantar ke Waisai, alamat Jl. Pantai 1",
  );
});

test("rentals, mixed orders and every activity stay reservations", () => {
  const rented = shop([line("Sewa Fins (2 hari)", "rental")]);
  assert.equal(isPurchase(rented), false);
  assert.equal(bookingTitle(defaultContent, rented), "Sewa alat");
  // Bought and rented in one order: the rental has a date.
  const mixed = shop([
    line("Beli Masker", "sale"),
    line("Sewa Fins (1 hari)", "rental"),
  ]);
  assert.equal(isPurchase(mixed), false);
  // Gear booked by the team on a Dive Shop record is a rental.
  assert.equal(
    isPurchase(shop([line("Beli Masker", "sale")], { gear: [{ id: "g" }] })),
    false,
  );
  // A Dive Shop record typed in by the team, with no lines, is a rental.
  assert.equal(isPurchase(shop(undefined, { payment: undefined })), false);
  for (const experience of [
    "diving",
    "snorkeling",
    "trip",
    "course",
    "service",
  ])
    assert.equal(
      isPurchase({ ...shop([line("Beli Masker", "sale")]), experience }),
      false,
      experience,
    );
  assert.equal(
    bookingTitle(defaultContent, { experience: "trip" }),
    "Trip laut",
  );
});

test("orders saved before products carried their way", () => {
  // Lines without a mode say it in their name.
  assert.equal(isPurchase(shop([line("Beli Senter", null)])), true);
  assert.equal(isPurchase(shop([line("Sewa Senter (1 hari)", null)])), false);
  // A payment from before lines were kept has only its item.
  const old = (item) =>
    shop(undefined, {
      payment: { provider: "midtrans", status: "paid", item },
    });
  assert.equal(isPurchase(old("Beli Senter")), true);
  assert.equal(isPurchase(old("Beli Senter, Sewa Fins (1 hari)")), false);
  assert.deepEqual(purchaseItems(old("Beli Senter")), ["Senter"]);
});

test("a purchase is paid or not", () => {
  const base = shop([line("Beli Masker", "sale")]);
  assert.equal(purchaseState(base), "unpaid");
  const pay = (status) => ({ ...base, payment: { ...base.payment, status } });
  assert.equal(purchaseState(pay("paid")), "paid");
  assert.equal(purchaseState(pay("pending")), "unpaid");
  assert.equal(purchaseState(pay("expired")), "expired");
  assert.equal(purchaseState(pay("failed")), "expired");
  assert.equal(purchaseState(pay("refunded")), "refunded");
  assert.equal(purchaseState({ ...base, status: "cancelled" }), "cancelled");
});

test("the team's email sends a purchase to Pembelian barang", () => {
  const bought = shop([line("Beli Masker", "sale")]);
  const mail = teamMail("new", bought, {
    content: defaultContent,
    base: "https://zanclusdive.com",
  });
  assert.match(mail.subject, /^Pembelian baru · Jonathan/);
  assert.match(mail.text, /\/admin\/orders\?booking=b1/);
  assert.match(mail.text, /Barang {2}Masker/);
  assert.doesNotMatch(mail.text, /Kalender reservasi|Peserta/);
  const rented = shop([line("Sewa Fins (1 hari)", "rental")]);
  const rentMail = teamMail("new", rented, {
    content: defaultContent,
    base: "https://zanclusdive.com",
  });
  assert.match(rentMail.subject, /^Booking baru · Jonathan · Sewa alat/);
  assert.match(rentMail.text, /\/admin\/calendar\?booking=b1/);
});
