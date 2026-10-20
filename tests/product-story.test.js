import test from "node:test";
import assert from "node:assert/strict";
import {
  inlineParts,
  productMdExample,
  readProductMd,
  storyBlocks,
  storyTitle,
} from "../src/product-story.js";
import { validateShop } from "../src/cms-model.js";
import { demoShop, productLimits } from "../src/shop-model.js";

// The maker's page as the owner pasted it.
const maker = `# SCUBAPRO Crystal Vu Plus Dive Mask

**Panoramic Vision. Exceptional Clarity. Premium Diving Comfort.**

### Experience the Ocean Without Limits

Discover a new perspective with the **SCUBAPRO Crystal Vu Plus**,
a premium panoramic dive mask.

---

## Key Features

**Panoramic Three-Window Design**
A large front lens and two seamless side windows.

**Ultra-Clear, No-Tint Glass**
High-quality, no-tint glass.

**Low-Volume Construction** Easier mask clearing.

## Specifications

| Feature | Details |
|---|---|
| Mask Construction | Framed |
| Product Weight | Approximately 250–270 g |

## In the box

- Mask
- Hard case
1. Rinse in fresh water
2. Dry in the shade

> Fits most adult faces.

![photo](https://example.com/a.jpg)
`;

test("a Markdown description reads as tidy blocks", () => {
  const blocks = storyBlocks(maker);
  assert.deepEqual(
    blocks.map((b) => b.type),
    [
      "tagline",
      "heading",
      "paragraph",
      "heading",
      "features",
      "heading",
      "table",
      "heading",
      "list",
      "list",
      "quote",
    ],
  );
  // The first top heading is the product's own name, left out.
  assert.equal(storyTitle(maker), "SCUBAPRO Crystal Vu Plus Dive Mask");
  assert.equal(
    blocks[0].text,
    "Panoramic Vision. Exceptional Clarity. Premium Diving Comfort.",
  );
  // Lines of a paragraph join; bold stays a mark inside it.
  assert.equal(
    blocks[2].text,
    "Discover a new perspective with the **SCUBAPRO Crystal Vu Plus**, a premium panoramic dive mask.",
  );
  // A bold line over its text, with or without a blank line, is a card.
  assert.deepEqual(blocks[4].items, [
    {
      title: "Panoramic Three-Window Design",
      text: "A large front lens and two seamless side windows.",
    },
    {
      title: "Ultra-Clear, No-Tint Glass",
      text: "High-quality, no-tint glass.",
    },
    { title: "Low-Volume Construction", text: "Easier mask clearing." },
  ]);
  assert.deepEqual(blocks[6], {
    type: "table",
    head: ["Feature", "Details"],
    rows: [
      ["Mask Construction", "Framed"],
      ["Product Weight", "Approximately 250–270 g"],
    ],
  });
  assert.deepEqual(
    [blocks[8].ordered, blocks[8].items, blocks[9].ordered, blocks[9].items],
    [
      false,
      ["Mask", "Hard case"],
      true,
      ["Rinse in fresh water", "Dry in the shade"],
    ],
  );
  // A bold sentence over a paragraph is a tagline, not a card, and so is
  // the bold line that opens the description.
  assert.deepEqual(
    storyBlocks(
      "# Name\n\n**Short title**\nOpening text.\n\n**Clear sight. Soft fit.**\nMore text.",
    ).map((b) => b.type),
    ["tagline", "paragraph", "tagline", "paragraph"],
  );
  // The old plain descriptions still read the same way.
  assert.deepEqual(
    storyBlocks("Mask premium.\nNyaman.\n\n- Lensa\n• Silikon"),
    [
      { type: "paragraph", text: "Mask premium. Nyaman." },
      { type: "list", ordered: false, items: ["Lensa", "Silikon"] },
    ],
  );
  assert.deepEqual(storyBlocks(""), []);
});

test("inline marks never become HTML, and links must be https", () => {
  assert.deepEqual(
    inlineParts(
      "A **bold** and *soft* `code` [site](https://scubapro.com) [x](javascript:alert(1)) <b>tag</b>",
    ).map((p) => [p.type, p.text]),
    [
      ["text", "A "],
      ["strong", "bold"],
      ["text", " and "],
      ["em", "soft"],
      ["text", " "],
      ["code", "code"],
      ["text", " "],
      ["link", "site"],
      ["text", " [x](javascript:alert(1)) <b>tag</b>"],
    ],
  );
});

test("a product file fills the description and its spec rows", () => {
  const [only] = readProductMd(maker);
  assert.equal(only.lang, "");
  assert.equal(only.title, "SCUBAPRO Crystal Vu Plus Dive Mask");
  // The specifications table becomes spec rows and leaves the description
  // with its heading.
  assert.deepEqual(only.specs, [
    { label: "Mask Construction", value: "Framed" },
    { label: "Product Weight", value: "Approximately 250–270 g" },
  ]);
  assert.doesNotMatch(only.details, /Specifications|\| Mask Construction/);
  assert.match(only.details, /## Key Features[\s\S]*## In the box/);
  // The example has both languages, with their front matter.
  const [id, en] = readProductMd(productMdExample);
  assert.deepEqual(
    [id.lang, id.name, id.specs.length, en.lang, en.specs[0]],
    [
      "id",
      "SCUBAPRO Crystal Vu Plus",
      3,
      "en",
      { label: "Lens", value: "Untinted tempered glass" },
    ],
  );
  assert.match(id.description, /^Masker panorama tiga jendela/);
  assert.match(en.specification, /^Three windows/);
  // Video links in the front matter, and a description that is too long.
  const [withVideo] = readProductMd(
    "---\nvideo: https://youtu.be/dQw4w9WgXcQ\nbahasa: English\n---\nText",
  );
  assert.deepEqual(
    [withVideo.lang, withVideo.videos, withVideo.details],
    ["en", ["https://youtu.be/dQw4w9WgXcQ"], "Text"],
  );
  assert.throws(
    () => readProductMd("x".repeat(productLimits.details + 1)),
    /terlalu panjang/,
  );
  assert.throws(() => readProductMd("  \n "), /kosong/);
  // A rule in the text is not front matter.
  assert.equal(
    readProductMd("One\n\n---\n\nTwo")[0].details,
    "One\n\n---\n\nTwo",
  );
});

test("long Markdown descriptions are saved", () => {
  const shop = demoShop();
  const long = "A paragraph of the maker's text. ".repeat(500);
  shop.products[0] = { ...shop.products[0], details: long };
  assert.equal(validateShop(shop).products[0].details, long.trim());
  shop.products[0].details = "x".repeat(productLimits.details + 1);
  assert.throws(() => validateShop(shop), /Deskripsi lengkap/);
});
