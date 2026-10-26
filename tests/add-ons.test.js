import test from "node:test";
import assert from "node:assert/strict";
import {
  addOnItems,
  addOnLimit,
  priceIncludes,
  allPriceGroups,
  defaultPriceList,
  legacyPriceList,
  legacyRentalGroups,
  validatePriceList,
  withPriceList,
} from "../src/price-list.js";
import { priceOrder } from "../src/order-pricing.js";
import { defaultContent, validateContent } from "../src/cms-model.js";
import { visitorLocks } from "../src/developer.js";

const names = (items) => items.map((item) => item.name.id);
const plain = (items) => structuredClone(items).map(({ id, ...item }) => item);
const day = { id: "/ hari", en: "/ day" };
const gear = defaultContent.shop.products;
const funDiveNames = [
  "Fun Dive Pesisir Waigeo",
  "Fun Dive Kri, Mansuar & Arborek",
  "Fun Dive Piaynemo",
];

test("diving lists the dives; gear, cameras and documentation are add-ons", () => {
  assert.deepEqual(names(defaultPriceList.diving), [
    "Discovery Dive",
    "Pemandu selam",
    ...funDiveNames,
  ]);
  assert.deepEqual(names(defaultPriceList.extras), ["Dokumentasi"]);
  // The rental gear is in the Dive Shop, not in the price list.
  for (const group of legacyRentalGroups)
    assert.equal(defaultPriceList[group], undefined);
  assert.equal(
    gear.find((p) => p.id === "sewa-perlengkapan-scuba").name,
    "Perlengkapan scuba",
  );
  const addOns = addOnItems(defaultPriceList, "diving", gear);
  assert.deepEqual(
    addOns.map((item) => [item.group, item.name.id, item.price]),
    [
      ["rentalScuba", "Perlengkapan scuba", 600000],
      ["rentalTank", "Tabung + isi ulang", 100000],
      ["rentalTools", "Dive computer D4i", 500000],
      ["rentalCamera", "Kamera bawah air TG-5", 650000],
      ["rentalCamera", "Kamera TG-5 + perlengkapan", 1500000],
      ["rentalCamera", "GoPro Hero 11 + housing", 500000],
      ["extras", "Dokumentasi", 500000],
    ],
  );
  assert.deepEqual(addOnItems(defaultPriceList, "snorkeling", gear), []);
  // Without the catalog only the services are left.
  assert.deepEqual(names(addOnItems(defaultPriceList, "diving")), [
    "Dokumentasi",
  ]);
  // Every item has its own id.
  const ids = allPriceGroups.flatMap((group) =>
    defaultPriceList[group].map((item) => item.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)));
  assert.deepEqual(validatePriceList(defaultPriceList, gear), defaultPriceList);
  // Rental gear that left the catalog drops out of the add-ons.
  assert.deepEqual(validatePriceList(defaultPriceList).addOns.diving, [
    "extras-dokumentasi",
  ]);
});

// The live site before add-ons: six diving items, rental lists without
// ids, no extras.
const before = () =>
  Object.fromEntries(
    [...allPriceGroups, ...legacyRentalGroups]
      .filter((group) => group !== "extras")
      .map((group) => [group, plain(legacyPriceList[group])]),
  );
const productNamed = (content, name) =>
  content.shop.products.filter((p) => p.name === name);

test("a diving list saved before add-ons moves its gear and documentation", () => {
  const saved = before();
  saved.rentalScuba = saved.rentalScuba.slice(1);
  saved.diving.push(
    {
      name: { id: "Perlengkapan scuba", en: "Scuba equipment" },
      info: { id: "Mask, fins, BCD, regulator, wetsuit", en: "" },
      price: 600000,
      unit: day,
    },
    {
      name: { id: "Tabung + isi ulang", en: "Tank + refill" },
      info: { id: "", en: "" },
      price: 100000,
      unit: { id: "/ tabung", en: "/ tank" },
    },
    {
      name: { id: "Dive computer D4i", en: "Dive computer D4i" },
      info: { id: "", en: "" },
      price: 500000,
      unit: day,
    },
    {
      name: { id: "Dokumentasi", en: "Documentation" },
      info: { id: "Foto & video", en: "" },
      price: 550000,
      unit: day,
    },
  );
  const content = withPriceList({ priceList: saved });
  const list = content.priceList;
  assert.deepEqual(names(list.diving), [
    "Discovery Dive",
    "Pemandu selam",
    ...funDiveNames,
  ]);
  // The owner's own price for documentation is kept.
  assert.deepEqual(
    list.extras.map((item) => [item.id, item.price]),
    [["extras-dokumentasi", 550000]],
  );
  // The gear became Dive Shop rental products, each once.
  assert.equal(productNamed(content, "Perlengkapan scuba").length, 1);
  assert.equal(productNamed(content, "Tabung + isi ulang").length, 1);
  assert.equal(content.shop.products.length, 18);
  assert.deepEqual(list.addOns, defaultPriceList.addOns);
  // Read again, nothing changes.
  assert.equal(withPriceList(content), content);
  assert.deepEqual(
    validatePriceList(list, content.shop.products).addOns,
    list.addOns,
  );
});

test("items the owner removed are not brought back as add-ons", () => {
  const saved = before();
  saved.rentalCamera = saved.rentalCamera.filter(
    (item) => item.name.id !== "GoPro Hero 11 + housing",
  );
  saved.rentalTank = [];
  saved.diving.push({
    name: { id: "Tabung + isi ulang", en: "" },
    info: { id: "", en: "" },
    price: 90000,
    unit: { id: "/ tabung", en: "" },
  });
  const content = withPriceList({ priceList: saved });
  const list = content.priceList;
  // No documentation in diving, so none in the extras either.
  assert.deepEqual(list.extras, []);
  // The tank becomes rental gear with its own price.
  assert.deepEqual(
    productNamed(content, "Tabung + isi ulang").map((p) => p.rentalPrice),
    [90000],
  );
  assert.equal(productNamed(content, "GoPro Hero 11 + housing").length, 0);
  assert.deepEqual(names(addOnItems(list, "diving", content.shop.products)), [
    "Perlengkapan scuba",
    "Tabung + isi ulang",
    "Dive computer D4i",
    "Kamera bawah air TG-5",
    "Kamera TG-5 + perlengkapan",
  ]);
  // Content without any price list gets the defaults and their gear.
  const blank = withPriceList({});
  assert.deepEqual(blank.priceList, structuredClone(defaultPriceList));
  assert.deepEqual(blank.shop.products, gear);
});

test("add-ons are checked against the other lists when saved", () => {
  const list = structuredClone(defaultPriceList);
  // A new item without an id gets one from its list and name.
  list.extras.push({
    name: { id: "Antar jemput mobil", en: "Car pick-up" },
    info: { id: "", en: "" },
    price: 250000,
    unit: { id: "/ trip", en: "/ trip" },
  });
  list.addOns.diving = [
    "extras-antar-jemput-mobil",
    "trip-homestay",
    "diving-discovery-dive",
    "gone",
    "trip-homestay",
  ];
  const saved = validatePriceList(list);
  assert.equal(saved.extras[1].id, "extras-antar-jemput-mobil");
  // Its own packages, unknown ids and repeats drop out.
  assert.deepEqual(saved.addOns.diving, [
    "extras-antar-jemput-mobil",
    "trip-homestay",
  ]);
  list.addOns.trip = Array(addOnLimit + 1).fill("extras-dokumentasi");
  assert.throws(() => validatePriceList(list), /maksimal 16/);
  // Two items given the same id keep the first; the second gets a new one.
  const twins = structuredClone(defaultPriceList);
  twins.extras.push({ ...twins.extras[0] });
  const fixed = validatePriceList(twins);
  assert.deepEqual(
    fixed.extras.map((item) => item.id),
    ["extras-dokumentasi", "extras-dokumentasi-2"],
  );
  // Saving the whole site keeps the add-ons.
  const content = structuredClone(defaultContent);
  content.priceList = list;
  list.addOns.trip = [];
  assert.deepEqual(validateContent(content).priceList.addOns.diving, [
    "extras-antar-jemput-mobil",
    "trip-homestay",
  ]);
});

test("add-ons are paid with a main package, priced from the CMS", () => {
  const content = structuredClone(defaultContent);
  const window = { today: "2030-01-01", last: "2031-01-01" };
  const order = (lines) =>
    priceOrder(
      content,
      {
        activity: "diving",
        lines,
        participants: 2,
        date: "2030-01-05",
      },
      window,
      visitorLocks(null),
    );
  const paid = order([
    { item: 0, itemName: "Discovery Dive", quantity: 2 },
    // Rental gear is known by its id, whatever language the page is in.
    {
      addOn: "shop:sewa-kamera-bawah-air-tg-5",
      itemName: "Underwater camera TG-5",
      quantity: 1,
    },
    { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 },
  ]);
  assert.equal(paid.amount, 2 * 1200000 + 650000 + 500000);
  assert.deepEqual(
    paid.lines.map((line) => [line.id, line.addOn, line.product, line.mode]),
    [
      ["diving-0", false, undefined, undefined],
      [
        "addon-shop-sewa-kamera-bawah-air-tg-5",
        true,
        "sewa-kamera-bawah-air-tg-5",
        "rental",
      ],
      ["addon-extras-dokumentasi", true, undefined, undefined],
    ],
  );
  // The camera is rented on the dive's day, and named in both languages.
  assert.deepEqual(
    [paid.startDate, paid.endDate],
    ["2030-01-05", "2030-01-05"],
  );
  assert.deepEqual(paid.lines[1].name, {
    id: "Kamera bawah air TG-5",
    en: "Underwater camera TG-5",
  });
  // Gear taken off the website is no longer an add-on.
  const camera = content.shop.products.find(
    (p) => p.id === "sewa-kamera-bawah-air-tg-5",
  );
  camera.enabled = false;
  assert.throws(
    () =>
      order([
        { item: 0, itemName: "Discovery Dive", quantity: 1 },
        { addOn: "shop:sewa-kamera-bawah-air-tg-5", itemName: "", quantity: 1 },
      ]),
    /Daftar harga baru saja diperbarui/,
  );
  camera.enabled = true;
  assert.throws(
    () =>
      order([
        { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 },
      ]),
    /bersama minimal satu paket utama/,
  );
  for (const wrong of [
    { addOn: "extras-dokumentasi", itemName: "Foto", quantity: 1 },
    { addOn: "trip-homestay", itemName: "Homestay", quantity: 1 },
  ])
    assert.throws(
      () =>
        order([{ item: 0, itemName: "Discovery Dive", quantity: 1 }, wrong]),
      /Daftar harga baru saja diperbarui/,
    );
  assert.throws(
    () =>
      order([
        { item: 0, itemName: "Discovery Dive", quantity: 1 },
        { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 },
        { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 },
      ]),
    /Pilih minimal satu paket/,
  );
  assert.throws(
    () =>
      order([
        { item: 0, itemName: "Discovery Dive", quantity: 1 },
        { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 31 },
      ]),
    /1–30/,
  );
});

test("a list saved before the fun dives gets them once, at its end", () => {
  const saved = structuredClone(defaultPriceList);
  delete saved.revision;
  saved.diving = saved.diving.filter((item) => !/^Fun Dive/.test(item.name.id));
  saved.diving[1].price = 800000;
  const list = withPriceList({ priceList: saved }).priceList;
  assert.deepEqual(names(list.diving), [
    "Discovery Dive",
    "Pemandu selam",
    ...funDiveNames,
  ]);
  // The owner's own prices stay, the fun dives come per diver.
  assert.deepEqual(
    list.diving.map((item) => item.price),
    [1200000, 800000, 2100000, 2700000, 4000000],
  );
  assert.equal(list.diving[2].unit.en, "/ diver");
  assert.equal(list.revision, 3);
  // Saved from the admin, one deleted, it stays deleted.
  const edited = validatePriceList(
    { ...list, diving: list.diving.filter((item) => item.price !== 4000000) },
    gear,
  );
  assert.equal(edited.revision, 3);
  assert.equal(withPriceList({ priceList: edited }).priceList.diving.length, 4);
  // A full list of eight gets only what fits.
  const full = structuredClone(saved);
  full.diving = Array.from({ length: 7 }, (_, i) => ({
    ...saved.diving[0],
    id: `diving-paket-${i}`,
  }));
  assert.deepEqual(
    names(withPriceList({ priceList: full }).priceList.diving).slice(7),
    ["Fun Dive Pesisir Waigeo"],
  );
});

test("each diving package shows a photo of the place, once", () => {
  // The defaults: a photo on every diving package, none elsewhere.
  assert.deepEqual(
    defaultPriceList.diving.map((item) => item.image),
    [
      "/assets/photos/gallery-dive.webp",
      "/assets/photos/diving-card.webp",
      "/assets/photos/fan-coral.webp",
      "/assets/photos/banner-penyu.webp",
      "/assets/photos/trip.webp",
    ],
  );
  assert.ok(defaultPriceList.snorkeling.every((item) => !item.image));
  // A list saved with the fun dives (revision 1), one of them deleted and
  // Discovery Dive with the owner's own photo, gets the others' photos.
  const saved = structuredClone(defaultPriceList);
  saved.revision = 1;
  saved.diving = saved.diving
    .filter((item) => item.id !== "diving-fun-dive-piaynemo")
    .map(({ image, ...item }) => item);
  saved.diving[0].image = "/api/media/0b9c1a52-7d1e-4a7b-9b2f-3c4d5e6f7a8b";
  const list = withPriceList({ priceList: saved }).priceList;
  assert.deepEqual(
    list.diving.map((item) => [item.id, item.image]),
    [
      [
        "diving-discovery-dive",
        "/api/media/0b9c1a52-7d1e-4a7b-9b2f-3c4d5e6f7a8b",
      ],
      ["diving-pemandu-selam", "/assets/photos/diving-card.webp"],
      ["diving-fun-dive-waigeo", "/assets/photos/fan-coral.webp"],
      ["diving-fun-dive-dampier", "/assets/photos/banner-penyu.webp"],
    ],
  );
  // A photo the owner removes and saves stays removed.
  const removed = validatePriceList(
    {
      ...list,
      diving: list.diving.map((item, i) =>
        i === 1 ? { ...item, image: "" } : item,
      ),
    },
    gear,
  );
  assert.equal("image" in removed.diving[1], false);
  assert.equal(
    "image" in withPriceList({ priceList: removed }).priceList.diving[1],
    false,
  );
  // Only photos the site can serve are kept.
  assert.throws(
    () =>
      validatePriceList(
        {
          ...list,
          diving: [{ ...list.diving[0], image: "javascript:alert(1)" }],
        },
        gear,
      ),
    /HTTPS atau aset/,
  );
});

test("a package lists what it includes, split once from its old summary", () => {
  const waigeo = defaultPriceList.diving.find(
    (item) => item.id === "diving-fun-dive-waigeo",
  );
  assert.equal(waigeo.info.id, "1 hari, 2x selam di terumbu pesisir Waigeo");
  assert.deepEqual(priceIncludes(waigeo, "en"), [
    "Divemaster",
    "Tanks and weights",
    "Island picnic lunch",
    "Papuan coffee, tea & fresh fruit",
    "Marine park pre-dive briefing",
  ]);
  // Without English lines, English visitors read the Indonesian ones.
  assert.deepEqual(
    priceIncludes({ includes: { id: ["Divemaster"], en: [] } }, "en"),
    ["Divemaster"],
  );
  assert.deepEqual(priceIncludes({}, "id"), []);
  // A list saved at revision 2 with the long summaries: the ones still as
  // they shipped are split, the one the owner rewrote stays.
  const saved = structuredClone(defaultPriceList);
  saved.revision = 2;
  const before = {
    "diving-discovery-dive": [
      "2x selam + pemandu. Gratis dokumentasi bawah air untuk lebih dari 4 peserta",
      "2 dives + guide. Free underwater documentation for groups over 4",
    ],
    "diving-fun-dive-waigeo": [
      "1 hari, 2x selam di terumbu pesisir Waigeo. Divemaster, tabung, pemberat, makan siang di pulau, kopi Papua, teh & buah",
      "1 day, 2 dives on the Waigeo coastal reefs. Divemaster, tanks, weights, island picnic lunch, Papuan coffee, tea & fruit",
    ],
    "diving-fun-dive-dampier": ["Paket favorit tamu kami", ""],
  };
  saved.diving = saved.diving.map(({ includes, ...item }) =>
    before[item.id]
      ? { ...item, info: { id: before[item.id][0], en: before[item.id][1] } }
      : item,
  );
  const list = withPriceList({ priceList: saved }).priceList;
  const byId = Object.fromEntries(list.diving.map((item) => [item.id, item]));
  assert.equal(
    byId["diving-discovery-dive"].info.id,
    "Selam pertama, 2x selam",
  );
  assert.equal(byId["diving-discovery-dive"].includes.id.length, 2);
  assert.equal(byId["diving-fun-dive-waigeo"].includes.en.length, 5);
  assert.equal(
    byId["diving-fun-dive-dampier"].info.id,
    "Paket favorit tamu kami",
  );
  assert.equal(byId["diving-fun-dive-dampier"].includes, undefined);
  assert.equal(list.revision, 3);
  // Saved from the admin: blank lines go, empty lists are not kept, and
  // more than eight lines are refused.
  const kept = validatePriceList(
    {
      ...list,
      diving: list.diving.map((item, i) =>
        i === 0
          ? { ...item, includes: { id: ["  Pemandu ", "", "Foto"], en: [] } }
          : i === 1
            ? { ...item, includes: { id: [""], en: [""] } }
            : item,
      ),
    },
    gear,
  );
  assert.deepEqual(kept.diving[0].includes, {
    id: ["Pemandu", "Foto"],
    en: [],
  });
  assert.equal("includes" in kept.diving[1], false);
  assert.throws(
    () =>
      validatePriceList(
        {
          ...list,
          diving: [
            { ...list.diving[0], includes: { id: Array(9).fill("x"), en: [] } },
          ],
        },
        gear,
      ),
    /maksimal 8 baris/,
  );
});
