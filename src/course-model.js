// Dive courses offered by Zanclus: shown on the homepage and on /course.
// Editable in the CMS; texts carry Indonesian and English. Prices are the
// owner's to confirm and change in the admin.
import { cleanWhatsApp, cleanEmail } from "./contact-fields.js";
import { dictionary } from "./i18n.js";

const t = (id, en) => ({ id, en });
export const courseLimit = 8;

export const defaultCourses = {
  items: [
    {
      id: "discovery",
      enabled: true,
      name: t("Discovery Dive", "Discovery Dive"),
      level: t("Coba menyelam", "Try diving"),
      duration: t("Setengah hari", "Half day"),
      depth: t("Hingga 12 m", "Down to 12 m"),
      age: t("Usia 10+", "Age 10+"),
      price: 1200000,
      unit: t("/ orang", "/ person"),
      summary: t(
        "Pengalaman pertama di bawah air tanpa lisensi. Pemandu mendampingi dari awal sampai naik lagi ke perahu.",
        "Your first time underwater, no license needed. A guide stays with you from the first breath to back on the boat.",
      ),
      includes: [
        t(
          "Pengenalan alat dan latihan di air dangkal",
          "Gear briefing and practice in shallow water",
        ),
        t("2 penyelaman bersama pemandu", "2 dives with a guide"),
        t("Perlengkapan selam lengkap", "Full dive equipment"),
        t(
          "Dokumentasi gratis untuk lebih dari 4 peserta",
          "Free photos for groups over 4",
        ),
      ],
      requirements: t(
        "Sehat dan nyaman di air. Tidak perlu pengalaman.",
        "Healthy and comfortable in the water. No experience needed.",
      ),
      image: "/assets/photos/gallery-dive.webp",
    },
    {
      id: "open-water",
      enabled: true,
      name: t("Open Water Diver", "Open Water Diver"),
      level: t("Lisensi pertama", "First license"),
      duration: t("3 sampai 4 hari", "3 to 4 days"),
      depth: t("Hingga 18 m", "Down to 18 m"),
      age: t("Usia 10+", "Age 10+"),
      price: 7500000,
      unit: t("/ orang", "/ person"),
      summary: t(
        "Lisensi menyelam yang diakui internasional. Belajar teori, latihan di air tenang, lalu 4 penyelaman di laut Raja Ampat.",
        "An internationally recognized diving license. Learn the theory, practise in calm water, then make 4 open water dives in Raja Ampat.",
      ),
      includes: [
        t("Materi teori dan kuis", "Theory lessons and quizzes"),
        t(
          "Latihan keterampilan di air tenang",
          "Skills practice in calm water",
        ),
        t("4 penyelaman di laut", "4 open water dives"),
        t("Alat selam dan biaya lisensi", "Dive gear and license fee"),
      ],
      requirements: t(
        "Bisa berenang 200 m dan mengapung 10 menit. Mengisi formulir kesehatan.",
        "Able to swim 200 m and float for 10 minutes. Fill in a medical form.",
      ),
      image: "/assets/photos/fan-turtle.webp",
    },
    {
      id: "advanced",
      enabled: true,
      name: t("Advanced Open Water", "Advanced Open Water"),
      level: t("Lanjutan", "Advanced"),
      duration: t("2 sampai 3 hari", "2 to 3 days"),
      depth: t("Hingga 30 m", "Down to 30 m"),
      age: t("Usia 12+", "Age 12+"),
      price: 6500000,
      unit: t("/ orang", "/ person"),
      summary: t(
        "Tambah pengalaman dengan 5 penyelaman petualangan, termasuk penyelaman dalam dan navigasi bawah air.",
        "Build experience with 5 adventure dives, including a deep dive and underwater navigation.",
      ),
      includes: [
        t("5 penyelaman petualangan", "5 adventure dives"),
        t("Penyelaman dalam dan navigasi", "Deep and navigation dives"),
        t("Pilihan arus, foto, atau ikan", "Choice of drift, photo or fish ID"),
        t("Alat selam dan biaya lisensi", "Dive gear and license fee"),
      ],
      requirements: t(
        "Sudah punya lisensi Open Water.",
        "Open Water license required.",
      ),
      image: "/assets/photos/diving-cover.webp",
    },
    {
      id: "rescue",
      enabled: true,
      name: t("Rescue Diver", "Rescue Diver"),
      level: t("Keselamatan", "Safety"),
      duration: t("3 hari", "3 days"),
      depth: t("Hingga 30 m", "Down to 30 m"),
      age: t("Usia 12+", "Age 12+"),
      price: 7000000,
      unit: t("/ orang", "/ person"),
      summary: t(
        "Belajar mencegah dan menangani masalah di air, untuk diri sendiri dan teman menyelam.",
        "Learn to prevent and handle problems in the water, for yourself and your buddy.",
      ),
      includes: [
        t("Skenario penyelamatan di laut", "Rescue scenarios at sea"),
        t("Pertolongan pertama untuk penyelam", "First aid for divers"),
        t("Latihan bersama instruktur", "Training with an instructor"),
        t("Biaya lisensi", "License fee"),
      ],
      requirements: t(
        "Lisensi Advanced Open Water dan sertifikat pertolongan pertama yang masih berlaku.",
        "Advanced Open Water license and a valid first aid certificate.",
      ),
      image: "/assets/photos/snorkeling-cover.webp",
    },
  ],
  // Certification partners shown in the running strip. Without an uploaded
  // logo the short name is shown as a text badge; a logo keeps its own
  // colours or is shown white (logoStyle).
  partners: [
    {
      name: "SSI",
      full: t("Scuba Schools International", "Scuba Schools International"),
      logo: "",
      logoStyle: "color",
      logoRatio: 0,
    },
    {
      name: "CMAS",
      full: t(
        "Confédération Mondiale des Activités Subaquatiques",
        "Confédération Mondiale des Activités Subaquatiques",
      ),
      logo: "",
      logoStyle: "color",
      logoRatio: 0,
    },
    {
      name: "PADI",
      full: t(
        "Professional Association of Diving Instructors",
        "Professional Association of Diving Instructors",
      ),
      logo: "",
      logoStyle: "color",
      logoRatio: 0,
    },
  ],
};
export const partnerLimit = 12;

// Logos of every shape look the same size in the running strip: a wide
// word mark gets less height than a round emblem (height follows the
// width-to-height ratio to the power -0.4), inside a 150 x 52 px box.
export function logoBox(ratio) {
  const r =
    Number.isFinite(ratio) && ratio > 0
      ? Math.min(8, Math.max(0.25, ratio))
      : 1;
  let height = Math.min(52, 46 * r ** -0.4);
  let width = height * r;
  if (width > 150) {
    width = 150;
    height = width / r;
  }
  return { width: Math.round(width), height: Math.round(height) };
}
const logoRatio = (value) => {
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio >= 0.1 && ratio <= 10
    ? Math.round(ratio * 1000) / 1000
    : 0;
};

export function withCourses(content) {
  return content.courses
    ? content
    : { ...content, courses: structuredClone(defaultCourses) };
}

// Text in the page language, falling back to Indonesian.
export const courseText = (value, locale) =>
  (locale === "en" && value?.en?.trim()) || value?.id || "";

function text(value, label, max, required) {
  const out = {};
  for (const lang of ["id", "en"]) {
    const v = value?.[lang] ?? "";
    if (
      typeof v !== "string" ||
      v.length > max ||
      (required && lang === "id" && !v.trim())
    )
      throw new Error(`${label} pada kursus tidak valid.`);
    out[lang] = v.trim();
  }
  return out;
}

function mediaURL(value, label) {
  const url = String(value ?? "").trim();
  if (
    url.length > 1200 ||
    (url &&
      !url.startsWith("/assets/") &&
      !url.startsWith("/api/media/") &&
      !url.startsWith("https://"))
  )
    throw new Error(`${label} harus URL HTTPS atau foto yang diunggah.`);
  return url;
}

export function validatePartners(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultCourses.partners);
  if (!Array.isArray(input) || input.length > partnerLimit)
    throw new Error(`Partner berisi maksimal ${partnerLimit} item.`);
  return input.map((p) => {
    const name = String(p?.name ?? "").trim();
    if (!name || name.length > 30)
      throw new Error("Nama partner wajib diisi, maksimal 30 karakter.");
    return {
      name,
      full: text(p.full, "Nama lengkap partner", 120, false),
      logo: mediaURL(p.logo, "Logo partner"),
      // "color" shows the logo as it is; "white" as a white silhouette.
      logoStyle: p.logoStyle === "white" ? "white" : "color",
      // Width over height of the trimmed logo, measured when it was
      // uploaded; 0 when unknown (older uploads are measured in the page).
      logoRatio: p.logo ? logoRatio(p.logoRatio) : 0,
    };
  });
}

export function validateCourses(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultCourses);
  // Documents saved before a part existed get its defaults.
  const items = input.items ?? structuredClone(defaultCourses.items);
  if (!Array.isArray(items) || items.length > courseLimit)
    throw new Error(`Kursus berisi maksimal ${courseLimit} item.`);
  const ids = new Set();
  return {
    items: items.map((c) => {
      const id = String(c?.id ?? "").trim();
      if (!/^[a-z0-9-]{2,40}$/.test(id) || ids.has(id))
        throw new Error("Kode kursus harus unik, huruf kecil, angka, atau -.");
      ids.add(id);
      const price = Number(c.price);
      if (!Number.isSafeInteger(price) || price <= 0 || price > 1e9)
        throw new Error("Harga kursus harus angka rupiah.");
      if (!Array.isArray(c.includes) || c.includes.length > 8)
        throw new Error("Isi kursus maksimal 8 poin.");
      const image = mediaURL(c.image, "Foto kursus");
      return {
        id,
        enabled: c.enabled !== false,
        name: text(c.name, "Nama", 80, true),
        level: text(c.level, "Level", 40, false),
        duration: text(c.duration, "Durasi", 60, true),
        depth: text(c.depth, "Kedalaman", 40, false),
        age: text(c.age, "Usia", 40, false),
        price,
        unit: text(c.unit, "Satuan", 20, false),
        summary: text(c.summary, "Ringkasan", 400, true),
        includes: c.includes
          .map((item) => text(item, "Isi kursus", 120, false))
          .filter((item) => item.id),
        requirements: text(c.requirements, "Syarat", 300, false),
        image,
      };
    }),
    partners: validatePartners(input.partners),
  };
}

// WhatsApp message for a course request.
// Answers a course sign-up asks for besides name and contact. Option keys
// are stored; their words come from the dictionary.
export const courseChoices = {
  dives: ["0", "1-20", "21-50", "50+"],
  swim: ["comfortable", "basic", "no"],
  health: ["fit", "condition"],
  wetsuit: ["", "XS", "S", "M", "L", "XL", "XXL"],
  language: ["id", "en"],
};
function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const day = new Date(date + "T12:00:00Z");
  return (
    !Number.isNaN(day.valueOf()) && day.toISOString().slice(0, 10) === date
  );
}
// Whole years from a birth date to a day, both YYYY-MM-DD.
export function ageOn(birth, day) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
// The minimum age written on the course ("Usia 10+"), or 8.
export const courseMinAge = (course) =>
  Number(/(\d+)\s*\+/.exec(course?.age?.id ?? "")?.[1]) || 8;

// The course questions, checked, as [label, value] lines in the page
// language. details.date is the start date. Throws with the reason.
export function courseProfile(course, details, locale = "id") {
  const t = dictionary(locale).course;
  const pick = (key) =>
    courseChoices[key].includes(details[key]) ? details[key] : null;
  const birth = details.birthDate;
  if (!validDate(birth) || birth < "1900-01-01" || birth >= details.date)
    throw new Error(t.errBirth);
  const min = courseMinAge(course);
  if (ageOn(birth, details.date) < min) throw new Error(t.errAge(min));
  const text = (value, max) => {
    const out = typeof value === "string" ? value.trim() : "";
    if (out.length > max) throw new Error(t.errLong);
    return out;
  };
  const nationality = text(details.nationality, 60);
  const dives = pick("dives") ?? "0";
  const swim = pick("swim");
  if (!swim) throw new Error(t.errSwim);
  const health = pick("health");
  if (!health) throw new Error(t.errHealth);
  if (health === "condition" && !text(details.notes, 1000))
    throw new Error(t.errHealthNotes);
  const wetsuit = pick("wetsuit") ?? "";
  const fins =
    details.fins === "" || details.fins === undefined || details.fins === null
      ? ""
      : Number(details.fins);
  if (fins !== "" && (!Number.isInteger(fins) || fins < 30 || fins > 50))
    throw new Error(t.errFins);
  const stay = text(details.stay, 120);
  const language = pick("language") ?? "id";
  const m = t.message;
  return [
    [m.birth, birth],
    ...(nationality ? [[m.nationality, nationality]] : []),
    [m.dives, t.diveOptions[dives]],
    [m.swim, t.swimOptions[swim]],
    [m.health, t.healthOptions[health]],
    ...(wetsuit ? [[m.wetsuit, wetsuit]] : []),
    ...(fins ? [[m.fins, String(fins)]] : []),
    ...(stay ? [[m.stay, stay]] : []),
    [m.language, t.languageOptions[language]],
  ];
}

export function courseInquiry(course, details, today, locale = "id") {
  const t = dictionary(locale).course;
  if (!course?.enabled) throw new Error(t.errCourse);
  const name = typeof details.name === "string" ? details.name.trim() : "";
  if (!name || name.length > 120) throw new Error(t.errName);
  const whatsapp = cleanWhatsApp(details.whatsapp);
  if (!whatsapp) throw new Error(t.errWhatsapp);
  const email = cleanEmail(details.email);
  if (email === null) throw new Error(t.errEmail);
  if (!email) throw new Error(t.errEmailRequired);
  const date = details.date;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    Number.isNaN(new Date(date + "T12:00:00Z").valueOf()) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    date < today
  )
    throw new Error(t.errDate);
  const participants = Number(details.participants);
  if (!Number.isInteger(participants) || participants < 1 || participants > 20)
    throw new Error(t.errParticipants);
  const notes = typeof details.notes === "string" ? details.notes.trim() : "";
  if (notes.length > 1000) throw new Error(t.errNotes);
  const profile = courseProfile(course, details, locale);
  return [
    t.message.greeting(courseText(course.name, locale)),
    `${t.message.name}: ${name}`,
    `WhatsApp: ${whatsapp}`,
    `Email: ${email}`,
    `${t.message.date}: ${date}`,
    t.message.people(participants),
    ...(details.certification
      ? [`${t.message.license}: ${String(details.certification).slice(0, 80)}`]
      : []),
    ...profile.map(([label, value]) => `${label}: ${value}`),
    ...(notes ? [`${t.message.notes}: ${notes}`] : []),
    t.message.closing,
  ].join("\n");
}
