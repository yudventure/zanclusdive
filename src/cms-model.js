import { experiences } from "./domain.js";
export const experienceKeys = ["beginner", "explorer", "specialty"];
export const defaultContent = {
  text: {
    heroEyebrow: "YOUR NEXT STORY STARTS UNDERWATER",
    heroTitle1: "Di bawah laut,",
    heroTitle2: "cerita dimulai.",
    tagline: "Jelajahi laut. Temukan cerita.",
    heroDescription: "Pengalaman menyelam untuk setiap rasa ingin tahu.",
    heroButton: "Mulai petualanganmu",
    experiencesHeading: "Ada cerita untuk setiap level.",
    quizTitle: "Belum tahu mulai dari mana?",
    quizDescription: "Temukan pengalaman yang sesuai denganmu.",
    oceanTitle1: "Laut punya cara",
    oceanTitle2: "untuk membuatmu takjub.",
    oceanDescription:
      "Dari warna terumbu hingga tenangnya laut terbuka. Pelan-pelan, temukan hal yang belum pernah kamu lihat.",
    contactTitle1: "Petualangan berikutnya",
    contactTitle2: "dimulai dari satu langkah.",
    contactDescription:
      "Ceritakan pengalamanmu, pilih tanggal, dan susun rencana penyelaman.",
  },
  contact: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285190849237",
    email: "",
    location: "",
    instagram: "",
  },
  images: {
    hero: "/assets/hero.webp",
    reef: "/assets/reef.webp",
    ocean: "/assets/ocean.webp",
  },
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
  ["quizTitle", "Judul kuis"],
  ["quizDescription", "Deskripsi kuis"],
  ["oceanTitle1", "Judul laut — baris 1"],
  ["oceanTitle2", "Judul laut — baris 2"],
  ["oceanDescription", "Deskripsi bagian laut"],
  ["contactTitle1", "Judul kontak — baris 1"],
  ["contactTitle2", "Judul kontak — baris 2"],
  ["contactDescription", "Deskripsi kontak"],
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
  const instagram = plain(c.instagram, "Instagram", 500, false);
  if (instagram) {
    const u = new URL(instagram);
    if (
      u.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(u.hostname)
    )
      throw new Error("Masukkan tautan Instagram HTTPS.");
  }
  const contact = {
    whatsapp,
    email,
    instagram,
    location: plain(c.location, "Lokasi", 500, false),
  };
  const images = Object.fromEntries(
    ["hero", "reef", "ocean"].map((k) => [k, imageURL(input.images?.[k])]),
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
  return { text, contact, images, experiences: catalog };
}
function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
export function validateBooking(input) {
  if (
    !input ||
    !experienceKeys.includes(input.experience) ||
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
  };
}
