import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultFares,
  fareActions,
  fareChoices,
  fareFor,
  fareSettings,
  orderFare,
  validateFares,
} from "../src/fare-model.js";
import { priceOrder } from "../src/order-pricing.js";
import { defaultContent, validateContent } from "../src/cms-model.js";
import { visitorLocks } from "../src/developer.js";
import { midtransIncome } from "../src/finance-model.js";
import { dictionary } from "../src/i18n.js";

test("fares default to Comfort +10% and Flexi +20%, 7 and 2 days", () => {
  assert.deepEqual(fareSettings(undefined), defaultFares);
  assert.deepEqual(fareChoices(undefined), [
    { tier: "standard", percent: 0 },
    { tier: "comfort", percent: 10 },
    { tier: "flexi", percent: 20 },
  ]);
  // Switched off, every order is Standard; a switched-off tier is not offered.
  assert.deepEqual(fareChoices({ ...defaultFares, enabled: false }), [
    { tier: "standard", percent: 0 },
  ]);
  const noComfort = {
    ...defaultFares,
    comfort: { enabled: false, percent: 10 },
  };
  assert.deepEqual(
    fareChoices(noComfort).map((c) => c.tier),
    ["standard", "flexi"],
  );
  assert.deepEqual(fareFor(noComfort, "comfort"), {
    tier: "standard",
    percent: 0,
  });
});

test("the admin's fare settings are checked when saved", () => {
  assert.deepEqual(validateFares(undefined), defaultFares);
  const ok = validateFares({
    enabled: true,
    comfort: { enabled: true, percent: "15" },
    flexi: { enabled: false, percent: 25 },
    refundDays: "10",
    rescheduleDays: 0,
  });
  assert.deepEqual(ok, {
    enabled: true,
    comfort: { enabled: true, percent: 15 },
    flexi: { enabled: false, percent: 25 },
    refundDays: 10,
    rescheduleDays: 0,
  });
  for (const [bad, message] of [
    [{ ...ok, comfort: { enabled: true, percent: 0 } }, /Comfort harus 1–100/],
    [{ ...ok, flexi: { enabled: true, percent: 101 } }, /Flexi harus 1–100/],
    [{ ...ok, refundDays: 0 }, /Batas refund harus 1–60/],
    [{ ...ok, rescheduleDays: 31 }, /Batas ganti tanggal harus 0–30/],
    ["x", /tidak valid/],
  ])
    assert.throws(() => validateFares(bad), message);
  const content = structuredClone(defaultContent);
  content.fares = { ...ok };
  assert.deepEqual(validateContent(content).fares, ok);
  delete content.fares;
  assert.deepEqual(validateContent(content).fares, defaultFares);
});

test("the increase applies to packages and rentals, the refund is the base", () => {
  assert.deepEqual(
    orderFare(undefined, "flexi", {
      amount: 2_900_000,
      base: 2_400_000,
      purchases: 0,
    }),
    {
      tier: "flexi",
      percent: 20,
      markup: 480_000,
      refundDays: 7,
      rescheduleDays: 2,
      refundable: 2_900_000,
    },
  );
  // Purchases in a Dive Shop order are not refunded.
  assert.equal(
    orderFare(undefined, "flexi", {
      amount: 1_000_000,
      base: 400_000,
      purchases: 600_000,
    }).refundable,
    400_000,
  );
  assert.equal(orderFare(undefined, "gold", { amount: 1, base: 1 }), null);
  assert.equal(
    orderFare(undefined, undefined, { amount: 1, base: 1 }).tier,
    "standard",
  );
});

test("orders are priced with their fare on the server", () => {
  const content = structuredClone(defaultContent);
  const window = { today: "2030-01-01", last: "2031-01-01" };
  const locks = visitorLocks(null);
  const diving = (fare) =>
    priceOrder(
      content,
      {
        activity: "diving",
        lines: [
          { item: 0, itemName: "Discovery Dive", quantity: 2 },
          {
            addOn: "extras-dokumentasi",
            itemName: "Dokumentasi",
            quantity: 1,
          },
        ],
        participants: 2,
        date: "2030-01-10",
        fare,
      },
      window,
      locks,
    );
  const comfort = diving("comfort");
  // 10% of the two dives, not of the add-on.
  assert.equal(comfort.amount, 2 * 1_200_000 + 500_000 + 240_000);
  assert.deepEqual(comfort.lines.at(-1), {
    id: "fare-comfort",
    name: { id: "Tarif Comfort (+10%)", en: "Comfort fare (+10%)" },
    price: 240_000,
    quantity: 1,
    fare: true,
  });
  assert.equal(comfort.fare.refundable, 2_900_000);
  const standard = diving(undefined);
  assert.equal(standard.amount, 2_900_000);
  assert.equal(standard.fare.tier, "standard");
  assert.equal(
    standard.lines.some((line) => line.fare),
    false,
  );
  assert.throws(
    () => diving("gold"),
    /Tarif yang dipilih sudah tidak tersedia/,
  );
  content.fares = { ...defaultFares, enabled: false };
  assert.throws(() => diving("flexi"), /sudah tidak tersedia/);
  // Courses take no fare.
  const course = priceOrder(
    structuredClone(defaultContent),
    {
      kind: "course",
      course: defaultContent.courses.items[0].id,
      participants: 1,
      date: "2030-01-10",
      fare: "flexi",
    },
    window,
    locks,
  );
  assert.equal(course.fare, null);
});

test("what the guest may still do, day by day", () => {
  const booking = (tier, startDate, extra = {}) => ({
    status: "confirmed",
    startDate,
    endDate: startDate,
    payment: {
      status: "paid",
      fare: {
        tier,
        percent: tier === "standard" ? 0 : 10,
        markup: 0,
        refundDays: 7,
        rescheduleDays: 2,
        refundable: 1_000_000,
      },
    },
    ...extra,
  });
  const flexi = booking("flexi", "2030-01-20");
  assert.deepEqual(fareActions(flexi, "2030-01-13"), {
    tier: "flexi",
    rescheduleUntil: "2030-01-18",
    refundUntil: "2030-01-13",
    canReschedule: true,
    canRefund: true,
    refundAmount: 1_000_000,
    daysLeft: 7,
  });
  // A day later the refund has passed, the date can still move.
  const later = fareActions(flexi, "2030-01-14");
  assert.equal(later.canRefund, false);
  assert.equal(later.canReschedule, true);
  assert.equal(fareActions(flexi, "2030-01-19").canReschedule, false);
  const comfort = fareActions(booking("comfort", "2030-01-20"), "2030-01-01");
  assert.equal(comfort.canRefund, false);
  assert.equal(comfort.refundUntil, "");
  assert.equal(comfort.canReschedule, true);
  const standard = fareActions(booking("standard", "2030-01-20"), "2030-01-01");
  assert.deepEqual(
    [standard.canReschedule, standard.canRefund, standard.rescheduleUntil],
    [false, false, ""],
  );
  // Not paid, cancelled, or without a fare: nothing.
  for (const b of [
    booking("flexi", "2030-01-20", { status: "cancelled" }),
    { ...flexi, payment: { ...flexi.payment, status: "pending" } },
    {
      status: "confirmed",
      startDate: "2030-01-20",
      payment: { status: "paid" },
    },
  ]) {
    const a = fareActions(b, "2030-01-01");
    assert.equal(a.canReschedule || a.canRefund, false);
  }
});

test("a refund sent goes out in the cash book", () => {
  const lines = midtransIncome([
    {
      id: "b1",
      guestName: "Tamu",
      experience: "diving",
      startDate: "2030-01-20",
      payment: {
        provider: "midtrans",
        status: "paid",
        amount: 1_200_000,
        paidAt: "2030-01-02T01:00:00Z",
        orderId: "ZC-1",
        refund: {
          status: "done",
          amount: 1_000_000,
          doneAt: "2030-01-09T03:00:00Z",
          note: "TRF-1",
        },
      },
    },
  ]);
  assert.deepEqual(
    lines.map((l) => [l.id, l.kind, l.category, l.amount, l.date]),
    [
      ["tx:mt:b1", "in", "diving", 1_200_000, "2030-01-02"],
      ["tx:rf:b1", "out", "refund", 1_000_000, "2030-01-09"],
    ],
  );
});

test("fare texts follow the owner's writing rules", () => {
  for (const locale of ["id", "en"]) {
    const f = dictionary(locale).fare;
    const m = dictionary(locale).manage;
    const texts = [
      f.title,
      f.intro,
      ...Object.values(f.rules).map((rule) => rule(defaultFares)),
      f.line("Comfort", 10),
      ...Object.values(m).map((v) =>
        typeof v === "function" ? v("A", "B") : v,
      ),
    ];
    for (const text of texts)
      assert.doesNotMatch(text, /[;—]|:(?!\/\/)| – /, text);
  }
});
