import test from "node:test";
import assert from "node:assert/strict";
import { defaultContent, validateContent } from "../src/cms-model.js";
import {
  defaultService,
  validateService,
  serviceInquiry,
  withService,
} from "../src/service-model.js";
import {
  defaultAbout,
  validateAbout,
  paragraphs,
  withAbout,
  defaultCompany,
} from "../src/about-model.js";

test("about and service content survive CMS validation and default for older sites", () => {
  const saved = validateContent(structuredClone(defaultContent));
  assert.deepEqual(saved.about, defaultAbout);
  assert.deepEqual(saved.service, defaultService);
  const old = structuredClone(defaultContent);
  delete old.about;
  delete old.service;
  const upgraded = validateContent(old);
  assert.deepEqual(upgraded.about, defaultAbout);
  assert.deepEqual(upgraded.service, defaultService);
  assert.deepEqual(withAbout(old).about, defaultAbout);
  assert.deepEqual(withService(old).service, defaultService);
  assert.deepEqual(validateContent(saved), saved);
});

test("owner edits to services and the about page are kept and checked", () => {
  const service = structuredClone(defaultService);
  service.items[0].price = "700000";
  service.items[5].enabled = false;
  service.image = "/api/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const clean = validateService(service);
  assert.equal(clean.items[0].price, 700000);
  assert.equal(clean.items[5].enabled, false);
  assert.equal(clean.image, service.image);
  for (const broken of [
    { ...service, image: "javascript:alert(1)" },
    { ...service, items: [{ ...service.items[0], price: 0 }] },
    { ...service, items: [service.items[0], service.items[0]] },
    { ...service, items: [{ ...service.items[0], id: "Bad Id" }] },
    {
      ...service,
      items: [{ ...service.items[0], name: { id: "", en: "Name" } }],
    },
    { ...service, items: Array(13).fill(service.items[0]) },
  ])
    assert.throws(() => validateService(broken));

  const about = structuredClone(defaultAbout);
  about.title.id = "  Tentang Zanclus  ";
  about.values.push({ title: { id: "", en: "" }, text: { id: "", en: "" } });
  const page = validateAbout(about);
  assert.equal(page.title.id, "Tentang Zanclus");
  assert.equal(page.values.length, 3, "values without a title are dropped");
  assert.throws(() => validateAbout({ ...about, story: { id: "", en: "" } }));
  assert.throws(() =>
    validateAbout({ ...about, values: Array(7).fill(about.values[0]) }),
  );
  assert.deepEqual(paragraphs({ id: "Satu.\n\n\nDua.\n \nTiga." }, "id"), [
    "Satu.",
    "Dua.",
    "Tiga.",
  ]);
  assert.equal(paragraphs({ id: "Satu.", en: "" }, "en")[0], "Satu.");
});

test("service request message lists the chosen services in the visitor's language", () => {
  const [regulator, , bcd] = defaultService.items;
  const details = {
    name: " Tamu Servis ",
    whatsapp: "081234567890",
    email: "",
    date: "2026-11-02",
    notes: "Regulator Mares, berat saat menarik napas",
  };
  const id = serviceInquiry([regulator, bcd], details, "2026-10-13", "id");
  assert.equal(
    id,
    [
      "Halo Zanclus! Saya ingin servis alat selam.",
      "Nama: Tamu Servis",
      "WhatsApp: 081234567890",
      "Servis: Servis regulator, Servis BCD",
      "Rencana antar alat: 2026-11-02",
      "Alat dan keluhan: Regulator Mares, berat saat menarik napas",
      "Mohon info estimasi biaya dan lama pengerjaan. Ini belum menjadi pesanan resmi.",
    ].join("\n"),
  );
  const en = serviceInquiry([regulator], details, "2026-10-13", "en");
  assert.match(en, /^Hi Zanclus! I would like to have my dive gear serviced\./);
  assert.match(en, /Services: Regulator service/);
  assert.throws(
    () => serviceInquiry([], details, "2026-10-13", "id"),
    /Pilih minimal satu servis/,
  );
  assert.throws(
    () =>
      serviceInquiry([{ ...bcd, enabled: false }], details, "2026-10-13", "id"),
    /Pilih minimal satu servis/,
  );
  for (const [patch, error] of [
    [{ name: "" }, /Isi nama/],
    [{ whatsapp: "12" }, /WhatsApp/],
    [{ email: "bukan-email" }, /email/],
    [{ date: "2026-10-12" }, /tanggal/],
    [{ date: "2026-02-30" }, /tanggal/],
    [{ notes: "x".repeat(1001) }, /Catatan/],
  ])
    assert.throws(
      () =>
        serviceInquiry(
          [regulator],
          { ...details, ...patch },
          "2026-10-13",
          "id",
        ),
      error,
    );
});

test("the company profile defaults for older about pages and is checked", () => {
  const old = structuredClone(defaultAbout);
  delete old.company;
  // Saved before the company profile existed: the default one is added.
  assert.deepEqual(validateAbout(old).company, defaultCompany);
  assert.deepEqual(withAbout({ about: old }).about.company, defaultCompany);
  const page = withAbout({ about: structuredClone(defaultAbout) });
  assert.equal(page.about.company.portfolio.length, 4);
  // Owner edits are kept, unnamed fields dropped, limits enforced.
  const about = structuredClone(defaultAbout);
  about.company.standing.id = "  Diperhitungkan di Raja Ampat.  ";
  about.company.portfolio.push({
    title: { id: "", en: "" },
    text: { id: "Tanpa nama", en: "" },
  });
  const saved = validateAbout(about);
  assert.equal(saved.company.standing.id, "Diperhitungkan di Raja Ampat.");
  assert.equal(saved.company.portfolio.length, 4);
  assert.throws(
    () =>
      validateAbout({
        ...about,
        company: {
          ...about.company,
          portfolio: Array(7).fill(about.company.portfolio[0]),
        },
      }),
    { message: /maksimal 6/ },
  );
  assert.throws(() =>
    validateAbout({
      ...about,
      company: { ...about.company, partners: { id: "x".repeat(601), en: "" } },
    }),
  );
  // The default text follows the owner's writing rules.
  const text = JSON.stringify(defaultCompany);
  assert.ok(!/[:;—]/.test(text.replace(/"[a-z]+":/g, "")), text);
});
