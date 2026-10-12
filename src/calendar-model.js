// Zanclus activity calendar page: dated activities, a month by month season
// guide, popular dive spots and environmental care plans. Editable in the
// CMS; texts carry Indonesian and English.

export const eventTypes = ["dive", "course", "eco", "community"];
export const eventTypeLabels = {
  dive: "Trip selam",
  course: "Kelas & kursus",
  eco: "Peduli lingkungan",
  community: "Acara komunitas",
};
export const seasonRatings = ["best", "good", "windy"];
export const seasonRatingLabels = {
  best: "Terbaik",
  good: "Baik",
  windy: "Berangin",
};
export const calendarLimits = { events: 60, spots: 12, eco: 8 };

const t = (id, en) => ({ id, en });
const event = (date, type, place, title, description) => ({
  date,
  type,
  place,
  title,
  description,
});

export const defaultCalendar = {
  events: [
    event(
      "2026-10-24",
      "eco",
      "Pantai Waisai",
      t("Bersih pantai Waisai", "Waisai beach clean-up"),
      t(
        "Memungut sampah di pesisir dan memilahnya bersama warga. Terbuka untuk tamu dan keluarga.",
        "Picking up rubbish along the shore and sorting it with local residents. Open to guests and families.",
      ),
    ),
    event(
      "2026-11-07",
      "dive",
      "Cape Kri, Sardine Reef",
      t("Fun dive Cape Kri", "Cape Kri fun dive"),
      t(
        "Dua penyelaman di titik yang terkenal dengan ikan yang sangat beragam. Untuk penyelam bersertifikat.",
        "Two dives at a site known for its huge variety of fish. For certified divers.",
      ),
    ),
    event(
      "2026-11-21",
      "eco",
      "Arborek",
      t("Transplantasi karang Arborek", "Arborek coral planting"),
      t(
        "Menanam bibit karang di rak transplantasi bersama tim dan warga Arborek.",
        "Planting coral fragments on transplant racks with the team and the people of Arborek.",
      ),
    ),
    event(
      "2026-12-05",
      "course",
      "Waisai",
      t("Kelas Discovery Dive", "Discovery Dive class"),
      t(
        "Kenali alat dan dasar menyelam, lalu dua penyelaman pertama ditemani pemandu.",
        "Learn the gear and the basics, then make your first two dives with a guide.",
      ),
    ),
    event(
      "2026-12-19",
      "dive",
      "Manta Sandy",
      t("Trip manta Manta Sandy", "Manta Sandy manta trip"),
      t(
        "Menunggu manta di stasiun pembersihan dengan tetap menjaga jarak dan tidak menyentuh.",
        "Waiting for mantas at the cleaning station while keeping a respectful distance.",
      ),
    ),
    event(
      "2027-01-16",
      "eco",
      "Waisai",
      t("Tanam mangrove", "Mangrove planting"),
      t(
        "Menanam bibit mangrove untuk menjaga pantai dan tempat tumbuh ikan kecil.",
        "Planting mangrove seedlings that protect the shore and shelter young fish.",
      ),
    ),
    event(
      "2027-02-13",
      "dive",
      "Melissa's Garden",
      t("Fun dive Melissa's Garden", "Melissa's Garden fun dive"),
      t(
        "Taman karang keras yang luas dan dangkal di sekitar Piaynemo.",
        "A wide, shallow garden of hard coral near Piaynemo.",
      ),
    ),
    event(
      "2027-03-20",
      "community",
      "Waisai",
      t(
        "Hari Air Sedunia bersama sekolah",
        "World Water Day with local schools",
      ),
      t(
        "Mengenalkan laut dan terumbu kepada anak sekolah, ditutup dengan snorkeling di perairan dangkal.",
        "Introducing schoolchildren to the sea and its reefs, ending with a shallow snorkel.",
      ),
    ),
  ],
  seasons: [
    [
      "good",
      "Laut umumnya tenang, sesekali hujan dan angin barat laut.",
      "Usually calm, with some rain and north-west wind.",
    ],
    [
      "good",
      "Air hangat dan jarak pandang baik di Selat Dampier.",
      "Warm water and good visibility in the Dampier Strait.",
    ],
    [
      "best",
      "Peralihan musim, laut paling tenang. Waktu yang bagus untuk manta.",
      "Between monsoons, the calmest sea. A good time for mantas.",
    ],
    [
      "best",
      "Tenang dan cerah, cocok untuk perjalanan ke Piaynemo.",
      "Calm and clear, a good time to cross to Piaynemo.",
    ],
    [
      "good",
      "Masih nyaman, angin tenggara mulai datang di akhir bulan.",
      "Still comfortable, the south-east wind starts late in the month.",
    ],
    [
      "windy",
      "Angin tenggara membuat penyeberangan lebih bergelombang. Titik terlindung tetap bisa diselami.",
      "South-east winds make crossings choppier. Sheltered sites can still be dived.",
    ],
    [
      "windy",
      "Puncak angin tenggara. Penyelaman dipilih di sisi yang terlindung.",
      "Peak south-east wind. Dives are planned on the sheltered side.",
    ],
    [
      "windy",
      "Masih berangin, laut berangsur tenang di akhir bulan.",
      "Still windy, calming down late in the month.",
    ],
    [
      "good",
      "Angin mereda dan jarak pandang membaik.",
      "The wind drops and visibility improves.",
    ],
    [
      "best",
      "Laut tenang dan air jernih. Awal musim terbaik.",
      "Calm sea and clear water. The start of the best season.",
    ],
    [
      "best",
      "Salah satu bulan terbaik untuk menyelam di Raja Ampat.",
      "One of the best months to dive in Raja Ampat.",
    ],
    [
      "good",
      "Umumnya tenang, angin barat laut mulai datang.",
      "Usually calm, the north-west wind starts to arrive.",
    ],
  ].map(([rating, id, en]) => ({ rating, note: t(id, en) })),
  spots: [
    [
      "Cape Kri",
      t("Oktober sampai April", "October to April"),
      t(
        "Ikan sangat beragam dan arus yang perlu direncanakan bersama pemandu.",
        "A huge variety of fish and currents that need planning with a guide.",
      ),
    ],
    [
      "Blue Magic",
      t("Oktober sampai April", "October to April"),
      t(
        "Gunung bawah laut dengan ikan besar dan sesekali manta oseanik.",
        "A seamount with big fish and the odd oceanic manta.",
      ),
    ],
    [
      "Manta Sandy",
      t("Oktober sampai April", "October to April"),
      t(
        "Stasiun pembersihan manta di dekat Arborek.",
        "A manta cleaning station near Arborek.",
      ),
    ],
    [
      "Sardine Reef",
      t("Sepanjang tahun", "All year"),
      t(
        "Kawanan ikan yang rapat di atas terumbu dangkal.",
        "Dense schools of fish over a shallow reef.",
      ),
    ],
    [
      "Melissa's Garden",
      t("Oktober sampai April", "October to April"),
      t(
        "Taman karang keras yang luas, paling indah saat laut tenang.",
        "A wide hard coral garden, at its best on calm days.",
      ),
    ],
    [
      "Arborek Jetty",
      t("Sepanjang tahun", "All year"),
      t(
        "Kawanan ikan di bawah dermaga, nyaman untuk pemula dan snorkeling.",
        "Schools of fish under the jetty, easy for beginners and snorkelers.",
      ),
    ],
  ].map(([name, best, note]) => ({ name, best, note })),
  eco: [
    [
      t("Bersih pantai dan bawah laut", "Beach and underwater clean-ups"),
      t("Setiap bulan", "Every month"),
      t(
        "Memungut sampah di pantai Waisai dan di titik selam, lalu memilahnya untuk didaur ulang.",
        "Collecting rubbish on Waisai's beaches and at dive sites, then sorting it for recycling.",
      ),
    ],
    [
      t("Transplantasi karang", "Coral planting"),
      t("Setiap tiga bulan", "Every three months"),
      t(
        "Satu rak transplantasi berisi 64 bibit karang F1, dirawat dan dipantau bersama warga.",
        "Each transplant rack holds 64 F1 coral fragments, cared for and monitored with local residents.",
      ),
    ],
    [
      t("Tanam mangrove", "Mangrove planting"),
      t("Musim hujan", "Rainy season"),
      t(
        "Bibit mangrove ditanam di pesisir untuk menahan abrasi dan menjadi rumah ikan kecil.",
        "Mangrove seedlings planted along the coast to hold back erosion and shelter young fish.",
      ),
    ],
    [
      t("Edukasi laut untuk anak sekolah", "Ocean lessons for schoolchildren"),
      t("Setiap semester", "Every semester"),
      t(
        "Mengenalkan terumbu, penyu, dan manta kepada anak pesisir, ditutup snorkeling di air dangkal.",
        "Introducing coastal children to reefs, turtles and mantas, ending with a shallow snorkel.",
      ),
    ],
    [
      t(
        "Menyelam tanpa plastik sekali pakai",
        "Diving without single-use plastic",
      ),
      t("Setiap hari", "Every day"),
      t(
        "Botol minum isi ulang di kapal dan toko, serta panduan menyelam ramah karang untuk tamu.",
        "Refillable water bottles on the boat and in the store, and reef-safe diving tips for guests.",
      ),
    ],
  ].map(([title, when, description]) => ({ title, when, description })),
};

// Older CMS documents gain the calendar defaults.
export function withCalendar(content) {
  return content.calendar
    ? content
    : { ...content, calendar: structuredClone(defaultCalendar) };
}

function text(value, label, max, required) {
  const out = {};
  for (const lang of ["id", "en"]) {
    const v = value?.[lang] ?? "";
    if (
      typeof v !== "string" ||
      v.length > max ||
      (required && lang === "id" && !v.trim())
    )
      throw new Error(`${label} pada kalender tidak valid.`);
    out[lang] = v.trim();
  }
  return out;
}
function plain(value, label, max, required) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(`${label} pada kalender tidak valid.`);
  return value.trim();
}
function list(value, label, limit) {
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`${label} berisi maksimal ${limit} item.`);
  return value;
}
function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const d = new Date(date + "T12:00:00Z");
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === date;
}

export function validateCalendar(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultCalendar);
  // Parts missing from older documents fall back to the defaults.
  input = { ...structuredClone(defaultCalendar), ...input };
  const events = list(input.events, "Kegiatan", calendarLimits.events)
    .map((e) => {
      if (!validDate(e?.date))
        throw new Error("Tanggal kegiatan pada kalender tidak valid.");
      if (!eventTypes.includes(e.type))
        throw new Error("Jenis kegiatan pada kalender tidak valid.");
      return {
        date: e.date,
        type: e.type,
        place: plain(e.place ?? "", "Tempat kegiatan", 80, false),
        title: text(e.title, "Nama kegiatan", 100, true),
        description: text(e.description, "Keterangan kegiatan", 400, false),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!Array.isArray(input.seasons) || input.seasons.length !== 12)
    throw new Error("Panduan musim harus berisi 12 bulan.");
  const seasons = input.seasons.map((s) => {
    if (!seasonRatings.includes(s?.rating))
      throw new Error("Penilaian musim pada kalender tidak valid.");
    return {
      rating: s.rating,
      note: text(s.note, "Catatan musim", 200, false),
    };
  });
  const spots = list(input.spots, "Spot populer", calendarLimits.spots).map(
    (s) => ({
      name: plain(s?.name, "Nama spot", 60, true),
      best: text(s.best, "Waktu terbaik", 60, false),
      note: text(s.note, "Keterangan spot", 240, false),
    }),
  );
  const eco = list(
    input.eco,
    "Rencana peduli lingkungan",
    calendarLimits.eco,
  ).map((e) => ({
    title: text(e?.title, "Nama rencana", 80, true),
    when: text(e.when, "Waktu rencana", 60, false),
    description: text(e.description, "Keterangan rencana", 300, false),
  }));
  return { events, seasons, spots, eco };
}

// A text in the visitor's language, falling back to Indonesian.
export const calendarText = (value, locale) =>
  (locale === "en" && value?.en) || value?.id || "";

export const monthKey = (date) => date.slice(0, 7);
export function eventsInMonth(events, year, month) {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return events.filter((e) => monthKey(e.date) === key);
}
// Monday-first grid for a month: leading blanks then each day of the month.
export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array((first + 6) % 7).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}
