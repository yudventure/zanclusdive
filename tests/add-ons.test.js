import test from "node:test";
import assert from "node:assert/strict";
import {
  addOnItems,
  addOnLimit,
  allPriceGroups,
  defaultPriceList,
  validatePriceList,
  withPriceList,
} from "../src/price-list.js";
import { priceOrder } from "../src/order-pricing.js";
import { defaultContent, validateContent } from "../src/cms-model.js";
import { visitorLocks } from "../src/developer.js";

const names = (items) => items.map((item) => item.name.id);
const plain = (items) => structuredClone(items).map(({ id, ...item }) => item);
const day = { id: "/ hari", en: "/ day" };

test("diving lists the dives; gear, cameras and documentation are add-ons", () => {
  assert.deepEqual(names(defaultPriceList.diving), [
    "Discovery Dive",
    "Pemandu selam",
  ]);
  assert.deepEqual(names(defaultPriceList.extras), ["Dokumentasi"]);
  assert.equal(defaultPriceList.rentalScuba[0].name.id, "Perlengkapan scuba");
  const addOns = addOnItems(defaultPriceList, "diving");
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
  assert.deepEqual(addOnItems(defaultPriceList, "snorkeling"), []);
  // Every item has its own id.
  const ids = allPriceGroups.flatMap((group) =>
    defaultPriceList[group].map((item) => item.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)));
  assert.deepEqual(validatePriceList(defaultPriceList), defaultPriceList);
});

test("a diving list saved before add-ons moves its gear and documentation", () => {
  // The live site: six diving items, rental lists without ids, no extras.
  const saved = Object.fromEntries(
    allPriceGroups
      .filter((group) => group !== "extras")
      .map((group) => [group, plain(defaultPriceList[group])]),
  );
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
  assert.deepEqual(names(list.diving), ["Discovery Dive", "Pemandu selam"]);
  // The owner's own price for documentation is kept.
  assert.deepEqual(
    list.extras.map((item) => [item.id, item.price]),
    [["extras-dokumentasi", 550000]],
  );
  assert.equal(list.rentalScuba.at(-1).name.id, "Perlengkapan scuba");
  // Tank and dive computer were already in their rental lists.
  assert.equal(
    list.rentalTank.filter((item) => item.name.id === "Tabung + isi ulang")
      .length,
    1,
  );
  assert.deepEqual(list.addOns, defaultPriceList.addOns);
  // Read again, nothing changes.
  assert.equal(withPriceList(content), content);
  assert.deepEqual(validatePriceList(list).addOns, list.addOns);
});

test("items the owner removed are not brought back as add-ons", () => {
  const saved = Object.fromEntries(
    allPriceGroups
      .filter((group) => group !== "extras")
      .map((group) => [group, plain(defaultPriceList[group])]),
  );
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
  const list = withPriceList({ priceList: saved }).priceList;
  // No documentation in diving, so none in the extras either.
  assert.deepEqual(list.extras, []);
  // The tank goes to the empty tank list with its own price.
  assert.deepEqual(
    list.rentalTank.map((item) => [item.name.id, item.price]),
    [["Tabung + isi ulang", 90000]],
  );
  assert.deepEqual(names(addOnItems(list, "diving")), [
    "Perlengkapan scuba",
    "Tabung + isi ulang",
    "Dive computer D4i",
    "Kamera bawah air TG-5",
    "Kamera TG-5 + perlengkapan",
  ]);
  // Content without any price list gets the defaults.
  assert.deepEqual(
    withPriceList({}).priceList,
    structuredClone(defaultPriceList),
  );
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
    {
      addOn: "rentalcamera-kamera-bawah-air-tg-5",
      itemName: "Kamera bawah air TG-5",
      quantity: 1,
    },
    { addOn: "extras-dokumentasi", itemName: "Dokumentasi", quantity: 1 },
  ]);
  assert.equal(paid.amount, 2 * 1200000 + 650000 + 500000);
  assert.deepEqual(
    paid.lines.map((line) => [line.id, line.addOn]),
    [
      ["diving-0", false],
      ["addon-rentalcamera-kamera-bawah-air-tg-5", true],
      ["addon-extras-dokumentasi", true],
    ],
  );
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
