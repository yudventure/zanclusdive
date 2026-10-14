// Package prices shown beside the experience cards, from the Zanclus Dive
// Center 2025 price list. Editable in the CMS; each text has both languages.
export const priceGroups = ["diving", "snorkeling", "trip"];
// Gear rental lists shown in the homepage Dive Shop section.
export const rentalGroups = [
  "rentalBasics",
  "rentalScuba",
  "rentalTank",
  "rentalTools",
  "rentalCamera",
];
// Services that are neither gear nor an activity of their own (photo and
// video, transport, meals). They show only as add-ons on activity pages.
export const extraGroups = ["extras"];
export const allPriceGroups = [...priceGroups, ...rentalGroups, ...extraGroups];
// Admin labels for the rental lists.
export const rentalLabels = {
  rentalBasics: "Sewa masker, snorkel & fin",
  rentalScuba: "Sewa BCD, regulator & wetsuit",
  rentalTank: "Tabung & isi ulang",
  rentalTools: "Dive computer, senter & pelampung",
  rentalCamera: "Sewa kamera bawah air",
};
export const extraLabels = { extras: "Layanan tambahan" };
// Add-ons offered on one activity page, picked from the other lists.
export const addOnLimit = 16;

const item = (nameId, nameEn, infoId, infoEn, price, unitId, unitEn) => ({
  name: { id: nameId, en: nameEn },
  info: { id: infoId, en: infoEn },
  price,
  unit: { id: unitId, en: unitEn },
});
const day = ["/ hari", "/ day"];
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
function hasIds(list) {
  const seen = new Set();
  return allPriceGroups.every((group) =>
    list[group].every((entry) => {
      if (!idPattern.test(entry?.id ?? "") || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }),
  );
}
function withIds(list) {
  // Ids already given are reserved; the first item holding one keeps it.
  const taken = new Set(
    allPriceGroups.flatMap((group) =>
      Array.isArray(list[group])
        ? list[group]
            .map((entry) => entry?.id)
            .filter((id) => idPattern.test(id ?? ""))
        : [],
    ),
  );
  const used = new Set();
  const out = { ...list };
  for (const group of allPriceGroups) {
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

export const defaultPriceList = (() => {
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

// Older CMS documents gain the default price list, lists added later, item
// ids and add-ons, without losing saved prices.
export function withPriceList(content) {
  const saved = content.priceList;
  if (!saved)
    return { ...content, priceList: structuredClone(defaultPriceList) };
  const missing = allPriceGroups.filter(
    (group) => !Array.isArray(saved[group]),
  );
  const legacy = !saved.addOns;
  if (!missing.length && !legacy && hasIds(saved)) return content;
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
  return {
    ...content,
    priceList: { ...list, addOns: legacy ? namedAddOns(list) : saved.addOns },
  };
}

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

export function validatePriceList(input) {
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
  // Add-ons point at items of the other lists. An item deleted from its
  // list drops out of the add-ons.
  const home = new Map(
    allPriceGroups.flatMap((group) =>
      list[group].map((entry) => [entry.id, group]),
    ),
  );
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
          (id) => home.has(id) && home.get(id) !== activity,
        ),
      ];
    }),
  );
  return { ...list, addOns };
}

// The add-ons of an activity page, in the order they were picked, each with
// the list it comes from.
export function addOnItems(priceList, activity) {
  const items = [];
  for (const id of priceList?.addOns?.[activity] ?? [])
    for (const group of allPriceGroups) {
      if (group === activity) continue;
      const entry = (priceList[group] ?? []).find((e) => e?.id === id);
      if (!entry) continue;
      if (Number.isSafeInteger(entry.price) && entry.price > 0)
        items.push({ ...entry, group });
      break;
    }
  return items;
}

// A text in the visitor's language, falling back to Indonesian.
export const priceText = (value, locale) =>
  (locale === "en" && value.en) || value.id;
