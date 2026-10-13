import test from "node:test";
import assert from "node:assert/strict";
import { priceOrder, orderLabel, PricingError } from "../src/order-pricing.js";
import { defaultContent } from "../src/cms-model.js";
import { demoShop } from "../src/shop-model.js";
import { withCourses } from "../src/course-model.js";
import { withService } from "../src/service-model.js";
import { visitorLocks } from "../src/developer.js";

const content = withService(
  withCourses({ ...structuredClone(defaultContent), shop: demoShop() }),
);
const window = { today: "2030-01-01", last: "2031-01-01" };
const open = visitorLocks(null);
const price = (input, locks = open) =>
  priceOrder(content, input, window, locks);

test("a Dive Shop cart is priced from the CMS", () => {
  const order = price({
    kind: "shop",
    lines: [
      { source: "product", id: "demo-fins", mode: "sale", quantity: 2 },
      { source: "product", id: "demo-suit", mode: "rental", quantity: 1 },
      {
        source: "price",
        group: "rentalBasics",
        index: 0,
        name: content.priceList.rentalBasics[0].name.id,
        quantity: 1,
      },
    ],
    days: 3,
    startDate: "2030-02-10",
  });
  const basic = content.priceList.rentalBasics[0];
  assert.equal(order.program, "shop");
  assert.deepEqual(
    [order.startDate, order.endDate],
    ["2030-02-10", "2030-02-12"],
  );
  assert.deepEqual(
    order.lines.map((l) => [l.id, l.price, l.quantity]),
    [
      ["product-demo-fins-sale", 1250000, 2],
      ["product-demo-suit-rental", 100000 * 3, 1],
      ["rent-rentalBasics-0", basic.price * 3, 1],
    ],
  );
  assert.equal(order.amount, 2500000 + 300000 + basic.price * 3);
  assert.equal(order.lines[1].name.id, "Sewa Wetsuit 3 mm (3 hari)");
  assert.equal(order.lines[1].name.en, "Rent Wetsuit 3 mm (3 days)");
  assert.match(orderLabel(order.lines, "id"), /^Beli Open heel fins × 2, Sewa/);
  // Buying only: today, no rental dates needed.
  const sale = price({
    kind: "shop",
    lines: [{ source: "product", id: "demo-mask", mode: "sale", quantity: 1 }],
  });
  assert.deepEqual(
    [sale.startDate, sale.endDate],
    ["2030-01-01", "2030-01-01"],
  );
});

test("shop carts that cannot be paid online are refused", () => {
  const refused = (input, pattern, locks) =>
    assert.throws(
      () => price({ kind: "shop", ...input }, locks),
      (error) => error instanceof PricingError && pattern.test(error.message),
    );
  // The tank has no sale price: our team prices it.
  refused(
    {
      lines: [
        { source: "product", id: "demo-cylinder", mode: "sale", quantity: 1 },
      ],
    },
    /belum tersedia/,
  );
  const priceless = structuredClone(content);
  priceless.shop.products[0].salePrice = null;
  assert.throws(
    () =>
      priceOrder(
        priceless,
        {
          kind: "shop",
          lines: [
            { source: "product", id: "demo-mask", mode: "sale", quantity: 1 },
          ],
        },
        window,
        open,
      ),
    /harganya dikonfirmasi tim/,
  );
  refused(
    {
      lines: [
        { source: "product", id: "demo-mask", mode: "sale", quantity: 11 },
      ],
    },
    /1–10/,
  );
  refused(
    {
      lines: [
        { source: "product", id: "demo-suit", mode: "rental", quantity: 1 },
      ],
      days: 2,
      startDate: "2029-12-31",
    },
    /tanggal/,
  );
  refused(
    {
      lines: [
        {
          source: "price",
          group: "rentalBasics",
          index: 0,
          name: "Nama lama",
          quantity: 1,
        },
      ],
      days: 1,
      startDate: "2030-01-02",
    },
    /diperbarui/,
  );
  refused(
    {
      lines: [
        { source: "product", id: "demo-mask", mode: "sale", quantity: 1 },
      ],
    },
    /belum tersedia/,
    { ...open, items: { "product:demo-mask": true } },
  );
});

test("courses and gear servicing are priced from the CMS", () => {
  const course = content.courses.items[1];
  const signup = price({
    kind: "course",
    course: course.id,
    participants: 3,
    date: "2030-03-01",
  });
  assert.equal(signup.program, "course");
  assert.equal(signup.amount, course.price * 3);
  assert.equal(signup.participants, 3);
  assert.throws(
    () =>
      price({
        kind: "course",
        course: "nope",
        participants: 1,
        date: "2030-03-01",
      }),
    /Kursus ini/,
  );
  assert.throws(
    () =>
      price({
        kind: "course",
        course: course.id,
        participants: 21,
        date: "2030-03-01",
      }),
    /1–20/,
  );
  const [first, second] = content.service.items;
  const service = price({
    kind: "service",
    services: [first.id, second.id],
    date: "2030-03-02",
  });
  assert.equal(service.program, "service");
  assert.equal(service.amount, first.price + second.price);
  assert.deepEqual(
    service.lines.map((l) => l.quantity),
    [1, 1],
  );
  assert.throws(
    () =>
      price({
        kind: "service",
        services: [first.id, first.id],
        date: "2030-03-02",
      }),
    /Pilih servis/,
  );
  assert.throws(
    () =>
      price(
        { kind: "service", services: [first.id], date: "2030-03-02" },
        { ...open, pages: { service: true } },
      ),
    /belum bisa dibayar/,
  );
});

test("several activity packages are paid together, like a cart", () => {
  const [first, second] = content.priceList.diving;
  const order = price({
    activity: "diving",
    lines: [
      { item: 0, itemName: first.name.id, quantity: 2 },
      { item: 1, itemName: second.name.id, quantity: 1 },
    ],
    participants: 2,
    date: "2030-01-05",
  });
  assert.equal(order.amount, first.price * 2 + second.price);
  assert.deepEqual(
    order.lines.map((line) => [line.id, line.quantity]),
    [
      ["diving-0", 2],
      ["diving-1", 1],
    ],
  );
  for (const lines of [
    [],
    [
      { item: 0, itemName: first.name.id, quantity: 1 },
      { item: 0, itemName: first.name.id, quantity: 1 },
    ],
  ])
    assert.throws(
      () =>
        price({
          activity: "diving",
          lines,
          participants: 1,
          date: "2030-01-05",
        }),
      /Pilih minimal satu paket/,
    );
  assert.throws(
    () =>
      price({
        activity: "diving",
        lines: [{ item: 0, itemName: first.name.id, quantity: 31 }],
        participants: 1,
        date: "2030-01-05",
      }),
    /1–30/,
  );
});

test("activity packages keep their checks; a locked site takes nothing", () => {
  const item = content.priceList.diving[0];
  const order = price({
    activity: "diving",
    item: 0,
    itemName: item.name.id,
    quantity: 2,
    participants: 2,
    date: "2030-01-05",
  });
  assert.equal(order.program, "diving");
  assert.equal(order.amount, item.price * 2);
  assert.throws(() => price({ kind: "weird" }), /Data pembayaran tidak valid/);
  assert.throws(
    () =>
      price(
        {
          kind: "service",
          services: [content.service.items[0].id],
          date: "2030-03-02",
        },
        { ...open, site: true },
      ),
    /Data pembayaran tidak valid/,
  );
});
