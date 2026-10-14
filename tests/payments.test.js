import test from "node:test";
import assert from "node:assert/strict";
import {
  payableItems,
  paymentOutcome,
  withPaymentStatus,
  validatePayments,
  defaultPayments,
} from "../src/payment-model.js";
import { defaultPriceList } from "../src/price-list.js";
import {
  defaultContent,
  validateContent,
  validateBooking,
} from "../src/cms-model.js";

test("only priced packages of an activity can be paid", () => {
  const items = payableItems(defaultPriceList, "diving");
  assert.ok(items.length > 0);
  assert.ok(items.every((item) => item.price > 0));
  assert.equal(items[0].index, 0);
  assert.deepEqual(payableItems(defaultPriceList, "rentalTank"), []);
  assert.deepEqual(payableItems({ diving: [] }, "diving"), []);
});

test("Midtrans statuses map to payment outcomes", () => {
  assert.equal(paymentOutcome({ transaction_status: "settlement" }), "paid");
  assert.equal(
    paymentOutcome({ transaction_status: "capture", fraud_status: "accept" }),
    "paid",
  );
  assert.equal(
    paymentOutcome({
      transaction_status: "capture",
      fraud_status: "challenge",
    }),
    "pending",
  );
  assert.equal(
    paymentOutcome({ transaction_status: "capture", fraud_status: "deny" }),
    "failed",
  );
  assert.equal(paymentOutcome({ transaction_status: "pending" }), "pending");
  assert.equal(paymentOutcome({ transaction_status: "expire" }), "expired");
  assert.equal(paymentOutcome({ transaction_status: "cancel" }), "failed");
  assert.equal(paymentOutcome({ transaction_status: "refund" }), "refunded");
  assert.equal(paymentOutcome({ transaction_status: "weird" }), null);
});

test("a paid booking is confirmed; expiry cancels a waiting one", () => {
  const booking = {
    status: "pending",
    payment: { status: "pending", amount: 100 },
  };
  const paid = withPaymentStatus(booking, "paid", {
    method: "qris",
    at: "2026-10-14T01:00:00.000Z",
  });
  assert.equal(paid.status, "confirmed");
  assert.equal(paid.payment.status, "paid");
  assert.equal(paid.payment.paidAt, "2026-10-14T01:00:00.000Z");
  assert.equal(paid.payment.method, "qris");
  // Repeats and late lower statuses change nothing.
  assert.equal(withPaymentStatus(paid, "paid"), null);
  assert.equal(withPaymentStatus(paid, "expired"), null);
  assert.equal(withPaymentStatus(paid, "refunded").payment.status, "refunded");
  const expired = withPaymentStatus(booking, "expired");
  assert.equal(expired.status, "cancelled");
  assert.equal(withPaymentStatus({ status: "pending" }, "paid"), null);
});

test("payment settings and activity bookings validate", () => {
  assert.deepEqual(validatePayments(undefined), defaultPayments);
  // Older settings with only the switch get the defaults for the rest.
  assert.deepEqual(validatePayments({ enabled: true, other: 1 }), {
    ...defaultPayments,
    enabled: true,
  });
  assert.equal(
    validateContent(structuredClone(defaultContent)).payments.enabled,
    false,
  );
  const booking = validateBooking({
    experience: "snorkeling",
    status: "pending",
    source: "website",
    startDate: "2026-10-14",
    endDate: "2026-10-14",
    guestName: "Tamu",
    phone: "+6281234567890",
    email: "tamu@example.com",
    participants: 2,
    amount: 900000,
  });
  assert.equal(booking.experience, "snorkeling");
  assert.equal(booking.email, "tamu@example.com");
});
