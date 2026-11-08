import test from "node:test";
import assert from "node:assert/strict";
import {
  demoShop,
  familyOf,
  familyPrice,
  familyTitle,
  oneEach,
  quoteOrder,
  variantLimit,
  variantName,
} from "../src/shop-model.js";
import { validateShop, defaultContent } from "../src/cms-model.js";
import {
  applyEnglishEdit,
  localizeContent,
  validateTranslations,
} from "../src/content-i18n.js";

// The demo mask for sale in three colours: the lead and two variants, each
// its own product with its own price.
function maskFamily(patch = {}) {
  const shop = demoShop();
  const at = shop.products.findIndex((p) => p.id === "demo-mask");
  const lead = {
    ...shop.products[at],
    name: "Masker Line Merah",
    variant: "Merah",
    variantLabel: "Warna",
  };
  const black = {
    ...lead,
    id: "demo-mask-hitam",
    name: "Masker Line Hitam",
    variant: "Hitam",
    variantOf: "demo-mask",
    variantLabel: "Dibuang",
    salePrice: 700000,
  };
  const white = {
    ...lead,
    id: "demo-mask-putih",
    name: "Masker Line Putih",
    variant: "Putih",
    variantOf: "demo-mask",
  };
  delete white.variantLabel;
  shop.products.splice(at, 1, lead, black, white);
  Object.assign(shop.products[at + 1], patch.black ?? {});
  return shop;
}

test("a model's variants are saved as one family of products", () => {
  const products = validateShop(maskFamily()).products;
  const [lead, black, white] = [
    "demo-mask",
    "demo-mask-hitam",
    "demo-mask-putih",
  ].map((id) => products.find((p) => p.id === id));
  assert.equal(lead.variantOf, undefined);
  assert.equal(lead.variant, "Merah");
  assert.equal(lead.variantLabel, "Warna");
  assert.equal(black.variantOf, "demo-mask");
  assert.equal(black.variant, "Hitam");
  // Only the lead names the choice.
  assert.equal(black.variantLabel, undefined);
  assert.equal(white.variantOf, "demo-mask");
  // Each variant keeps its own price, sizes and photos.
  assert.equal(black.salePrice, 700000);
  assert.equal(lead.salePrice, 650000);
  assert.deepEqual(
    familyOf(products, white).map((p) => p.id),
    ["demo-mask", "demo-mask-hitam", "demo-mask-putih"],
  );
});

test("a variant whose lead is gone, of the other way or a variant itself stands alone", () => {
  for (const variantOf of [
    "missing-product",
    "demo-mask-sewa",
    "demo-mask-putih",
    "demo-mask-hitam",
  ]) {
    const products = validateShop(
      maskFamily({ black: { variantOf } }),
    ).products;
    const black = products.find((p) => p.id === "demo-mask-hitam");
    assert.equal(black.variantOf, undefined, variantOf);
  }
});

test("each variant needs its own variant name and product name", () => {
  assert.throws(
    () => validateShop(maskFamily({ black: { variant: "" } })),
    /Isi nama varian Masker Line Hitam/,
  );
  assert.throws(
    () => validateShop(maskFamily({ black: { variant: "merah" } })),
    /Nama varian merah dipakai dua kali/,
  );
  assert.throws(
    () => validateShop(maskFamily({ black: { name: "Masker Line Merah" } })),
    /dipakai dua varian/,
  );
  assert.throws(
    () => validateShop(maskFamily({ black: { variant: "<b>" } })),
    /tidak boleh berisi/,
  );
  // A product alone may keep a variant name without a family.
  const shop = demoShop();
  shop.products[0].variant = "Biru";
  assert.equal(validateShop(shop).products[0].variant, "Biru");
});

test("a family holds at most the variant limit", () => {
  const shop = maskFamily();
  const lead = shop.products.find((p) => p.id === "demo-mask");
  for (let n = 4; n <= variantLimit; n++)
    shop.products.push({
      ...lead,
      id: `demo-mask-${n}`,
      name: `Masker Line ${n}`,
      variant: `Warna ${n}`,
      variantOf: "demo-mask",
    });
  assert.equal(
    validateShop(shop).products.filter(
      (p) => p.id === "demo-mask" || p.variantOf === "demo-mask",
    ).length,
    variantLimit,
  );
  shop.products.push({
    ...lead,
    id: "demo-mask-extra",
    name: "Masker Line ekstra",
    variant: "Ekstra",
    variantOf: "demo-mask",
  });
  assert.throws(() => validateShop(shop), /lebih dari 12 varian/);
});

test("the shop lists one card per family, in the list's own order", () => {
  const products = validateShop(maskFamily()).products.filter(
    (p) => p.saleEnabled,
  );
  const cards = oneEach(products);
  assert.equal(cards.filter((p) => p.id.startsWith("demo-mask")).length, 1);
  assert.equal(cards.length, products.length - 2);
  // Sorted by price, the cheapest variant stands for the family.
  const sorted = [...products].sort(
    (a, b) => (b.salePrice ?? 0) - (a.salePrice ?? 0),
  );
  assert.equal(
    oneEach(sorted).find((p) => p.id.startsWith("demo-mask")).id,
    "demo-mask-hitam",
  );
  // With items around the products.
  const items = products.map((product) => ({ product }));
  assert.equal(oneEach(items, (item) => item.product).length, cards.length);
});

test("a family's card shows its lowest price and whether prices differ", () => {
  const family = familyOf(validateShop(maskFamily()).products, {
    id: "demo-mask",
  });
  assert.deepEqual(familyPrice(family, "sale"), {
    price: 650000,
    varies: true,
  });
  assert.deepEqual(familyPrice(family.slice(0, 1), "sale"), {
    price: 650000,
    varies: false,
  });
  assert.deepEqual(
    familyPrice(
      family.map((p) => ({ ...p, salePrice: null })),
      "sale",
    ),
    { price: null, varies: false },
  );
  assert.equal(variantName(family[1]), "Hitam");
  assert.equal(variantName({ name: "Fins" }), "Fins");
});

test("each variant is ordered and priced as its own product", () => {
  const products = validateShop(maskFamily()).products;
  const quote = quoteOrder(products, [
    { id: "demo-mask", mode: "sale", quantity: 1 },
    { id: "demo-mask-hitam", mode: "sale", quantity: 2 },
  ]);
  assert.deepEqual(
    quote.lines.map((line) => [line.name, line.total]),
    [
      ["Masker Line Merah", 650000],
      ["Masker Line Hitam", 1400000],
    ],
  );
});

test("variant names have an English text like the other product texts", () => {
  const shop = validateShop(maskFamily());
  const content = { ...structuredClone(defaultContent), shop };
  const edited = applyEnglishEdit(
    content,
    "shop",
    "products",
    shop.products.map((p) =>
      p.id === "demo-mask-hitam"
        ? { ...p, variant: "Black" }
        : p.id === "demo-mask"
          ? { ...p, variantLabel: "Colour" }
          : p,
    ),
  );
  assert.equal(edited.en.shop.products["demo-mask-hitam"].variant, "Black");
  assert.equal(edited.en.shop.products["demo-mask"].variantLabel, "Colour");
  // The shared fields stay Indonesian.
  assert.equal(
    edited.shop.products.find((p) => p.id === "demo-mask-hitam").variant,
    "Hitam",
  );
  const en = validateTranslations(edited.en, edited.shop.products);
  assert.equal(en.shop.products["demo-mask-hitam"].variant, "Black");
  const english = localizeContent({ ...edited, en }, "en");
  assert.equal(
    english.shop.products.find((p) => p.id === "demo-mask-hitam").variant,
    "Black",
  );
  assert.equal(
    english.shop.products.find((p) => p.id === "demo-mask").variantLabel,
    "Colour",
  );
});

test("variants show their lead's texts, spec table and videos", () => {
  const shop = maskFamily({
    black: {
      description: "Teks lama varian hitam",
      details: "# Cerita lama",
      specs: [{ label: "Warna", value: "Hitam" }],
      category: "fins",
      videos: [],
    },
  });
  const at = shop.products.findIndex((p) => p.id === "demo-mask");
  shop.products[at] = {
    ...shop.products[at],
    description: "Masker silikon dengan pandangan luas.",
    details: "# Masker Line\n\nSatu cerita untuk semua warna.",
    specs: [{ label: "Lensa", value: "Kaca tempered" }],
  };
  const products = validateShop(shop).products;
  const lead = products.find((p) => p.id === "demo-mask");
  const black = products.find((p) => p.id === "demo-mask-hitam");
  for (const key of [
    "description",
    "details",
    "specs",
    "category",
    "specification",
  ])
    assert.deepEqual(black[key], lead[key], key);
  // What sets it apart stays its own.
  assert.equal(black.variant, "Hitam");
  assert.equal(black.salePrice, 700000);
  assert.equal(black.name, "Masker Line Hitam");
  // In English too, a variant shows its lead's texts.
  const content = {
    ...defaultContent,
    shop: { ...defaultContent.shop, products },
    en: {
      ...defaultContent.en,
      shop: {
        ...defaultContent.en.shop,
        products: {
          "demo-mask": { description: "A silicone mask with a wide view." },
          "demo-mask-hitam": {
            name: "Line Mask Black",
            description: "Old black text",
          },
        },
      },
    },
  };
  const en = localizeContent(content, "en").shop.products.find(
    (p) => p.id === "demo-mask-hitam",
  );
  assert.equal(en.description, "A silicone mask with a wide view.");
  assert.equal(en.name, "Line Mask Black");
});

test("a family keeps one name on its card and window", () => {
  const products = validateShop(maskFamily()).products;
  const family = familyOf(
    products,
    products.find((p) => p.id === "demo-mask"),
  );
  assert.equal(familyTitle(family), "Masker Line");
  // A name without the colour in it stays whole.
  assert.equal(
    familyTitle([
      { name: "Masker Selam Poseidon Red Line", variant: "Merah" },
      { name: "Masker Selam Poseidon Red Line Hitam", variant: "Hitam" },
    ]),
    "Masker Selam Poseidon Red Line",
  );
  assert.equal(
    familyTitle([
      { name: "Fins Go Sport - Putih", variant: "Putih" },
      { name: "Fins Go Sport - Hitam", variant: "Hitam" },
    ]),
    "Fins Go Sport",
  );
  // A product alone keeps its own name.
  assert.equal(
    familyTitle([{ name: "Masker Line Merah", variant: "Merah" }]),
    "Masker Line Merah",
  );
});
