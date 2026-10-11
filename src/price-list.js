// Package prices shown beside the experience cards, from the Zanclus Dive
// Center 2025 price list. Editable in the CMS; each text has both languages.
export const priceGroups = ["diving", "snorkeling", "trip"];
// Gear rental lists shown in the homepage Dive Shop section.
export const rentalGroups = [
  "rentalSets",
  "rentalBasics",
  "rentalScuba",
  "rentalTank",
  "rentalTools",
  "rentalCamera",
];
export const allPriceGroups = [...priceGroups, ...rentalGroups];
// Admin labels for the rental lists.
export const rentalLabels = {
  rentalSets: "Sewa paket alat",
  rentalBasics: "Sewa masker, snorkel & fin",
  rentalScuba: "Sewa BCD, regulator & wetsuit",
  rentalTank: "Tabung & isi ulang",
  rentalTools: "Dive computer, senter & pelampung",
  rentalCamera: "Sewa kamera bawah air",
};

const item = (nameId, nameEn, infoId, infoEn, price, unitId, unitEn) => ({
  name: { id: nameId, en: nameEn },
  info: { id: infoId, en: infoEn },
  price,
  unit: { id: unitId, en: unitEn },
});
const day = ["/ hari", "/ day"];
export const defaultPriceList = {
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
    item(
      "Perlengkapan scuba",
      "Scuba equipment",
      "Mask, fins, BCD, regulator, wetsuit",
      "Mask, fins, BCD, regulator, wetsuit",
      600000,
      ...day,
    ),
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
      "Dive computer D4i",
      "Dive computer D4i",
      "Sewa satu hari",
      "One-day rental",
      500000,
      ...day,
    ),
    item(
      "Dokumentasi",
      "Documentation",
      "Foto & video bawah air",
      "Underwater photo & video",
      500000,
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
  rentalSets: [
    item(
      "Perlengkapan scuba",
      "Scuba equipment",
      "Mask, fins, BCD, regulator, wetsuit",
      "Mask, fins, BCD, regulator, wetsuit",
      600000,
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
  ],
  rentalBasics: [
    item("Masker", "Mask", "", "", 50000, ...day),
    item("Snorkel", "Snorkel", "", "", 50000, ...day),
    item("Fin full foot", "Full-foot fins", "", "", 50000, ...day),
    item("Fin open heel", "Open-heel fins", "", "", 100000, ...day),
    item("Booties", "Booties", "", "", 50000, ...day),
  ],
  rentalScuba: [
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
};

// Older CMS documents gain the default price list, and lists added later,
// without losing saved prices.
export function withPriceList(content) {
  const saved = content.priceList || {};
  const missing = allPriceGroups.filter((group) => !saved[group]);
  if (!missing.length) return content;
  return {
    ...content,
    priceList: {
      ...saved,
      ...Object.fromEntries(
        missing.map((group) => [
          group,
          structuredClone(defaultPriceList[group]),
        ]),
      ),
    },
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
  return Object.fromEntries(
    allPriceGroups.map((group) => {
      const items = input?.[group];
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
            name: text(entry.name, "Nama item", 80, true),
            info: text(entry.info, "Keterangan", 160, false),
            price,
            unit: text(entry.unit, "Satuan", 20, false),
          };
        }),
      ];
    }),
  );
}

// A text in the visitor's language, falling back to Indonesian.
export const priceText = (value, locale) =>
  (locale === "en" && value.en) || value.id;
