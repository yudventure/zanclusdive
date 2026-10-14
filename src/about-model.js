// The About page (/about): title, introduction, story and values, editable
// in the CMS in Indonesian and English. The default story is a starting
// draft for the owner to rewrite in the admin.
import { pickText, cleanText, cleanMediaURL } from "./bilingual.js";

const t = (id, en) => ({ id, en });
export const valueLimit = 6;
export const portfolioLimit = 6;

// The company behind the dive center, from its company profile: who runs
// it, its lines of work and the partners it has worked with.
export const defaultCompany = {
  title: t("PT Zanclus Daya Cipta", "PT Zanclus Daya Cipta"),
  text: t(
    [
      "Zanclus Dive Center dikelola oleh PT Zanclus Daya Cipta, perusahaan berbadan hukum yang berdiri sejak 2020 dan berkantor pusat di Jakarta Selatan. Perusahaan ini bergerak di bidang pelatihan selam, ekowisata, kajian kelautan, dan pengadaan barang, didukung tenaga ahli yang berkompeten dan profesional.",
      "Kami ingin menjadi perusahaan yang profesional dan berkomitmen memenuhi kebutuhan setiap tamu dan klien, dengan mengutamakan keselamatan serta bekerja bersama tenaga ahli di bidangnya.",
    ].join("\n\n"),
    [
      "Zanclus Dive Center is run by PT Zanclus Daya Cipta, a registered Indonesian company founded in 2020 with its head office in South Jakarta. The company works in dive training, ecotourism, marine research and procurement, backed by skilled and professional experts.",
      "We aim to be a professional company committed to every guest and client, putting safety first and working with experts in their field.",
    ].join("\n\n"),
  ),
  standing: t(
    "Kini Zanclus Dive Center termasuk dive center yang diperhitungkan di Raja Ampat, berkat pelayanan yang konsisten dan maksimal untuk setiap tamu.",
    "Today Zanclus Dive Center is one of the dive centers that counts in Raja Ampat, thanks to service that stays consistent and at its best for every guest.",
  ),
  portfolio: [
    {
      title: t("Pelatihan", "Training"),
      text: t(
        "Sertifikasi selam rekreasi, sertifikasi pertolongan pertama, dan pelatihan berbasis SKKNI.",
        "Recreational dive certification, first aid certification and training based on Indonesia's national competency standards (SKKNI).",
      ),
    },
    {
      title: t("Ekowisata", "Ecotourism"),
      text: t(
        "Wisata scuba diving, snorkeling, dan wisata edukasi di Raja Ampat dan perairan Indonesia lainnya.",
        "Scuba diving, snorkeling and educational trips in Raja Ampat and other Indonesian waters.",
      ),
    },
    {
      title: t("Kajian ilmiah", "Marine research"),
      text: t(
        "Kajian terumbu karang, mangrove, lamun, sampah laut, blue carbon, dan sosial ekonomi perikanan.",
        "Studies of coral reefs, mangroves, seagrass, marine litter, blue carbon and the social economy of fisheries.",
      ),
    },
    {
      title: t("Pengadaan barang", "Procurement"),
      text: t(
        "Pengadaan barang dan perlengkapan sesuai kebutuhan klien, termasuk perlengkapan selam.",
        "Goods and equipment supplied to each client's needs, including dive gear.",
      ),
    },
  ],
  partners: t(
    "Kami pernah bekerja sama dengan Yayasan Terumbu Karang Indonesia, Bappenas, Kementerian Kelautan dan Perikanan, Kementerian Lingkungan Hidup dan Kehutanan, Taman Nasional Kepulauan Seribu, Karimunjawa, dan Komodo, serta perusahaan swasta.",
    "We have worked with the Indonesian Coral Reef Foundation, Bappenas, the Ministry of Marine Affairs and Fisheries, the Ministry of Environment and Forestry, the Kepulauan Seribu, Karimunjawa and Komodo National Parks, and private companies.",
  ),
};

export const defaultAbout = {
  image: "/assets/photos/trip.webp",
  title: t(
    "Dive center di jantung Raja Ampat.",
    "A dive center in the heart of Raja Ampat.",
  ),
  intro: t(
    "Diving, snorkeling, trip pulau, kursus selam, dive shop, dan servis alat selam dari satu tim.",
    "Diving, snorkeling, island trips, dive courses, a dive shop and gear servicing from one team.",
  ),
  story: t(
    [
      "Zanclus Dive Center lahir dari kecintaan pada laut Raja Ampat. Kami mengajak tamu menyelam, snorkeling, dan menjelajah pulau bersama pemandu yang mengenal arus, musim, dan titik selam di Selat Dampier.",
      "Zanclus adalah nama ikan Moorish idol (Zanclus cornutus) yang mudah dijumpai di terumbu Raja Ampat. Seperti ikan itu, kami ingin selalu dekat dengan karang dan ikut menjaganya.",
      "Selain trip dan kursus, kami menyediakan perlengkapan, sewa alat, dan servis alat selam, supaya setiap penyelaman berjalan aman dan nyaman.",
    ].join("\n\n"),
    [
      "Zanclus Dive Center grew out of a love for the sea of Raja Ampat. We take guests diving, snorkeling and island hopping with guides who know the currents, the seasons and the dive sites of the Dampier Strait.",
      "Zanclus is the name of the Moorish idol (Zanclus cornutus), a fish you meet often on Raja Ampat's reefs. Like that fish, we want to stay close to the coral and help look after it.",
      "Besides trips and courses, we offer equipment, gear rental and dive gear servicing, so every dive is safe and comfortable.",
    ].join("\n\n"),
  ),
  company: structuredClone(defaultCompany),
  values: [
    {
      title: t("Keselamatan dulu", "Safety first"),
      text: t(
        "Briefing sebelum menyelam, alat dicek sebelum dipakai, dan kelompok kecil bersama pemandu.",
        "A briefing before every dive, gear checked before use, and small groups with a guide.",
      ),
    },
    {
      title: t("Mengenal laut Raja Ampat", "We know these waters"),
      text: t(
        "Titik selam dipilih sesuai arus, musim, dan pengalamanmu.",
        "Dive sites chosen for the current, the season and your experience.",
      ),
    },
    {
      title: t("Menjaga terumbu", "Caring for the reef"),
      text: t(
        "Tidak menyentuh karang, tidak memberi makan ikan, dan membawa pulang sampah.",
        "No touching coral, no feeding fish, and every piece of rubbish comes back with us.",
      ),
    },
  ],
};

// About pages saved before the company profile existed get the default one.
export function withAbout(content) {
  if (!content.about)
    return { ...content, about: structuredClone(defaultAbout) };
  if (content.about.company) return content;
  return {
    ...content,
    about: { ...content.about, company: structuredClone(defaultCompany) },
  };
}

export const aboutText = pickText;
// The story is written as paragraphs separated by an empty line.
export const paragraphs = (value, locale) =>
  pickText(value, locale)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function validateAbout(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultAbout);
  const values = input.values ?? structuredClone(defaultAbout.values);
  if (!Array.isArray(values) || values.length > valueLimit)
    throw new Error(`Nilai Tentang kami berisi maksimal ${valueLimit} poin.`);
  return {
    company: validateCompany(input.company),
    image: cleanMediaURL(input.image, "Foto Tentang kami"),
    title: cleanText(input.title, "Judul Tentang kami", 120, true),
    intro: cleanText(input.intro, "Pengantar Tentang kami", 300),
    story: cleanText(input.story, "Cerita Tentang kami", 4000, true),
    values: values
      .map((v) => ({
        title: cleanText(v?.title, "Judul nilai", 60),
        text: cleanText(v?.text, "Keterangan nilai", 240),
      }))
      .filter((v) => v.title.id),
  };
}

function validateCompany(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultCompany);
  const portfolio = input.portfolio ?? [];
  if (!Array.isArray(portfolio) || portfolio.length > portfolioLimit)
    throw new Error(`Portofolio berisi maksimal ${portfolioLimit} bidang.`);
  return {
    title: cleanText(input.title, "Judul profil perusahaan", 120),
    text: cleanText(input.text, "Profil perusahaan", 3000),
    standing: cleanText(input.standing, "Kalimat sorotan", 300),
    portfolio: portfolio
      .map((p) => ({
        title: cleanText(p?.title, "Nama bidang portofolio", 60),
        text: cleanText(p?.text, "Keterangan portofolio", 300),
      }))
      .filter((p) => p.title.id),
    partners: cleanText(input.partners, "Mitra kerja", 600),
  };
}
