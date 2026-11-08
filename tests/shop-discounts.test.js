import test from "node:test";
import assert from "node:assert/strict";
import { priceOrder, orderLabel, PricingError } from "../src/order-pricing.js";
import { defaultContent, validateShop } from "../src/cms-model.js";
import { demoShop, discountOf, orderMessage } from "../src/shop-model.js";
import { withCourses } from "../src/course-model.js";
import { withService } from "../src/service-model.js";
import { visitorLocks } from "../src/developer.js";
import { checkoutMessage } from "../src/shop/cart.js";
import {
  checkVoucherUses,
  cleanCode,
  findVoucher,
  newVoucher,
  validateVouchers,
  voucherDiscount,
  voucherSummary,
  voucherUses,
} from "../src/voucher-model.js";

const voucher = (patch = {}) => ({
  ...newVoucher("v-test"),
  code: "HEMAT10",
  ...patch,
});
const window = { today: "2030-01-01", last: "2031-01-01" };
// Rupiah amounts use a no-break space after Rp.
const spaced = (text) => text.replace(/\u00a0/g, " ");
const open = visitorLocks(null);
function contentWith(vouchers) {
  const shop = demoShop();
  shop.vouchers = vouchers;
  return withService(withCourses({ ...structuredClone(defaultContent), shop }));
}
const fins = {
  source: "product",
  id: "demo-fins",
  mode: "sale",
  quantity: 2,
  size: "L",
};
const suit = {
  source: "product",
  id: "demo-suit-sewa",
  mode: "rental",
  quantity: 1,
  size: "M",
};

test("a crossed-out price is higher than the product's own price", () => {
  const shop = demoShop();
  const fins = shop.products.find((p) => p.id === "demo-fins");
  fins.comparePrice = 1600000;
  const saved = validateShop(shop).products.find((p) => p.id === "demo-fins");
  assert.equal(saved.comparePrice, 1600000);
  // 1.250.000 instead of 1.600.000 is 21.875% off, shown as 21%.
  assert.deepEqual(discountOf(saved, "sale"), {
    compare: 1600000,
    percent: 21,
  });
  // A product without one has none.
  assert.equal(
    validateShop(demoShop()).products.find((p) => p.id === "demo-fins")
      .comparePrice,
    undefined,
  );
  assert.equal(discountOf({ salePrice: 100 }, "sale"), null);
  for (const comparePrice of [1250000, 900000]) {
    fins.comparePrice = comparePrice;
    assert.throws(
      () => validateShop(shop),
      /Harga coret Open heel fins harus lebih tinggi dari harga jualnya/,
    );
  }
  // A price on request has nothing to cross out.
  fins.comparePrice = 1600000;
  fins.salePrice = null;
  assert.throws(() => validateShop(shop), /harus lebih tinggi/);
  // Rental gear compares its price per day.
  const rental = demoShop();
  const suitRent = rental.products.find((p) => p.id === "demo-suit-sewa");
  suitRent.comparePrice = 150000;
  assert.deepEqual(
    discountOf(
      validateShop(rental).products.find((p) => p.id === "demo-suit-sewa"),
      "rental",
    ),
    { compare: 150000, percent: 33 },
  );
});

test("vouchers are saved with clean codes and checked values", () => {
  const [saved] = validateVouchers([
    voucher({ code: " hemat 10 ", maxDiscount: "50000", minSpend: "" }),
  ]);
  assert.equal(saved.code, "HEMAT10");
  assert.equal(saved.maxDiscount, 50000);
  assert.equal(saved.minSpend, 0);
  assert.equal(saved.limit, null);
  // An amount voucher has no cap.
  assert.equal(
    validateVouchers([
      voucher({ kind: "amount", value: 25000, maxDiscount: 9000 }),
    ])[0].maxDiscount,
    null,
  );
  for (const [patch, message] of [
    [{ code: "AB" }, /harus 4–20 huruf/],
    [{ code: "HEMAT 10!" }, /harus 4–20 huruf/],
    [{ value: 95 }, /1–90 persen/],
    [{ kind: "amount", value: 500 }, /minimal Rp 1.000/],
    [{ start: "2030-02-01", end: "2030-01-01" }, /sebelum tanggal mulainya/],
    [{ end: "2030-13-40x" }, /Tanggal kupon HEMAT10 tidak valid/],
    [{ limit: 0 }, /Kuota kupon HEMAT10/],
    [{ note: "<b>" }, /Catatan kupon/],
  ])
    assert.throws(() => validateVouchers([voucher(patch)]), message);
  assert.throws(
    () =>
      validateVouchers([voucher(), voucher({ id: "v-two", code: "hemat10" })]),
    /Kode kupon HEMAT10 dipakai dua kali/,
  );
  // Saved with the shop.
  const shop = demoShop();
  shop.vouchers = [voucher()];
  assert.equal(validateShop(shop).vouchers[0].code, "HEMAT10");
  assert.equal(validateShop(demoShop()).vouchers, undefined);
  assert.equal(cleanCode(" ab-12 c "), "AB-12C");
  assert.equal(
    spaced(voucherSummary(voucher({ maxDiscount: 50000, minSpend: 500000 }))),
    "10%, maks Rp 50.000, belanja minimal Rp 500.000",
  );
});

test("a voucher works between its days while it is on", () => {
  const list = [voucher({ start: "2030-01-05", end: "2030-01-10" })];
  assert.equal(findVoucher(list, "hemat10", "2030-01-04"), null);
  assert.equal(findVoucher(list, "hemat10", "2030-01-05").code, "HEMAT10");
  assert.equal(findVoucher(list, "HEMAT10", "2030-01-10").code, "HEMAT10");
  assert.equal(findVoucher(list, "HEMAT10", "2030-01-11"), null);
  assert.equal(
    findVoucher([voucher({ enabled: false })], "HEMAT10", "2030-01-06"),
    null,
  );
  assert.equal(findVoucher(undefined, "HEMAT10", "2030-01-06"), null);
});

test("a voucher covers the lines in its places, from its minimum spend", () => {
  const lines = [
    { price: 1000000, quantity: 1, rent: false },
    { price: 300000, quantity: 1, rent: true },
    { price: 50000, quantity: 1, extra: true },
    { price: 20000, quantity: 1, fare: true },
  ];
  // 10% of the gear, without delivery or the fare.
  assert.deepEqual(voucherDiscount(voucher(), lines), {
    discount: 130000,
    covered: 1300000,
    rentals: 30000,
  });
  assert.equal(
    voucherDiscount(voucher({ maxDiscount: 50000 }), lines).discount,
    50000,
  );
  assert.equal(
    voucherDiscount(voucher({ places: ["rental"] }), lines).discount,
    30000,
  );
  assert.equal(
    voucherDiscount(voucher({ kind: "amount", value: 2000000 }), lines)
      .discount,
    1300000,
  );
  assert.throws(
    () => voucherDiscount(voucher({ places: ["rental"] }), lines.slice(0, 1)),
    { message: "Kupon HEMAT10 hanya berlaku untuk sewa alat." },
  );
  assert.throws(
    () => voucherDiscount(voucher({ minSpend: 2000000 }), lines, "en"),
    (error) =>
      spaced(error.message) ===
      "Voucher HEMAT10 needs a minimum spend of IDR 2,000,000.",
  );
});

test("the server prices the voucher as one line below zero", () => {
  const content = contentWith([voucher({ maxDiscount: 200000 })]);
  const order = priceOrder(
    content,
    {
      kind: "shop",
      lines: [fins, suit],
      days: 2,
      startDate: "2030-02-10",
      voucher: "hemat10",
    },
    window,
    open,
  );
  const gear = 1250000 * 2 + 100000 * 2;
  assert.deepEqual(order.lines.at(-1), {
    id: "voucher-HEMAT10",
    name: { id: "Kupon HEMAT10", en: "Voucher HEMAT10" },
    price: -200000,
    quantity: 1,
    discount: true,
  });
  assert.equal(order.amount, gear - 200000);
  assert.deepEqual(
    [order.voucher.code, order.voucher.discount],
    ["HEMAT10", 200000],
  );
  // Midtrans lines add up to the amount.
  assert.equal(
    order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    order.amount,
  );
  assert.match(orderLabel(order.lines, "id"), /, Kupon HEMAT10$/);
  // Without a code, nothing changes.
  const plain = priceOrder(
    content,
    { kind: "shop", lines: [fins], days: 1 },
    window,
    open,
  );
  assert.equal(plain.voucher, undefined);
  assert.equal(plain.amount, 2500000);
});

test("a Flexi refund gives back the rentals after their part of the voucher", () => {
  const content = contentWith([voucher()]);
  const input = {
    kind: "shop",
    lines: [suit],
    days: 2,
    startDate: "2030-02-10",
    fare: "flexi",
  };
  const without = priceOrder(content, input, window, open);
  assert.equal(without.fare.tier, "flexi");
  const withVoucher = priceOrder(
    content,
    { ...input, voucher: "HEMAT10" },
    window,
    open,
  );
  assert.equal(withVoucher.fare.refundable, without.fare.refundable - 20000);
});

test("an unknown or expired code, or one for other places, stops the payment", () => {
  const content = contentWith([
    voucher(),
    voucher({ id: "v-old", code: "LAMA", end: "2029-12-31" }),
    voucher({ id: "v-rent", code: "SEWA", places: ["rental"] }),
  ]);
  const pay = (code, kind = "shop") =>
    priceOrder(
      content,
      { kind, lines: [fins], days: 1, voucher: code },
      window,
      open,
    );
  for (const code of ["SALAH", "LAMA"])
    assert.throws(() => pay(code), {
      message: "Kode kupon tidak ditemukan atau sudah tidak berlaku.",
    });
  assert.throws(() => pay("SEWA"), {
    message: "Kupon SEWA hanya berlaku untuk sewa alat.",
  });
  assert.ok(new PricingError("x") instanceof Error);
});

test("a voucher counts its uses and each guest's use", () => {
  const v = voucher({ limit: 2, oncePerGuest: true });
  const order = (status, phone, code = "HEMAT10") => ({
    status,
    phone,
    payment: { voucher: { id: "v-test", code } },
  });
  const bookings = [
    order("confirmed", "+6281111"),
    order("cancelled", "+6282222"),
    order("pending", "+6283333", "LAIN"),
    { status: "confirmed", phone: "+6284444" },
  ];
  assert.deepEqual(voucherUses(bookings, v, { phone: "+6281111" }), {
    used: 2,
    byGuest: 1,
  });
  assert.throws(() => checkVoucherUses(v, voucherUses(bookings, v), "id"), {
    message: "Kuota kupon HEMAT10 sudah habis.",
  });
  const roomy = { ...v, limit: null };
  assert.throws(
    () =>
      checkVoucherUses(
        roomy,
        voucherUses(bookings, roomy, { phone: "+6281111" }),
        "en",
      ),
    { message: "You have already used voucher HEMAT10." },
  );
  assert.doesNotThrow(() =>
    checkVoucherUses(
      roomy,
      voucherUses(bookings, roomy, { phone: "+6289999" }),
    ),
  );
});

test("WhatsApp orders name the voucher and take its discount off", () => {
  const products = demoShop().products;
  const details = {
    name: "Rina",
    whatsapp: "+62 812 3456 7890",
    email: "",
    days: 1,
    startDate: "2030-02-10",
    voucher: { code: "HEMAT10", discount: 125000 },
  };
  const message = spaced(
    orderMessage(
      products,
      [{ id: "demo-fins", mode: "sale", size: "L", quantity: 1 }],
      details,
      false,
      "id",
    ),
  );
  assert.match(message, /Kupon HEMAT10, potongan Rp 125\.000/);
  assert.match(message, /Estimasi total Rp 1\.125\.000\./);
  const homepage = spaced(
    checkoutMessage(
      [
        {
          key: "sale-demo-fins-L",
          name: "Open heel fins",
          price: 1250000,
          mode: "sale",
          quantity: 1,
          size: "L",
        },
      ],
      details,
      "2030-01-01",
      "en",
    ),
  );
  assert.match(homepage, /Voucher HEMAT10, discount IDR 125,000/);
  assert.match(homepage, /Estimated total IDR 1,125,000/);
});

test("a voucher works in the places the team picks", () => {
  // Saved before places: its scope becomes Dive Shop places.
  assert.deepEqual(
    validateVouchers([{ ...voucher(), places: undefined, scope: "rental" }])[0]
      .places,
    ["rental"],
  );
  assert.deepEqual(
    validateVouchers([{ ...voucher(), places: undefined }])[0].places,
    ["sale", "rental"],
  );
  assert.deepEqual(
    validateVouchers([voucher({ places: ["trip", "diving", "nowhere"] })])[0]
      .places,
    ["diving", "trip"],
  );
  assert.throws(
    () => validateVouchers([voucher({ places: [] })]),
    /Pilih minimal satu tempat kupon HEMAT10/,
  );
  const packages = [{ price: 1500000, quantity: 2 }];
  // An activity order is covered by its activity's place.
  assert.equal(
    voucherDiscount(voucher({ places: ["diving"] }), packages, "id", "diving")
      .discount,
    300000,
  );
  assert.throws(
    () =>
      voucherDiscount(
        voucher({ places: ["diving", "trip", "course"] }),
        packages,
        "id",
        "snorkeling",
      ),
    {
      message:
        "Kupon HEMAT10 hanya berlaku untuk diving, trip laut dan kursus selam.",
    },
  );
  assert.throws(
    () =>
      voucherDiscount(
        voucher({ places: ["service"] }),
        packages,
        "en",
        "course",
      ),
    { message: "Voucher HEMAT10 is only for gear servicing." },
  );
  // A course paid online takes its voucher.
  const content = contentWith([voucher({ places: ["course"] })]);
  const course = content.courses.items.find((c) => c.enabled && c.price);
  const order = priceOrder(
    content,
    {
      kind: "course",
      course: course.id,
      participants: 1,
      date: "2030-02-10",
      voucher: "HEMAT10",
    },
    window,
    open,
  );
  assert.equal(order.voucher.discount, Math.floor(course.price / 10));
  assert.equal(order.amount, course.price - Math.floor(course.price / 10));
  // The same code on a Dive Shop cart is refused.
  assert.throws(
    () =>
      priceOrder(
        content,
        { kind: "shop", lines: [fins], days: 1, voucher: "HEMAT10" },
        window,
        open,
      ),
    { message: "Kupon HEMAT10 hanya berlaku untuk kursus selam." },
  );
});
