import { experiences } from "./domain.js";
import { validateSeo, defaultSeo } from "./seo.js";
import {
  defaultGallery,
  galleryLimit,
  videoLimit,
  videoSource,
} from "./gallery.js";
import { defaultCalendar, validateCalendar } from "./calendar-model.js";
import { defaultCourses, validateCourses } from "./course-model.js";
import { defaultAbout, validateAbout } from "./about-model.js";
import { defaultService, validateService } from "./service-model.js";
import { defaultDeveloper, validateDeveloper } from "./developer.js";
import { defaultPayments, validatePayments } from "./payment-model.js";
import { defaultFares, validateFares } from "./fare-model.js";
import { emptyShop, shopCategories, availabilityLabels } from "./shop-model.js";
import {
  blankSocials,
  socialPlatforms,
  defaultMapQuery,
} from "./contact-model.js";
import { defaultActivities, activityKeys } from "./activity-model.js";
import {
  defaultPriceList,
  validatePriceList,
  withPriceList,
} from "./price-list.js";
import {
  englishDefaults,
  validateTranslations,
  withTranslations,
} from "./content-i18n.js";
import {
  defaultSiteImages,
  siteImageFields,
  photographyVersion,
} from "./photography.js";
export const experienceKeys = ["beginner", "explorer", "specialty"];
// Reservations are for a diving program or, when booked and paid from an
// activity page, for the activity itself. Paid Dive Shop orders, courses
// and gear servicing are kept as reservations on their date too.
export const activityPrograms = {
  diving: "Diving",
  snorkeling: "Snorkeling",
  trip: "Trip laut",
};
export const orderPrograms = {
  course: "Kursus selam",
  shop: "Dive Shop",
  service: "Servis alat",
};
export const bookingPrograms = [
  ...experienceKeys,
  ...Object.keys(activityPrograms),
  ...Object.keys(orderPrograms),
];
export const programTitle = (content, key) =>
  content.experiences?.[key]?.title ??
  activityPrograms[key] ??
  orderPrograms[key] ??
  key;
export const defaultContent = {
  photographyVersion,
  en: structuredClone(englishDefaults),
  activities: structuredClone(defaultActivities),
  shop: structuredClone(emptyShop),
  text: {
    heroEyebrow: "CERITAMU BERIKUTNYA DIMULAI",
    heroTitle1: "Di bawah laut Raja Ampat,",
    heroTitle2: "cerita dimulai.",
    tagline: "Jelajahi laut. Temukan cerita.",
    heroDescription: "Pengalaman menyelam untuk setiap rasa ingin tahu.",
    heroButton: "Mulai petualanganmu",
    experiencesHeading: "Ada cerita untuk setiap level.",
    quizTitle: "Siap belajar menyelam?",
    quizDescription:
      "Dari Discovery Dive sampai Rescue Diver, mulai kursus selammu bersama instruktur Zanclus.",
    oceanTitle1: "Laut punya cara",
    oceanTitle2: "untuk membuatmu takjub.",
    oceanDescription:
      "Dari warna terumbu hingga tenangnya laut terbuka. Pelan-pelan, temukan hal yang belum pernah kamu lihat.",
  },
  contact: {
    ...blankSocials,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285190969308",
    email: "halo@zanclusdive.com",
    location: "",
    mapQuery: defaultMapQuery,
    instagram: "",
  },
  images: { ...defaultSiteImages },
  seo: { ...defaultSeo },
  priceList: structuredClone(defaultPriceList),
  gallery: structuredClone(defaultGallery),
  calendar: structuredClone(defaultCalendar),
  courses: structuredClone(defaultCourses),
  about: structuredClone(defaultAbout),
  service: structuredClone(defaultService),
  developer: structuredClone(defaultDeveloper),
  payments: { ...defaultPayments },
  fares: structuredClone(defaultFares),
  experiences: Object.fromEntries(
    experienceKeys.map((key) => [
      key,
      {
        ...experiences[key],
        enabled: true,
        price: null,
        duration: "",
        cardDescription: {
          beginner:
            "Kenali peralatan, persiapan, dan dunia di bawah permukaan.",
          explorer: "Temukan perspektif baru di antara kehidupan laut.",
          specialty: "Cerita kecil yang membuat setiap dive berbeda.",
        }[key],
      },
    ]),
  ),
};
export const textFields = [
  ["heroEyebrow", "Label di atas hero"],
  ["heroTitle1", "Judul hero — baris 1"],
  ["heroTitle2", "Judul hero — baris 2"],
  ["tagline", "Tagline"],
  ["heroDescription", "Deskripsi hero"],
  ["heroButton", "Teks tombol hero"],
  ["experiencesHeading", "Judul bagian pengalaman"],
  ["quizTitle", "Judul ajakan kursus"],
  ["quizDescription", "Deskripsi ajakan kursus"],
  ["oceanTitle1", "Judul laut — baris 1"],
  ["oceanTitle2", "Judul laut — baris 2"],
  ["oceanDescription", "Deskripsi bagian laut"],
];
export const statuses = {
  pending: "Belum dikonfirmasi",
  confirmed: "Dikonfirmasi",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
};
export const sources = {
  website: "Website",
  whatsapp: "WhatsApp",
  agent: "Agen / partner",
  walkin: "Walk-in",
};
function plain(value, label, max = 2000, required = true) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(`${label} tidak valid.`);
  return value.trim();
}
export function imageURL(value) {
  const s = plain(value, "URL gambar", 1200);
  if (s.startsWith("/assets/") || /^\/api\/media\/[a-f0-9-]{36}$/.test(s))
    return s;
  try {
    const url = new URL(s);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {}
  throw new Error("Gambar harus memakai URL HTTPS atau aset website.");
}
function galleryCaptionText(value) {
  const out = {};
  for (const lang of ["id", "en"]) {
    const v = value?.[lang] ?? "";
    if (typeof v !== "string" || v.length > 120)
      throw new Error("Keterangan foto galeri tidak valid.");
    out[lang] = v.trim();
  }
  return out;
}

// Documents saved before the gallery existed get the default photos.
export function validateGallery(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultGallery);
  const items = input.items;
  if (!Array.isArray(items) || items.length > galleryLimit)
    throw new Error(`Galeri berisi maksimal ${galleryLimit} foto.`);
  return {
    items: items.map((item) => ({
      src: imageURL(item?.src),
      caption: galleryCaptionText(item?.caption),
    })),
    videos: validateVideos(input.videos),
  };
}
// Video links (YouTube, TikTok, Instagram, Facebook) for the video row;
// documents without videos get none.
export function validateVideos(input) {
  const videos = input ?? [];
  if (!Array.isArray(videos) || videos.length > videoLimit)
    throw new Error(`Video maksimal ${videoLimit}.`);
  return videos.map((video, index) => {
    const url = typeof video?.url === "string" ? video.url.trim() : "";
    const source = url.length <= 300 ? videoSource(url) : null;
    if (!source)
      throw new Error(
        `Link video ${index + 1} belum dikenali. Tempel link video dari YouTube, TikTok, Instagram, atau Facebook.`,
      );
    if (source.short)
      throw new Error(
        `Link video ${index + 1} masih link pendek. Buka link itu di browser, lalu salin alamat lengkap dari kolom alamat.`,
      );
    return { url, caption: galleryCaptionText(video?.caption) };
  });
}

export function validateContent(input) {
  if (!input || typeof input !== "object")
    throw new Error("Konten tidak valid.");
  const text = Object.fromEntries(
    textFields.map(([key, label]) => [
      key,
      plain(input.text?.[key], label, 2000),
    ]),
  );
  const c = input.contact || {};
  const whatsapp = plain(c.whatsapp, "Nomor WhatsApp", 20);
  if (!/^[1-9]\d{7,14}$/.test(whatsapp))
    throw new Error("WhatsApp harus memakai kode negara dan angka saja.");
  const email = plain(c.email, "Email", 200, false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Email kontak tidak valid.");
  const socials = Object.fromEntries(
    Object.entries(socialPlatforms).map(([key, platform]) => {
      const value = plain(c[key] ?? "", platform.label, 500, false);
      if (value) {
        let url;
        try {
          url = new URL(value);
        } catch {
          throw new Error(
            `Masukkan tautan ${platform.label} HTTPS yang valid.`,
          );
        }
        if (
          url.protocol !== "https:" ||
          !platform.hosts.includes(url.hostname) ||
          url.username ||
          url.password ||
          url.port
        )
          throw new Error(
            `Masukkan tautan ${platform.label} HTTPS yang valid.`,
          );
      }
      return [key, value];
    }),
  );
  const contact = {
    whatsapp,
    email,
    ...socials,
    location: plain(c.location, "Lokasi", 500, false),
    mapQuery: plain(c.mapQuery ?? "", "Pencarian peta", 200, false),
  };
  const images = Object.fromEntries(
    siteImageFields.map(([k]) => [
      k,
      imageURL(input.images?.[k] ?? defaultSiteImages[k]),
    ]),
  );
  const catalog = Object.fromEntries(
    experienceKeys.map((k) => {
      const e = input.experiences?.[k];
      if (!e || typeof e.enabled !== "boolean")
        throw new Error("Pengalaman tidak valid.");
      const price = e.price === "" || e.price === null ? null : Number(e.price);
      if (
        price !== null &&
        (!Number.isSafeInteger(price) || price < 0 || price > 1e9)
      )
        throw new Error("Harga tidak valid.");
      if (!Array.isArray(e.items) || e.items.length < 1 || e.items.length > 10)
        throw new Error("Isi 1–10 poin pengalaman.");
      return [
        k,
        {
          title: plain(e.title, "Nama pengalaman", 120),
          description: plain(e.description, "Deskripsi pengalaman"),
          cardDescription: plain(e.cardDescription, "Deskripsi kartu", 500),
          duration: plain(e.duration, "Durasi", 100, false),
          items: e.items.map((x) => plain(x, "Poin pengalaman", 300)),
          price,
          enabled: e.enabled,
        },
      ];
    }),
  );
  if (!Object.values(catalog).some((e) => e.enabled))
    throw new Error("Minimal satu pengalaman harus aktif.");
  const shop = validateShop(input.shop);
  return {
    photographyVersion,
    text,
    contact,
    images,
    priceList: validatePriceList(withPriceList(input).priceList),
    experiences: catalog,
    shop,
    activities: validateActivities(input.activities),
    gallery: validateGallery(input.gallery),
    calendar: validateCalendar(input.calendar),
    courses: validateCourses(input.courses),
    about: validateAbout(input.about),
    service: validateService(input.service),
    developer: validateDeveloper(input.developer),
    payments: validatePayments(input.payments),
    fares: validateFares(input.fares),
    seo: validateSeo(input.seo),
    en: validateTranslations(withTranslations(input).en, shop.products),
  };
}
export function validateActivities(input) {
  return Object.fromEntries(
    activityKeys.map((key) => {
      const a = input?.[key];
      if (!a || typeof a.enabled !== "boolean")
        throw new Error("Halaman aktivitas tidak valid. Muat ulang CMS.");
      const price = a.price === null || a.price === "" ? null : Number(a.price);
      if (
        (typeof a.price !== "number" &&
          typeof a.price !== "string" &&
          a.price !== null) ||
        (price !== null &&
          (!Number.isSafeInteger(price) || price <= 0 || price > 1e9))
      )
        throw new Error(
          "Harga aktivitas harus berupa rupiah positif. Kosongkan untuk penawaran.",
        );
      function points(value, label) {
        if (!Array.isArray(value) || value.length > 30)
          throw new Error(`${label} harus berisi 1–8 poin.`);
        const items = value
          .map((item) => plain(item, label, 300, false))
          .filter(Boolean);
        if (items.length < 1 || items.length > 8)
          throw new Error(`${label} harus berisi 1–8 poin.`);
        return items;
      }
      if (
        !Array.isArray(a.itinerary) ||
        a.itinerary.length < 1 ||
        a.itinerary.length > 8
      )
        throw new Error("Isi 1–8 langkah alur kegiatan.");
      if (!Array.isArray(a.faqs) || a.faqs.length < 1 || a.faqs.length > 6)
        throw new Error("Isi 1–6 pertanyaan umum.");
      const capacity = Number(
        a.capacity ?? defaultActivities[key].capacity ?? 0,
      );
      if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500)
        throw new Error(
          "Kuota peserta per hari harus 0–500 (0 = tanpa batas).",
        );
      return [
        key,
        {
          enabled: a.enabled,
          title: plain(a.title, "Judul aktivitas", 150),
          summary: plain(a.summary, "Ringkasan aktivitas", 500),
          description: plain(a.description, "Deskripsi aktivitas", 2000),
          image: imageURL(a.image),
          imageAlt: plain(a.imageAlt, "Deskripsi foto", 250),
          cardImage: imageURL(a.cardImage ?? a.image),
          cardImageAlt: plain(
            a.cardImageAlt ?? a.imageAlt,
            "Deskripsi foto kartu",
            250,
          ),
          duration: plain(a.duration, "Durasi aktivitas", 150),
          audience: plain(a.audience, "Peserta aktivitas", 150),
          meetingPoint: plain(a.meetingPoint, "Titik temu", 250),
          price,
          capacity,
          highlights: points(a.highlights, "Sorotan aktivitas"),
          preparations: points(a.preparations, "Persiapan aktivitas"),
          itinerary: a.itinerary.map((item) => ({
            title: plain(item?.title, "Judul langkah", 120),
            description: plain(item?.description, "Deskripsi langkah", 500),
          })),
          faqs: a.faqs.map((item) => ({
            question: plain(item?.question, "Pertanyaan", 250),
            answer: plain(item?.answer, "Jawaban", 1000),
          })),
        },
      ];
    }),
  );
}
export function validateShop(shop) {
  if (!shop || !Array.isArray(shop.products) || shop.products.length > 20)
    throw new Error(
      "Katalog harus berisi maksimal 20 produk. Muat ulang CMS jika katalog belum tersedia.",
    );
  const ids = new Set();
  return {
    heading: plain(shop.heading, "Judul Dive Shop", 150),
    description: plain(shop.description, "Deskripsi Dive Shop", 600),
    products: shop.products.map((p) => {
      if (
        !p ||
        typeof p.id !== "string" ||
        !/^[a-z0-9-]{1,50}$/.test(p.id) ||
        ids.has(p.id) ||
        !Object.hasOwn(shopCategories, p.category) ||
        !Object.hasOwn(availabilityLabels, p.availability) ||
        [p.enabled, p.saleEnabled, p.rentalEnabled].some(
          (v) => typeof v !== "boolean",
        ) ||
        (!p.saleEnabled && !p.rentalEnabled)
      )
        throw new Error(
          "Produk, kategori, atau pilihan jual/rental tidak valid.",
        );
      ids.add(p.id);
      function price(value) {
        if (value === null || value === "") return null;
        if (typeof value !== "number" && typeof value !== "string")
          throw new Error("Harga produk tidak valid.");
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n <= 0 || n > 1e9)
          throw new Error(
            "Harga produk harus berupa rupiah positif, maksimal 1 miliar. Kosongkan untuk penawaran.",
          );
        return n;
      }
      return {
        id: p.id,
        category: p.category,
        availability: p.availability,
        enabled: p.enabled,
        saleEnabled: p.saleEnabled,
        rentalEnabled: p.rentalEnabled,
        name: plain(p.name, "Nama produk", 100),
        description: plain(p.description, "Deskripsi produk", 500),
        specification: plain(
          p.specification || "",
          "Spesifikasi produk",
          300,
          false,
        ),
        image: p.image ? imageURL(p.image) : "",
        salePrice: price(p.salePrice),
        rentalPrice: price(p.rentalPrice),
      };
    }),
  };
}
function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
export function validateBooking(input) {
  if (
    !input ||
    !bookingPrograms.includes(input.experience) ||
    !Object.hasOwn(statuses, input.status) ||
    !Object.hasOwn(sources, input.source)
  )
    throw new Error("Pengalaman, status, atau sumber tidak valid.");
  if (
    !validDate(input.startDate) ||
    !validDate(input.endDate) ||
    input.endDate < input.startDate ||
    (new Date(input.endDate) - new Date(input.startDate)) / 86400000 > 366
  )
    throw new Error("Rentang tanggal harus valid, maksimal 366 hari.");
  const participants = Number(input.participants),
    amount = Number(input.amount);
  if (
    !Number.isInteger(participants) ||
    participants < 1 ||
    participants > 100 ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > 1e9
  )
    throw new Error("Peserta atau nilai reservasi tidak valid.");
  const phone = plain(input.phone || "", "Telepon", 30, false);
  if (phone && !/^\+?[\d\s()-]{6,30}$/.test(phone))
    throw new Error("Telepon tidak valid.");
  const email = plain(input.email || "", "Email", 200, false).trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Email tamu tidak valid.");
  return {
    experience: input.experience,
    status: input.status,
    source: input.source,
    startDate: input.startDate,
    endDate: input.endDate,
    guestName: plain(
      input.guestName || "",
      "Nama tamu",
      120,
      input.status !== "closed",
    ),
    phone,
    participants,
    amount,
    notes: plain(input.notes || "", "Catatan", 2000, false),
    ...(email ? { email } : {}),
    // The language of the emails to the guest.
    ...(input.lang === "en" || input.lang === "id" ? { lang: input.lang } : {}),
  };
}
