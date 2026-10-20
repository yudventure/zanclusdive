import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingPriceGroups,
  defaultQuantity,
  formatRupiah,
  groupsFor,
  packagesTotal,
  parseRupiah,
  validatePackages,
} from "../src/booking-price.js";
import { validateBooking } from "../src/cms-model.js";
import { demoSeed } from "../src/demo-data.js";

const { content } = demoSeed(new Date("2026-10-18T00:00:00Z"), {
  sampleBookings: false,
});

test("the website's prices are offered to the booking form", () => {
  const groups = bookingPriceGroups(content);
  assert.deepEqual(
    groups.map((g) => g.label),
    [
      "Program diving",
      "Diving",
      "Snorkeling",
      "Trip laut",
      "Layanan tambahan",
      "Kursus selam",
      "Sewa alat Dive Shop",
      "Barang Dive Shop",
      "Servis alat",
    ],
  );
  const all = groups.flatMap((g) => g.items);
  assert.ok(all.every((i) => i.name && i.price > 0));
  assert.deepEqual(
    all.find((i) => i.key === "price:diving-discovery-dive"),
    {
      key: "price:diving-discovery-dive",
      name: "Discovery Dive",
      price: 1200000,
      unit: "/ orang",
    },
  );
  assert.equal(all.find((i) => i.key === "exp:beginner").price, 900000);
  assert.equal(all.find((i) => i.key === "rent:demo-mask-sewa").unit, "/ hari");
  assert.equal(all.find((i) => i.key === "sale:demo-mask").price, 650000);
  assert.equal(all.find((i) => i.key === "service:regulator").price, 650000);
  // Unpriced items stay out, and the booking's own program comes first.
  const noPrice = structuredClone(content);
  noPrice.priceList.diving[0].price = null;
  assert.ok(
    !bookingPriceGroups(noPrice)
      .flatMap((g) => g.items)
      .some((i) => i.key === "price:diving-discovery-dive"),
  );
  assert.equal(groupsFor(groups, "snorkeling")[0].label, "Snorkeling");
  assert.equal(groupsFor(groups, "shop")[0].label, "Sewa alat Dive Shop");
  assert.equal(groupsFor(groups, "course")[0].label, "Kursus selam");
});

test("a picked price takes its quantity from the people or the days", () => {
  const booking = {
    participants: 12,
    startDate: "2026-10-29",
    endDate: "2026-11-01",
  };
  assert.equal(defaultQuantity("/ orang", booking), 12);
  assert.equal(defaultQuantity("/ hari", booking), 4);
  assert.equal(defaultQuantity("/ malam", booking), 3);
  assert.equal(defaultQuantity("/ trip", booking), 1);
  assert.equal(
    defaultQuantity("/ malam", { ...booking, endDate: "2026-10-29" }),
    1,
  );
});

test("typed rupiah amounts are read as written", () => {
  assert.equal(parseRupiah("1.500.000"), 1500000);
  assert.equal(parseRupiah("Rp 1.500.000"), 1500000);
  assert.equal(parseRupiah("1500000"), 1500000);
  assert.equal(parseRupiah("Rp 1.500.000,00"), 1500000);
  assert.equal(parseRupiah("1.500"), 1500);
  assert.equal(parseRupiah(""), 0);
  assert.equal(parseRupiah("abc"), 0);
  assert.equal(formatRupiah(17400000), "17.400.000");
  assert.equal(formatRupiah(0), "");
});

test("package lines set the reservation value unless typed by hand", () => {
  const packages = [
    {
      key: "price:diving-discovery-dive",
      name: "Discovery Dive",
      price: 1200000,
      unit: "/ orang",
      quantity: 12,
    },
    {
      key: "price:diving-pemandu-selam",
      name: "Pemandu selam",
      price: 750000,
      unit: "/ hari",
      quantity: 4,
    },
  ];
  assert.equal(packagesTotal(packages), 17400000);
  const base = {
    experience: "diving",
    status: "confirmed",
    source: "whatsapp",
    startDate: "2026-10-29",
    endDate: "2026-11-01",
    guestName: "Grup Jakarta",
    participants: 12,
    amount: 5,
  };
  const auto = validateBooking({ ...base, packages });
  assert.equal(auto.amount, 17400000, "the server adds the lines up");
  assert.deepEqual(auto.packages, packages);
  assert.equal(auto.amountManual, undefined);
  const manual = validateBooking({
    ...base,
    packages,
    amountManual: true,
    amount: 16000000,
  });
  assert.equal(manual.amount, 16000000);
  assert.equal(manual.amountManual, true);
  // Without lines, the typed value stays, and no empty lists are kept.
  const plain = validateBooking({ ...base, packages: [], amount: 2500000 });
  assert.equal(plain.amount, 2500000);
  assert.equal(plain.packages, undefined);
  assert.throws(
    () => validatePackages([{ ...packages[0], quantity: 0 }]),
    /Jumlah tiap paket 1–1000/,
  );
  assert.throws(
    () => validatePackages([{ ...packages[0], key: "<script>" }]),
    /Paket tidak valid/,
  );
  assert.throws(
    () => validatePackages([{ ...packages[0], price: 999000000, quantity: 2 }]),
    /melebihi/,
  );
  assert.throws(
    () => validatePackages(Array.from({ length: 21 }, () => packages[0])),
    /maksimal 20/,
  );
});
