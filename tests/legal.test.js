import test from "node:test";
import assert from "node:assert/strict";
import { defaultContent, validateContent } from "../src/cms-model.js";
import {
  defaultLegal,
  legalBlocks,
  legalKeys,
  legalPaths,
  validateLegal,
  withLegal,
} from "../src/legal-model.js";
import { dictionary } from "../src/i18n.js";

test("the policy pages survive CMS validation and default for older sites", () => {
  const saved = validateContent(structuredClone(defaultContent));
  assert.deepEqual(saved.legal, defaultLegal);
  const old = structuredClone(defaultContent);
  delete old.legal;
  assert.deepEqual(validateContent(old).legal, defaultLegal);
  assert.deepEqual(withLegal(old).legal, defaultLegal);
  // Content that already has its pages keeps them.
  const own = { legal: { updated: "2027-01-02" } };
  assert.equal(withLegal(own), own);
  assert.deepEqual(legalKeys, ["terms", "privacy", "refund"]);
  assert.deepEqual(Object.values(legalPaths), [
    "/terms",
    "/privacy",
    "/refund",
  ]);
});

test("policy texts are checked when saved", () => {
  const legal = structuredClone(defaultLegal);
  legal.terms.sections[0].body.en = "  Spaces around are trimmed.  ";
  assert.equal(
    validateLegal(legal).terms.sections[0].body.en,
    "Spaces around are trimmed.",
  );
  const noDate = { ...structuredClone(defaultLegal), updated: "26-10-2026" };
  assert.throws(() => validateLegal(noDate), /Tanggal pembaruan/);
  const noTitle = structuredClone(defaultLegal);
  noTitle.privacy.title.id = " ";
  assert.throws(() => validateLegal(noTitle), /Judul Kebijakan privasi/);
  const emptyBody = structuredClone(defaultLegal);
  emptyBody.refund.sections[1].body.id = "";
  assert.throws(() => validateLegal(emptyBody), /Isi bagian 2/);
  const many = structuredClone(defaultLegal);
  many.terms.sections = Array.from({ length: 17 }, () => ({
    heading: { id: "Bagian", en: "" },
    body: { id: "Isi", en: "" },
  }));
  assert.throws(() => validateLegal(many), /maksimal 16 bagian/);
  assert.throws(() => validateLegal([]), /tidak valid/);
});

test("a section's text becomes paragraphs and lists", () => {
  assert.deepEqual(
    legalBlocks("First line\nsame paragraph.\n\n- one\n- two\n\nAfter."),
    [
      { type: "text", text: "First line same paragraph." },
      { type: "list", items: ["one", "two"] },
      { type: "text", text: "After." },
    ],
  );
  assert.deepEqual(legalBlocks("Intro\n• a\n• b"), [
    { type: "text", text: "Intro" },
    { type: "list", items: ["a", "b"] },
  ]);
  assert.deepEqual(legalBlocks(""), []);
});

test("the default policy texts follow the owner's punctuation rules", () => {
  const texts = [];
  const walk = (value) => {
    if (typeof value === "string") texts.push(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  };
  walk(defaultLegal);
  for (const locale of ["id", "en"]) {
    const l = dictionary(locale).legal;
    walk(Object.values(l).filter((v) => typeof v === "string"));
    texts.push(l.updated("26 Oktober 2026"), l.askMessage("refund"));
  }
  for (const text of texts) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) continue;
    assert.ok(!/[;—]|\s–\s/.test(text), text);
    // Colons only in times like 07:00.
    assert.ok(!/:(?!\d)/.test(text.replace(/https?:\/\//g, "")), text);
  }
});

test("every page in both languages has a title, an intro and sections", () => {
  for (const key of legalKeys) {
    const page = defaultLegal[key];
    for (const lang of ["id", "en"]) {
      assert.ok(page.title[lang], `${key} title ${lang}`);
      assert.ok(page.intro[lang], `${key} intro ${lang}`);
      for (const s of page.sections) {
        assert.ok(s.heading[lang] && s.body[lang], `${key} ${lang}`);
      }
    }
    assert.ok(page.sections.length >= 4);
  }
  // The refund page tells guests that the fare increase is not refunded.
  const refund = JSON.stringify(defaultLegal.refund);
  assert.match(refund, /kenaikan tarif/i);
  assert.match(refund, /Kelola pesanan/);
});
