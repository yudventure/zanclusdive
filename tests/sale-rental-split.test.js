import test from "node:test";
import assert from "node:assert/strict";
import {
  demoShop,
  pairOf,
  splitProducts,
  withSplitProducts,
} from "../src/shop-model.js";
import {
  linkedItems,
  planShopItems,
  publicStock,
  rentalCalendar,
  rentalPairs,
  shopReservations,
  shopStockCounts,
  stockShortfall,
  variantKey,
} from "../src/shop-stock.js";
import { validateContent, defaultContent } from "../src/cms-model.js";
import { englishDefaults } from "../src/content-i18n.js";

const now = "2026-10-16T01:00:00.000Z";
// A product saved when one product could be sold and rented out.
const both = {
  id: "demo-suit",
  name: "Wetsuit 3 mm",
  category: "suit",
  description: "Perlindungan di perairan tropis.",
  specification: "3 mm",
  details: "**Nyaman dipakai lama.**",
  specs: [{ label: "Bahan", value: "Neoprene" }],
  videos: [],
  sizes: ["M", "L"],
  availability: "stock",
  enabled: true,
  saleEnabled: true,
  rentalEnabled: true,
  salePrice: 1850000,
  rentalPrice: 100000,
  image: "https://example.com/baru-1",
  images: ["https://example.com/baru-1", "https://example.com/baru-2"],
  rentalImages: ["https://example.com/bekas-1"],
};

test("a product for sale and for rent becomes two products", () => {
  const { products, rentals } = splitProducts([both]);
  const [sale, rent] = products;
  assert.deepEqual(
    products.map((p) => [p.id, p.saleEnabled, p.rentalEnabled]),
    [
      ["demo-suit", true, false],
      ["demo-suit-sewa", false, true],
    ],
  );
  assert.deepEqual([...rentals], [["demo-suit", "demo-suit-sewa"]]);
  // Each keeps its own price and photos.
  assert.deepEqual(
    [sale.salePrice, sale.rentalPrice, sale.images.length, sale.rentalImages],
    [1850000, null, 2, []],
  );
  assert.deepEqual(
    [rent.salePrice, rent.rentalPrice, rent.images, rent.rentalImages],
    [null, 100000, [], ["https://example.com/bekas-1"]],
  );
  assert.equal(rent.image, "");
  // The same model: name, texts, sizes and availability, and its pair.
  for (const key of ["name", "details", "specs", "sizes", "availability"])
    assert.deepEqual(rent[key], both[key]);
  assert.equal(rent.pair, "demo-suit");
  assert.equal(pairOf(products, sale), rent);
  assert.equal(pairOf(products, rent), sale);
  // Splitting again changes nothing.
  assert.deepEqual(splitProducts(products).products, products);
  // An older admin page that saves the product whole again finds its
  // rental gear instead of making another.
  const again = splitProducts([both, rent]);
  assert.deepEqual(
    again.products.map((p) => p.id),
    ["demo-suit", "demo-suit-sewa"],
  );
  // An id in use gets a number.
  assert.deepEqual(
    splitProducts([both, { ...rent, pair: undefined }]).products.map(
      (p) => p.id,
    ),
    ["demo-suit", "demo-suit-sewa-2", "demo-suit-sewa"],
  );
});

test("the English texts, add-ons and locks follow the rental gear", () => {
  const content = {
    shop: { products: [both] },
    en: {
      shop: {
        products: {
          "demo-suit": { name: "Wetsuit 3 mm", description: "3 mm" },
        },
      },
    },
    priceList: { addOns: { diving: ["shop:demo-suit", "extras-1"] } },
    developer: { items: ["product:demo-suit"] },
  };
  const split = withSplitProducts(content);
  assert.deepEqual(split.en.shop.products["demo-suit-sewa"], {
    name: "Wetsuit 3 mm",
    description: "3 mm",
  });
  assert.deepEqual(split.priceList.addOns.diving, [
    "shop:demo-suit-sewa",
    "extras-1",
  ]);
  assert.deepEqual(split.developer.items, [
    "product:demo-suit",
    "product:demo-suit-sewa",
  ]);
  // Content without such products is left as it is.
  assert.equal(withSplitProducts(split), split);
  assert.equal(withSplitProducts(defaultContent), defaultContent);
  // The demo shop is split already, with English for both.
  const demo = demoShop().products;
  assert.ok(demo.every((p) => p.saleEnabled !== p.rentalEnabled));
  assert.equal(
    englishDefaults.shop.products["demo-suit-sewa"].name,
    "Wetsuit 3 mm",
  );
});

test("saving a catalog with a product for both splits it", () => {
  const sent = structuredClone(defaultContent);
  sent.shop.products = [both, ...sent.shop.products];
  sent.priceList.addOns.diving = ["shop:demo-suit"];
  const saved = validateContent(sent);
  const [sale, rent] = saved.shop.products;
  assert.deepEqual(
    [sale.id, sale.rentalEnabled, rent.id, rent.saleEnabled, rent.pair],
    ["demo-suit", false, "demo-suit-sewa", false, "demo-suit"],
  );
  assert.deepEqual(saved.priceList.addOns.diving, ["shop:demo-suit-sewa"]);
  // A pair is kept once, only on rental gear.
  sent.shop.products = [
    { ...sale, pair: "demo-suit-sewa" },
    rent,
    { ...rent, id: "lain-sewa" },
  ];
  sent.priceList.addOns.diving = [];
  const kept = validateContent(sent).shop.products;
  assert.deepEqual(
    kept.map((p) => p.pair),
    [undefined, "demo-suit", undefined],
  );
});

const item = (id, extra = {}) => ({
  id,
  name: id,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});
const booking = (id, lines, extra = {}) => ({
  id,
  experience: "shop",
  status: "confirmed",
  startDate: "2026-10-20",
  endDate: "2026-10-22",
  payment: { status: "paid", lines },
  ...extra,
});

test("the rental gear keeps the warehouse items and rentals of its product", () => {
  const products = splitProducts([{ ...both, sizes: [] }]).products;
  const pairs = rentalPairs(products);
  assert.deepEqual([...pairs], [["demo-suit", "demo-suit-sewa"]]);
  // The items made when the product was for both.
  const sale = item("item-sale", {
    name: "Wetsuit 3 mm · Jual",
    productId: "demo-suit",
    mode: "sale",
    size: "",
  });
  const rent = item("item-rent", {
    name: "Wetsuit 3 mm · Sewa",
    productId: "demo-suit",
    mode: "rental",
    size: "",
  });
  const linked = linkedItems([sale, rent], products);
  assert.equal(linked.get(variantKey("demo-suit-sewa", "rental")), rent);
  assert.equal(linked.get(variantKey("demo-suit", "sale")), sale);
  // The next sync moves the rental item to the rental gear, nothing new.
  assert.deepEqual(planShopItems(products, [sale, rent], [], now), {
    create: [],
    update: [{ id: "item-rent", changes: { productId: "demo-suit-sewa" } }],
    remove: [],
  });
  // Rentals booked then hold the rental gear's stock.
  const movements = [
    { itemId: "item-rent", kind: "in", qty: 3, date: "2026-10-01" },
  ];
  const bookings = [
    booking("b1", [{ product: "demo-suit", mode: "rental", quantity: 2 }]),
    booking("b2", [], { gear: [{ product: "demo-suit", quantity: 1 }] }),
  ];
  const held = shopReservations(bookings, new Set(), pairs);
  assert.equal(held[variantKey("demo-suit-sewa", "rental")].rentals.length, 2);
  const data = { products, items: [sale, rent], movements, bookings };
  assert.deepEqual(
    stockShortfall(
      data,
      {
        startDate: "2026-10-21",
        endDate: "2026-10-21",
        lines: [{ product: "demo-suit-sewa", mode: "rental", quantity: 1 }],
      },
      "2026-10-16",
    ),
    { product: products[1], size: "", mode: "rental", left: 0 },
  );
  assert.equal(publicStock(data, "2026-10-16")["demo-suit-sewa"].rental, 3);
  // The calendar counts them on the rental gear.
  const days = rentalCalendar(
    bookings,
    [
      {
        key: variantKey("demo-suit-sewa", "rental"),
        productId: "demo-suit-sewa",
        size: "",
        name: "Wetsuit 3 mm",
        stock: 3,
        follows: true,
        pair: "demo-suit",
      },
    ],
    "2026-10-21",
    "2026-10-21",
  );
  assert.deepEqual(
    days["2026-10-21"].map((d) => [d.productId, d.used, d.bookingIds]),
    [["demo-suit-sewa", 3, ["b1", "b2"]]],
  );
  // Counts typed on an older admin page arrive on the product for sale.
  assert.deepEqual(
    shopStockCounts(
      {
        shop: {
          products: [
            {
              id: "demo-suit",
              stockCounts: { sale: { "": 4 }, rental: { "": 5 } },
            },
          ],
        },
      },
      products,
    ),
    [
      { productId: "demo-suit", mode: "sale", size: "", count: 4 },
      { productId: "demo-suit-sewa", mode: "rental", size: "", count: 5 },
    ],
  );
});
