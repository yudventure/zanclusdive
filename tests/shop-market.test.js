import test from "node:test";
import assert from "node:assert/strict";
import {
  demoShop,
  detailBlocks,
  deliveryChoice,
  deliveryLines,
  defaultDelivery,
  orderMessage,
  productAs,
  productImages,
  withShop,
} from "../src/shop-model.js";
import { validateShop, defaultContent } from "../src/cms-model.js";
import { priceOrder, orderLabel } from "../src/order-pricing.js";
import { withCourses } from "../src/course-model.js";
import { withService } from "../src/service-model.js";
import { visitorLocks } from "../src/developer.js";
import {
  applyEnglishEdit,
  localizeContent,
  validateTranslations,
} from "../src/content-i18n.js";
import { checkoutMessage } from "../src/shop/cart.js";
import { photoGuide, photoGuides } from "../src/admin/photo-guide.js";
import { siteImageFields } from "../src/photography.js";

const media = (n) =>
  `/api/media/${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const shopWith = (patch = {}, delivery) => {
  const shop = demoShop();
  shop.products[0] = { ...shop.products[0], ...patch };
  if (delivery) shop.delivery = delivery;
  return shop;
};
const zones = {
  ...defaultDelivery,
  enabled: true,
  zones: [
    { id: "zone-kota", name: "Waisai kota", fee: 25000 },
    { id: "zone-saonek", name: "Saonek", fee: 0 },
  ],
};

test("products keep several photos, videos, a full description and spec rows", () => {
  const shop = validateShop(
    shopWith({
      images: [media(1), media(2), media(1)],
      videos: ["https://youtu.be/dQw4w9WgXcQ"],
      details: "Mask premium.\n\n- Lensa jernih\n- Silikon lembut",
      specs: [
        { label: "Merek", value: "Scubapro" },
        { label: "", value: "" },
      ],
    }),
  );
  const mask = shop.products[0];
  // The first photo is the cover the cards use; a repeat is dropped.
  assert.deepEqual(mask.images, [media(1), media(2)]);
  assert.equal(mask.image, media(1));
  assert.deepEqual(mask.videos, ["https://youtu.be/dQw4w9WgXcQ"]);
  assert.deepEqual(mask.specs, [{ label: "Merek", value: "Scubapro" }]);
  assert.match(mask.details, /^Mask premium\./);
  // A catalog from before the gallery keeps its one photo.
  const old = validateShop(shopWith({ image: media(3) })).products[0];
  assert.deepEqual([old.images, old.image], [[media(3)], media(3)]);
  assert.deepEqual(productImages({ image: media(4) }), [media(4)]);
  assert.deepEqual(productImages({}), []);
  // Limits and wrong links.
  assert.throws(
    () =>
      validateShop(
        shopWith({ images: Array.from({ length: 9 }, (_, i) => media(i)) }),
      ),
    { message: "Foto barang jual maksimal 8." },
  );
  assert.throws(
    () => validateShop(shopWith({ videos: ["https://example.com/clip"] })),
    { message: /Link video produk 1 belum dikenali/ },
  );
  assert.throws(
    () => validateShop(shopWith({ videos: ["https://vt.tiktok.com/ZSabc/"] })),
    { message: /masih link pendek/ },
  );
  assert.throws(
    () => validateShop(shopWith({ specs: [{ label: "Merek", value: "" }] })),
    { message: "Isi nama dan isi setiap baris spesifikasi." },
  );
});

test("gear for sale and gear for rent keep their own photos", () => {
  const mask = validateShop(
    shopWith({
      images: [media(1), media(2)],
      rentalImages: [media(7), media(7), media(8)],
    }),
  ).products[0];
  assert.deepEqual(mask.images, [media(1), media(2)]);
  assert.deepEqual(mask.rentalImages, [media(7), media(8)]);
  assert.deepEqual(productImages(mask, "rental"), [media(7), media(8)]);
  assert.equal(productAs(mask, "rental").image, media(7));
  assert.equal(productAs(mask, "sale").image, media(1));
  // A way without photos shows the drawing, not the other way's photos.
  const sold = validateShop(shopWith({ images: [media(1)] })).products[0];
  assert.deepEqual(sold.rentalImages, []);
  assert.deepEqual(productImages(sold, "rental"), []);
  assert.equal(productAs(sold, "rental").image, "");
  assert.deepEqual(productImages({ image: media(4) }, "rental"), []);
  assert.throws(
    () =>
      validateShop(
        shopWith({
          rentalImages: Array.from({ length: 9 }, (_, i) => media(i)),
        }),
      ),
    { message: "Foto barang sewa maksimal 8." },
  );
});

test("the full description reads as paragraphs and lists", () => {
  assert.deepEqual(
    detailBlocks(
      "Mask premium.\nNyaman.\n\nKelebihan\n- Lensa\n• Silikon\r\n\n",
    ),
    [
      { type: "text", lines: ["Mask premium.", "Nyaman."] },
      { type: "text", lines: ["Kelebihan"] },
      { type: "list", items: ["Lensa", "Silikon"] },
    ],
  );
  assert.deepEqual(detailBlocks(""), []);
});

test("delivery settings: pick-up, zones with fees, and their checks", () => {
  const saved = validateShop(shopWith({}, zones)).delivery;
  assert.deepEqual(saved.zones, zones.zones);
  assert.equal(saved.enabled, true);
  // Old catalogs get pick-up only.
  assert.deepEqual(
    withShop({ shop: { products: [] } }).shop.delivery,
    defaultDelivery,
  );
  assert.deepEqual(
    validateShop({ ...demoShop(), delivery: undefined }).delivery,
    defaultDelivery,
  );
  for (const [delivery, message] of [
    [{ ...zones, zones: [] }, /minimal satu wilayah/],
    [{ ...defaultDelivery, pickup: false }, /ambil sendiri atau antar/],
    [
      { ...zones, zones: [{ id: "zone-x", name: "Kota", fee: -1 }] },
      /Ongkos antar Kota/,
    ],
    [
      { ...zones, zones: [{ id: "Zona X", name: "Kota", fee: 1 }] },
      /Wilayah antar tidak valid/,
    ],
  ])
    assert.throws(() => validateShop(shopWith({}, delivery)), {
      message,
    });
});

test("the guest's delivery choice is checked", () => {
  assert.deepEqual(deliveryChoice(zones, { method: "pickup" }), {
    method: "pickup",
    zone: null,
    fee: 0,
    address: "",
  });
  const home = deliveryChoice(zones, {
    method: "delivery",
    zone: "zone-kota",
    address: "  Jl. Kartini  12,\n dekat pasar ",
  });
  assert.deepEqual(
    [home.zone.name, home.fee, home.address],
    ["Waisai kota", 25000, "Jl. Kartini 12, dekat pasar"],
  );
  assert.throws(() => deliveryChoice(zones, { method: "delivery" }), {
    message: "Pilih wilayah antar.",
  });
  assert.throws(
    () =>
      deliveryChoice(zones, {
        method: "delivery",
        zone: "zone-kota",
        address: "Jl",
      }),
    { message: "Isi alamat antar, 5–300 karakter." },
  );
  assert.throws(
    () => deliveryChoice({ ...zones, pickup: false }, { method: "pickup" }),
    { message: "Pilih cara pengambilan pesanan." },
  );
  // Delivery switched off: the zone is no longer offered.
  assert.throws(
    () =>
      deliveryChoice(defaultDelivery, {
        method: "delivery",
        zone: "zone-kota",
        address: "Jl. Kartini 12",
      }),
    { message: "Pilih wilayah antar." },
  );
});

test("a delivered order pays the zone's fee as its own line", () => {
  const content = withService(
    withCourses({
      ...structuredClone(defaultContent),
      shop: shopWith({}, zones),
    }),
  );
  const price = (delivery) =>
    priceOrder(
      content,
      {
        kind: "shop",
        lines: [
          { source: "product", id: "demo-mask", mode: "sale", quantity: 1 },
        ],
        delivery,
      },
      { today: "2030-01-01", last: "2031-01-01" },
      visitorLocks(null),
    );
  const delivered = price({
    method: "delivery",
    zone: "zone-kota",
    address: "Jl. Kartini 12, Waisai",
  });
  assert.deepEqual(
    delivered.lines.map((l) => [l.id, l.price, l.quantity]),
    [
      ["product-demo-mask-sale", 650000, 1],
      ["delivery-zone-kota", 25000, 1],
    ],
  );
  assert.equal(delivered.amount, 675000);
  assert.deepEqual(delivered.delivery, {
    method: "delivery",
    zone: "Waisai kota",
    fee: 25000,
    address: "Jl. Kartini 12, Waisai",
  });
  assert.equal(
    orderLabel(delivered.lines, "id"),
    "Beli Mask & snorkel set × 1, Ongkos antar Waisai kota",
  );
  assert.equal(
    orderLabel(delivered.lines, "en"),
    "Buy Mask & snorkel set × 1, Delivery to Waisai kota",
  );
  // A free zone and pick-up add no line; old pages that send nothing pick up.
  const free = price({
    method: "delivery",
    zone: "zone-saonek",
    address: "Saonek, rumah biru",
  });
  assert.equal(free.lines.length, 1);
  assert.equal(free.delivery.zone, "Saonek");
  assert.equal(price(undefined).delivery.method, "pickup");
  assert.throws(
    () => price({ method: "delivery", zone: "zone-kota", address: "" }),
    { message: "Isi alamat antar, 5–300 karakter." },
  );
});

test("WhatsApp orders carry the delivery and its fee, without colons", () => {
  const products = demoShop().products;
  const delivery = deliveryChoice(zones, {
    method: "delivery",
    zone: "zone-kota",
    address: "Jl. Kartini 12, Waisai",
  });
  const page = orderMessage(
    products,
    [{ id: "demo-mask", mode: "sale", quantity: 1 }],
    { name: "Tamu", whatsapp: "081234567890", days: 1, delivery },
    false,
    "id",
  );
  assert.match(
    page,
    /Diantar ke Waisai kota · Rp\s25\.000\nAlamat Jl\. Kartini 12, Waisai[\s\S]*Estimasi total Rp\s675\.000/,
  );
  assert.doesNotMatch(page, /[:;—]/);
  const home = checkoutMessage(
    [
      {
        key: "buy:demo-mask",
        name: "Mask & snorkel set",
        price: 650000,
        mode: "sale",
        quantity: 1,
      },
    ],
    {
      name: "Guest",
      whatsapp: "+44 7700 900123",
      delivery: deliveryChoice(zones, { method: "pickup" }, "en"),
    },
    "2030-01-01",
    "en",
  );
  assert.match(home, /Pick up at Zanclus Dive Center/);
  assert.deepEqual(deliveryLines(null), []);
});

test("English edits keep delivery shared and translate details and specs", () => {
  const content = { ...structuredClone(defaultContent), shop: demoShop() };
  const shared = applyEnglishEdit(content, "shop", "delivery", zones);
  assert.deepEqual(shared.shop.delivery, zones);
  assert.equal(shared.en.shop.delivery, undefined);
  // Details and spec rows are written per language.
  const english = applyEnglishEdit(
    content,
    "shop",
    "products",
    content.shop.products.map((p) =>
      p.id === "demo-mask"
        ? {
            ...p,
            details: "A premium mask.",
            specs: [{ label: "Brand", value: "Scubapro" }],
            images: [media(5)],
          }
        : p,
    ),
  );
  const mask = (c) => c.shop.products.find((p) => p.id === "demo-mask");
  assert.deepEqual(mask(english).images, [media(5)]);
  // The Indonesian description stays as it was.
  assert.equal(mask(english).details, "");
  const en = mask(localizeContent(english, "en"));
  assert.equal(en.details, "A premium mask.");
  assert.deepEqual(en.specs, [{ label: "Brand", value: "Scubapro" }]);
  assert.deepEqual(
    validateTranslations(english.en, english.shop.products).shop.products[
      "demo-mask"
    ].specs,
    [{ label: "Brand", value: "Scubapro" }],
  );
});

test("every photo slot in the admin names its best size", () => {
  for (const [, label, guide] of siteImageFields) {
    assert.ok(photoGuides[guide], label);
    assert.doesNotMatch(label, /—/);
  }
  assert.equal(
    photoGuide("product"),
    "Terbaik 1200 × 1200 px, rasio 1:1, latar polos, alat terlihat utuh",
  );
  assert.equal(
    photoGuide("logo"),
    "Lebar minimal 600 px, PNG latar transparan, tepi kosong dipotong otomatis",
  );
  for (const key of Object.keys(photoGuides))
    assert.doesNotMatch(photoGuide(key), /[;—]/);
  assert.equal(photoGuide("nope"), "");
});
