import test from "node:test";
import assert from "node:assert/strict";
import {
  demoShop,
  emptyShop,
  withShop,
  quoteOrder,
  orderMessage,
} from "../src/shop-model.js";
import { validateShop } from "../src/cms-model.js";

test("mixed orders charge sales once and rental per unit per day", () => {
  const products = demoShop().products;
  const cart = [
    { id: "demo-mask", mode: "sale", quantity: 2 },
    { id: "demo-fins", mode: "rental", quantity: 3 },
  ];
  const quote = quoteOrder(products, cart, 4);
  assert.equal(quote.total, 2200000);
  assert.equal(quote.lines[1].total, 900000);
  assert.equal(
    quoteOrder(products, [cart[0]], 0).total,
    1300000,
    "a sale-only order does not depend on rental duration",
  );
  const message = orderMessage(
    products,
    cart,
    {
      name: "Tamu Uji",
      days: 4,
      startDate: "2026-10-25",
      notes: "Fin ukuran M",
    },
    true,
  );
  assert.match(message, /contoh demo/);
  assert.match(message, /RENTAL · Open heel fins × 3/);
  assert.match(message, /2026-10-25, selama 4 hari/);
  assert.match(message, /2\.200\.000/);
  assert.match(message, /Fin ukuran M/);
});
test("requests for prices stay distinct from a zero-price total", () => {
  const products = demoShop().products;
  products[0].salePrice = null;
  const cart = [{ id: "demo-mask", mode: "sale", quantity: 1 }];
  assert.equal(quoteOrder(products, cart).needsQuote, true);
  assert.match(
    orderMessage(products, cart, { name: "Tamu", days: 1 }),
    /minta harga/,
  );
});
test("unavailable equipment, forged modes, duplicates, and invalid rental dates are rejected", () => {
  const products = demoShop().products;
  const item = { id: "demo-mask", mode: "rental", quantity: 1 };
  for (const change of [
    { quantity: 0 },
    { quantity: 11 },
    { quantity: 1.5 },
    { mode: "free" },
    { id: "unknown" },
  ])
    assert.throws(() => quoteOrder(products, [{ ...item, ...change }]), Error);
  assert.throws(() => quoteOrder(products, [item, item]));
  assert.throws(() => quoteOrder(products, [item], 0));
  assert.throws(() => quoteOrder(products, [item], 31));
  assert.throws(() =>
    orderMessage(products, [item], {
      name: "Tamu",
      days: 1,
      startDate: "2026-02-31",
    }),
  );
  products[0].availability = "unavailable";
  assert.throws(() => quoteOrder(products, [item]));
  products[0].availability = "request";
  products[0].enabled = false;
  assert.throws(() => quoteOrder(products, [item]));
  assert.throws(() =>
    quoteOrder(products, [{ id: "demo-cylinder", mode: "sale", quantity: 1 }]),
  );
});
test("catalog validation rejects duplicate IDs, invalid prices and unsafe photos", () => {
  assert.equal(validateShop(demoShop()).products.length, 8);
  assert.equal(validateShop(emptyShop).products.length, 0);
  for (const change of [
    { salePrice: -1 },
    { rentalPrice: 1.5 },
    { salePrice: false },
    { image: "javascript:alert(1)" },
    { saleEnabled: false, rentalEnabled: false },
    { category: "made-up" },
  ]) {
    const shop = demoShop();
    Object.assign(shop.products[0], change);
    assert.throws(() => validateShop(shop));
  }
  const shop = demoShop();
  shop.products[1].id = shop.products[0].id;
  assert.throws(() => validateShop(shop));
});
test("old CMS content acquires shop defaults and existing catalog edits are preserved", () => {
  const legacy = {
    text: { heroTitle1: "Konten lama" },
    contact: { email: "example@example.com" },
  };
  const migrated = withShop(legacy, demoShop());
  assert.deepEqual(migrated.text, legacy.text);
  assert.deepEqual(migrated.contact, legacy.contact);
  assert.equal(migrated.shop.products.length, 8);
  assert.equal(
    withShop(legacy).shop.products.length,
    0,
    "production never receives demo prices",
  );
  migrated.shop.products = [];
  assert.deepEqual(
    withShop(migrated, demoShop()).shop.products,
    [],
    "empty saved catalogs stay empty",
  );
});
