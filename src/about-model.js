// The About page (/about): title, introduction, story and values, editable
// in the CMS in Indonesian and English. The default story is a starting
// draft for the owner to rewrite in the admin.
import { pickText, cleanText, cleanMediaURL } from "./bilingual.js";

const t = (id, en) => ({ id, en });
export const valueLimit = 6;

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

export function withAbout(content) {
  return content.about
    ? content
    : { ...content, about: structuredClone(defaultAbout) };
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
