// Package prices shown beside the experience cards, from the Zanclus Dive
// Center price list (2026). Editable in the CMS; each text has both languages.
import { dictionary } from "./i18n.js";
import { rentalAddOn, rentalTabOf, shopAddOn } from "./shop-model.js";

export const priceGroups = ["diving", "snorkeling", "trip"];
// Gear rental lists of the homepage before rental gear became Dive Shop
// products with their own stock. Content saved with them moves every item
// to a rental product (withRentalProducts) and keeps no rental lists.
export const legacyRentalGroups = [
  "rentalBasics",
  "rentalScuba",
  "rentalTank",
  "rentalTools",
  "rentalCamera",
];
// Services that are neither gear nor an activity of their own (photo and
// video, transport, meals). They show only as add-ons on activity pages.
export const extraGroups = ["extras"];
export const allPriceGroups = [...priceGroups, ...extraGroups];
export const extraLabels = { extras: "Layanan tambahan" };
// An add-on that is Dive Shop rental gear: "shop:" and the product id.
export { shopAddOn };
// Add-ons offered on one activity page, picked from the other lists.
export const addOnLimit = 16;

const item = (nameId, nameEn, infoId, infoEn, price, unitId, unitEn) => ({
  name: { id: nameId, en: nameEn },
  info: { id: infoId, en: infoEn },
  price,
  unit: { id: unitId, en: unitEn },
});
const day = ["/ hari", "/ day"];
// Fun dive packages, one day per diver, priced as the owner set them in
// October 2026. Lists saved before get them once (priceRevision).
const funDives = [
  {
    id: "diving-fun-dive-waigeo",
    ...item(
      "Fun Dive Pesisir Waigeo",
      "Fun Dive Waigeo Coastal Reefs",
      "1 hari, 2x selam di terumbu pesisir Waigeo. Divemaster, tabung, pemberat, makan siang di pulau, kopi Papua, teh & buah",
      "1 day, 2 dives on the Waigeo coastal reefs. Divemaster, tanks, weights, island picnic lunch, Papuan coffee, tea & fruit",
      2100000,
      "/ penyelam",
      "/ diver",
    ),
  },
  {
    id: "diving-fun-dive-dampier",
    ...item(
      "Fun Dive Kri, Mansuar & Arborek",
      "Fun Dive Kri, Mansuar & Arborek",
      "1 hari, 3x selam di Selat Dampier. Grup kecil, 1 pemandu untuk 4 penyelam, speedboat, makan siang di pantai pasir atau dermaga",
      "1 day, 3 dives in the Dampier Strait. Small group, 1 guide per 4 divers, speedboat, lunch on a sandbank or jetty",
      2700000,
      "/ penyelam",
      "/ diver",
    ),
  },
  {
    id: "diving-fun-dive-piaynemo",
    ...item(
      "Fun Dive Piaynemo",
      "Fun Dive Piaynemo",
      "1 hari, 2x selam di Melissa's Garden & Batu Rufas, mendaki puncak Piaynemo, Telaga Bintang, speedboat, izin masuk, makan siang",
      "1 day, 2 dives at Melissa's Garden & Batu Rufas, Piaynemo viewpoint hike, Star Lagoon, speedboat, entry permits, lunch",
      4000000,
      "/ penyelam",
      "/ diver",
    ),
  },
];
const defaultItems = {
  diving: [
    item(
      "Discovery Dive",
      "Discovery Dive",
      "2x selam + pemandu. Gratis dokumentasi bawah air untuk lebih dari 4 peserta",
      "2 dives + guide. Free underwater documentation for groups over 4",
      1200000,
      "/ orang",
      "/ person",
    ),
    item(
      "Pemandu selam",
      "Dive guide",
      "2x selam, satu hari",
      "2 dives, one day",
      750000,
      ...day,
    ),
    ...funDives,
  ],
  snorkeling: [
    item(
      "Pemandu snorkeling",
      "Snorkeling guide",
      "Pendampingan satu hari",
      "One day with a guide",
      500000,
      ...day,
    ),
    item(
      "Set snorkeling",
      "Snorkeling set",
      "Masker, snorkel, fins",
      "Mask, snorkel, fins",
      150000,
      ...day,
    ),
    item(
      "Fin full foot",
      "Full-foot fins",
      "Sewa satu hari",
      "One-day rental",
      50000,
      ...day,
    ),
    item(
      "Pelampung",
      "Life jacket",
      "Sewa satu hari",
      "One-day rental",
      50000,
      ...day,
    ),
    item(
      "GoPro Hero 11 + housing",
      "GoPro Hero 11 + housing",
      "Rekam momen di bawah air",
      "Film your time underwater",
      500000,
      ...day,
    ),
    item(
      "Kamera bawah air TG-5",
      "Underwater camera TG-5",
      "Sewa satu hari",
      "One-day rental",
      650000,
      ...day,
    ),
  ],
  trip: [
    item(
      "Speedboat Waisai – Pianemo",
      "Speedboat Waisai – Pianemo",
      "Charter 1 hari, maks. 10 penumpang",
      "1-day charter, up to 10 passengers",
      8000000,
      ...day,
    ),
    item(
      "Speedboat Sorong – Waisai",
      "Speedboat Sorong – Waisai",
      "Charter 1 hari, maks. 10 penumpang",
      "1-day charter, up to 10 passengers",
      10000000,
      ...day,
    ),
    item(
      "Dive boat kecil",
      "Small dive boat",
      "5–10 penyelam, 2x selam, area Arborek",
      "5–10 divers, 2 dives, Arborek area",
      4000000,
      "/ trip",
      "/ trip",
    ),
    item(
      "Dive boat sedang",
      "Medium dive boat",
      "10–15 penyelam, 2x selam, area Arborek",
      "10–15 divers, 2 dives, Arborek area",
      8000000,
      "/ trip",
      "/ trip",
    ),
    item(
      "Fishing boat",
      "Fishing boat",
      "2 hari 1 malam",
      "2 days, 1 night",
      7000000,
      "/ trip",
      "/ trip",
    ),
    item(
      "Homestay",
      "Homestay",
      "2 orang, sarapan, makan siang & malam",
      "2 people, breakfast, lunch & dinner",
      1000000,
      "/ malam",
      "/ night",
    ),
  ],
  rentalBasics: [
    item("Masker", "Mask", "", "", 50000, ...day),
    item("Snorkel", "Snorkel", "", "", 50000, ...day),
    item("Fin full foot", "Full-foot fins", "", "", 50000, ...day),
    item("Fin open heel", "Open-heel fins", "", "", 100000, ...day),
    item("Booties", "Booties", "", "", 50000, ...day),
  ],
  rentalScuba: [
    item(
      "Perlengkapan scuba",
      "Scuba equipment",
      "Mask, fins, BCD, regulator, wetsuit",
      "Mask, fins, BCD, regulator, wetsuit",
      600000,
      ...day,
    ),
    item("BCD", "BCD", "", "", 150000, ...day),
    item("Regulator", "Regulator", "", "", 150000, ...day),
    item("Wetsuit", "Wetsuit", "", "", 100000, ...day),
    item(
      "Weight belt",
      "Weight belt",
      "Pemberat 5 kg",
      "5 kg of weights",
      50000,
      ...day,
    ),
  ],
  rentalTank: [
    item(
      "Tabung + isi ulang",
      "Tank + refill",
      "Satu tabung penuh (200 bar)",
      "One full tank (200 bar)",
      100000,
      "/ tabung",
      "/ tank",
    ),
    item(
      "Isi ulang",
      "Refill",
      "Untuk tabung kosong milikmu",
      "For your own empty tank",
      60000,
      "/ tabung",
      "/ tank",
    ),
  ],
  rentalTools: [
    item("Dive computer D4i", "Dive computer D4i", "", "", 500000, ...day),
    item("Senter selam", "Dive torch", "", "", 100000, ...day),
    item("Pelampung", "Life jacket", "", "", 50000, ...day),
  ],
  rentalCamera: [
    item(
      "Kamera bawah air TG-5",
      "Underwater camera TG-5",
      "",
      "",
      650000,
      ...day,
    ),
    item(
      "Kamera TG-5 + perlengkapan",
      "TG-5 camera + gear",
      "",
      "",
      1500000,
      ...day,
    ),
    item(
      "GoPro Hero 11 + housing",
      "GoPro Hero 11 + housing",
      "",
      "",
      500000,
      ...day,
    ),
  ],
  extras: [
    item(
      "Dokumentasi",
      "Documentation",
      "Foto & video bawah air",
      "Underwater photo & video",
      500000,
      ...day,
    ),
  ],
};

// Every item has an id, so an add-on keeps pointing at its item after a
// list is sorted or the item renamed. Items saved without one get it from
// their list and Indonesian name; ids already given win.
const idPattern = /^[a-z0-9][a-z0-9-]{0,59}$/;
const slug = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
const idGroups = [...allPriceGroups, ...legacyRentalGroups];
function hasIds(list) {
  const seen = new Set();
  return idGroups.every((group) =>
    (list[group] ?? []).every((entry) => {
      if (!idPattern.test(entry?.id ?? "") || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }),
  );
}
function withIds(list) {
  // Ids already given are reserved; the first item holding one keeps it.
  const taken = new Set(
    idGroups.flatMap((group) =>
      Array.isArray(list[group])
        ? list[group]
            .map((entry) => entry?.id)
            .filter((id) => idPattern.test(id ?? ""))
        : [],
    ),
  );
  const used = new Set();
  const out = { ...list };
  for (const group of idGroups) {
    if (!Array.isArray(list[group])) continue;
    out[group] = list[group].map((entry) => {
      if (idPattern.test(entry?.id ?? "") && !used.has(entry.id)) {
        used.add(entry.id);
        return entry;
      }
      const base = `${group.toLowerCase()}-${slug(entry?.name?.id) || "item"}`;
      let id = base;
      for (let n = 2; used.has(id) || taken.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      return { ...entry, id };
    });
  }
  return out;
}

// Beside the dives, the diving page offers its gear, the cameras and the
// photo and video service as add-ons. Snorkeling and trips start without.
const defaultAddOnNames = {
  diving: [
    ["rentalScuba", "Perlengkapan scuba"],
    ["rentalTank", "Tabung + isi ulang"],
    ["rentalTools", "Dive computer D4i"],
    ["rentalCamera", "Kamera bawah air TG-5"],
    ["rentalCamera", "Kamera TG-5 + perlengkapan"],
    ["rentalCamera", "GoPro Hero 11 + housing"],
    ["extras", "Dokumentasi"],
  ],
};
const namedAddOns = (list) =>
  Object.fromEntries(
    priceGroups.map((activity) => [
      activity,
      (defaultAddOnNames[activity] ?? [])
        .map(
          ([group, name]) =>
            list[group]?.find((entry) => entry?.name?.id === name)?.id,
        )
        .filter(Boolean),
    ]),
  );

// The price list as it was before rental gear moved to the Dive Shop: new
// and old content start from it and move its rental lists.
export const legacyPriceList = (() => {
  const list = withIds(defaultItems);
  return { ...list, addOns: namedAddOns(list) };
})();

// The diving list held its gear and documentation beside the dives before
// add-ons. Content saved then moves each to the list it belongs to, or uses
// the same item already there, and diving offers them as add-ons.
const movedFromDiving = {
  "Perlengkapan scuba": "rentalScuba",
  "Tabung + isi ulang": "rentalTank",
  "Dive computer D4i": "rentalTools",
  Dokumentasi: "extras",
};

// Packages added to saved lists once, in order: 1 the fun dives. A list
// saved since keeps what the owner made of them, deleted ones included.
export const priceRevision = 1;
function withRevisions(list) {
  if ((Number(list.revision) || 0) >= priceRevision) return list;
  const diving = Array.isArray(list.diving) ? list.diving : [];
  const added = funDives
    .filter((entry) => !diving.some((other) => other?.id === entry.id))
    .slice(0, Math.max(0, 8 - diving.length));
  return {
    ...list,
    diving: [...diving, ...structuredClone(added)],
    revision: priceRevision,
  };
}

// Older CMS documents gain the default price list, lists added later, item
// ids and add-ons, without losing saved prices. Documents from before rental
// gear moved to the Dive Shop show the rental lists they showed then, and
// move them to rental products.
export function withPriceList(content) {
  if (!content.priceList)
    return withRentalProducts({
      ...content,
      priceList: withRevisions(structuredClone(legacyPriceList)),
    });
  const saved = withRevisions(content.priceList);
  const moved = saved.rentals === "shop";
  const missing = (moved ? allPriceGroups : idGroups).filter(
    (group) => !Array.isArray(saved[group]),
  );
  const legacy = !saved.addOns;
  if (moved && !missing.length && !legacy && hasIds(saved))
    return saved === content.priceList
      ? content
      : { ...content, priceList: saved };
  let list = { ...saved };
  for (const group of missing)
    list[group] =
      legacy && group === "extras" ? [] : structuredClone(defaultItems[group]);
  if (legacy)
    list.diving = list.diving.filter((entry) => {
      const target = movedFromDiving[entry?.name?.id];
      if (!target) return true;
      if (list[target].some((other) => other?.name?.id === entry.name.id))
        return false;
      if (list[target].length >= 8) return true;
      list[target] = [...list[target], entry];
      return false;
    });
  list = withIds(list);
  const priceList = {
    ...list,
    addOns: legacy ? namedAddOns(list) : saved.addOns,
  };
  return moved
    ? { ...content, priceList }
    : withRentalProducts({ ...content, priceList });
}

// Every item of the old rental lists becomes a Dive Shop product for rent
// only, with its price per day, its own stock in Gudang (0 until the team
// fills it in) and its English name. Add-ons that pointed at an item now
// point at its product. A product moved before (an older admin page that
// saved the lists again) is used, not copied.
const rentalKinds = [
  [/masker|mask|snorkel/i, "mask"],
  [/fin|booties/i, "fins"],
  [/wetsuit/i, "suit"],
  [/weight|pemberat/i, "weight"],
  [/pelampung|life ?jacket/i, "vest"],
  [/scuba|bcd/i, "bcd"],
  [/regulator/i, "regulator"],
  [/tabung|isi ulang|tank|refill/i, "cylinder"],
  [/computer/i, "computer"],
  [/senter|torch|lampu/i, "light"],
  [/kamera|camera|gopro/i, "camera"],
];
const kindOfGroup = {
  rentalBasics: "mask",
  rentalScuba: "bcd",
  rentalTank: "cylinder",
  rentalTools: "computer",
  rentalCamera: "camera",
};
// The kind of gear from its name, kept in the tab it was listed under.
function rentalKind(name, group) {
  const kind = rentalKinds.find(([rule]) => rule.test(name))?.[1];
  return kind && rentalTabOf[kind] === group ? kind : kindOfGroup[group];
}
export function withRentalProducts(content) {
  const list = content.priceList ?? {};
  const shop = content.shop ?? { products: [] };
  const products = [...(shop.products ?? [])];
  const before = new Set(products.map((p) => p.id));
  const en = content.en ? structuredClone(content.en) : null;
  const ids = new Map();
  for (const group of legacyRentalGroups)
    for (const entry of Array.isArray(list[group]) ? list[group] : []) {
      const name = String(entry?.name?.id ?? "")
        .trim()
        .slice(0, 100);
      if (!name) continue;
      const base = `sewa-${slug(name) || "alat"}`;
      let id = base;
      for (let n = 2; !before.has(id) && products.some((p) => p.id === id); n++)
        id = `${base}-${n}`;
      if (!before.has(id)) {
        const price = Number(entry.price);
        products.push({
          id,
          name,
          category: rentalKind(name, group),
          description: dictionary("id").shop.teaser.groups[group][1],
          specification: String(entry.info?.id ?? "").slice(0, 300),
          image: "",
          images: [],
          rentalImages: [],
          videos: [],
          details: "",
          specs: [],
          sizes: [],
          saleEnabled: false,
          rentalEnabled: true,
          salePrice: null,
          rentalPrice:
            Number.isSafeInteger(price) && price > 0 && price <= 1e9
              ? price
              : null,
          enabled: true,
          // Orderable as before until the team fills in the stock.
          availability: "available",
        });
        if (en)
          en.shop = {
            ...en.shop,
            products: {
              ...en.shop?.products,
              [id]: {
                name: String(entry.name?.en || name).slice(0, 100),
                description: dictionary("en").shop.teaser.groups[group][1],
                specification: String(entry.info?.en ?? "").slice(0, 300),
              },
            },
          };
      }
      if (entry.id) ids.set(entry.id, id);
    }
  const priceList = Object.fromEntries(
    Object.entries(list).filter(([key]) => !legacyRentalGroups.includes(key)),
  );
  priceList.addOns = Object.fromEntries(
    Object.entries(list.addOns ?? {}).map(([activity, chosen]) => [
      activity,
      Array.isArray(chosen)
        ? chosen.map((id) => (ids.has(id) ? shopAddOn + ids.get(id) : id))
        : chosen,
    ]),
  );
  priceList.rentals = "shop";
  return {
    ...content,
    priceList,
    shop: { ...shop, products },
    ...(en ? { en } : {}),
  };
}

// The default price list: packages, services and add-ons, with the rental
// gear as Dive Shop products.
// The year in the title over every price list ("PRICE LIST 2026"), set in
// the admin; a list without one shows this year.
export const defaultPriceYear = 2026;
export const priceYear = (priceList) =>
  Number.isInteger(priceList?.year) ? priceList.year : defaultPriceYear;
export const defaultPriceList = withRentalProducts({
  priceList: withRevisions(structuredClone(legacyPriceList)),
}).priceList;

function text(value, label, max, required) {
  const out = {};
  for (const lang of ["id", "en"]) {
    const v = value?.[lang];
    if (
      typeof v !== "string" ||
      v.length > max ||
      (required && lang === "id" && !v.trim())
    )
      throw new Error(`${label} pada daftar harga tidak valid.`);
    out[lang] = v.trim();
  }
  return out;
}

// "products" are the saved catalog, for add-ons that are rental gear.
export function validatePriceList(input, products = []) {
  const ided = withIds(input ?? {});
  const list = Object.fromEntries(
    allPriceGroups.map((group) => {
      const items = ided[group];
      if (!Array.isArray(items) || items.length > 8)
        throw new Error("Daftar harga berisi maksimal 8 item per daftar.");
      return [
        group,
        items.map((entry) => {
          const price = Number(entry?.price);
          if (!Number.isSafeInteger(price) || price <= 0 || price > 1e9)
            throw new Error(
              "Harga pada daftar harga harus berupa rupiah positif.",
            );
          return {
            id: entry.id,
            name: text(entry.name, "Nama item", 80, true),
            info: text(entry.info, "Keterangan", 160, false),
            price,
            unit: text(entry.unit, "Satuan", 20, false),
          };
        }),
      ];
    }),
  );
  // Add-ons point at items of the other lists, or at Dive Shop rental
  // gear. An item or product deleted drops out of the add-ons.
  const home = new Map(
    allPriceGroups.flatMap((group) =>
      list[group].map((entry) => [entry.id, group]),
    ),
  );
  const gear = new Set(products.map((p) => shopAddOn + p.id));
  const addOns = Object.fromEntries(
    priceGroups.map((activity) => {
      const chosen = input?.addOns?.[activity] ?? [];
      if (!Array.isArray(chosen) || chosen.length > addOnLimit)
        throw new Error(
          `Add-on berisi maksimal ${addOnLimit} item per aktivitas.`,
        );
      return [
        activity,
        [...new Set(chosen)].filter(
          (id) => gear.has(id) || (home.has(id) && home.get(id) !== activity),
        ),
      ];
    }),
  );
  // The year is kept only when the owner set one.
  const set = ![undefined, null, ""].includes(input?.year);
  const year = Number(input?.year);
  if (set && (!Number.isInteger(year) || year < 2020 || year > 2100))
    throw new Error("Tahun daftar harga harus antara 2020 dan 2100.");
  return {
    ...list,
    addOns,
    rentals: "shop",
    revision: priceRevision,
    ...(set ? { year } : {}),
  };
}

// The add-ons of an activity page, in the order they were picked, each with
// the list it comes from. Rental gear from "products" (the Dive Shop
// catalog) is rented for the activity's day, under its homepage tab.
export function addOnItems(priceList, activity, products = []) {
  const items = [];
  for (const id of priceList?.addOns?.[activity] ?? []) {
    if (String(id).startsWith(shopAddOn)) {
      const product = products.find((p) => shopAddOn + p.id === id);
      if (rentalAddOn(product))
        items.push({
          id,
          name: { id: product.name, en: product.name },
          info: {
            id: product.specification ?? "",
            en: product.specification ?? "",
          },
          price: product.rentalPrice,
          unit: { id: "/ hari", en: "/ day" },
          group: rentalTabOf[product.category] ?? "rentalTools",
          product,
        });
      continue;
    }
    for (const group of allPriceGroups) {
      if (group === activity) continue;
      const entry = (priceList[group] ?? []).find((e) => e?.id === id);
      if (!entry) continue;
      if (Number.isSafeInteger(entry.price) && entry.price > 0)
        items.push({ ...entry, group });
      break;
    }
  }
  return items;
}

// A text in the visitor's language, falling back to Indonesian.
export const priceText = (value, locale) =>
  (locale === "en" && value.en) || value.id;
