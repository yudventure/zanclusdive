import test from "node:test";
import assert from "node:assert/strict";
import {
  addOnItems,
  addOnLimit,
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
  assert.equal(list.revision, 1);
  // Saved from the admin, one deleted, it stays deleted.
  const edited = validatePriceList(
    { ...list, diving: list.diving.filter((item) => item.price !== 4000000) },
    gear,
  );
  assert.equal(edited.revision, 1);
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
